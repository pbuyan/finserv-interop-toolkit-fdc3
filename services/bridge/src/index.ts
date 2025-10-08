import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const allowedOrigins = (process.env.BRIDGE_CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const contextSchema = z
  .object({
    type: z.string().min(1),
  })
  .catchall(z.unknown());

const broadcastSchema = z.object({
  context: contextSchema,
  channelId: z.string().min(1).optional(),
});

const raiseIntentSchema = z.object({
  intent: z.string().min(1),
  context: contextSchema.optional(),
});

const joinChannelSchema = z.object({
  channelId: z.string().min(1),
});

type BroadcastPayload = z.infer<typeof broadcastSchema>;
type RaiseIntentPayload = z.infer<typeof raiseIntentSchema>;
type JoinChannelPayload = z.infer<typeof joinChannelSchema>;

type IntentHandler = { appId: string; displayName: string };

const defaultIntentRegistry = new Map<string, IntentHandler>([
  ['ViewChart', { appId: 'chart-viewer', displayName: 'Chart Viewer' }],
]);

class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type AsyncRoute<T extends Request = Request> = (req: T, res: Response) => Promise<void> | void;

const asyncHandler = <T extends Request>(fn: AsyncRoute<T>) =>
  async (req: T, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };

export function createBridgeApp(options: { intentRegistry?: Map<string, IntentHandler> } = {}): Application {
  const app = express();
  const intentRegistry = options.intentRegistry ?? defaultIntentRegistry;
  const joinedChannels = new Set<string>();

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger: log,
      genReqId: (req) => req.headers['x-request-id']?.toString() ?? randomUUID(),
    }),
  );

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.get(
    '/agent/info',
    asyncHandler((req, res) => {
      res.json({
        name: 'FinServ Bridge',
        version: '0.1.0',
        fdc3: '2.0-compatible (skeleton)',
        requestId: req.id,
        intents: Array.from(intentRegistry.keys()),
      });
    }),
  );

  app.post(
    '/v1/context/broadcast',
    asyncHandler((req, res) => {
      const payload = broadcastSchema.parse(req.body) as BroadcastPayload;
      trackChannel(joinedChannels, payload);
      req.log.info({ contextType: payload.context.type, channelId: payload.channelId }, 'broadcast');
      res.json({ status: 'ok' });
    }),
  );

  app.post(
    '/v1/intents/raise',
    asyncHandler((req, res) => {
      const payload = raiseIntentSchema.parse(req.body) as RaiseIntentPayload;
      const handler = intentRegistry.get(payload.intent);
      req.log.info({ intent: payload.intent, contextType: payload.context?.type }, 'raiseIntent');
      if (!handler) {
        throw new HttpError(404, `No handler registered for intent ${payload.intent}`);
      }
      res.json({
        status: 'ok',
        data: {
          handledBy: handler.appId,
          displayName: handler.displayName,
          deliveredAt: new Date().toISOString(),
        },
      });
    }),
  );

  app.post(
    '/v1/channels/join',
    asyncHandler((req, res) => {
      const payload = joinChannelSchema.parse(req.body) as JoinChannelPayload;
      joinedChannels.add(payload.channelId);
      req.log.info({ channelId: payload.channelId }, 'joinUserChannel');
      res.json({ channelId: payload.channelId, joinedAt: new Date().toISOString() });
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      req.log.warn({ err }, 'http_error');
      return res.status(err.status).json({ error: err.message, details: err.details });
    }

    if (err instanceof z.ZodError) {
      req.log.warn({ validationError: err.flatten() }, 'validation_failed');
      return res.status(400).json({ error: 'validation_failed', details: err.flatten() });
    }

    req.log.error({ err }, 'unhandled_error');
    return res.status(500).json({ error: 'internal_error' });
  });

  return app;
}

const PORT = Number(process.env.BRIDGE_PORT || 4000);

if (process.env.NODE_ENV !== 'test') {
  const app = createBridgeApp();
  app.listen(PORT, () => log.info(`Bridge listening on :${PORT}`));
}

function trackChannel(joinedChannels: Set<string>, payload: BroadcastPayload) {
  if (payload.channelId) {
    joinedChannels.add(payload.channelId);
  }
}