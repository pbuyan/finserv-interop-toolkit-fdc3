import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });

const AppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  intents: z.array(z.string().min(1)).optional(),
  url: z.string().url().optional(),
  icons: z.array(z.string().url()).optional(),
  manifest: z.any().optional(),
});

type AppEntry = z.infer<typeof AppSchema> & {
  createdAt: string;
  updatedAt: string;
};

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

const DATA_PATH = path.resolve(
  process.env.APPD_DATA_PATH || path.join(process.cwd(), 'data/app-directory.json'),
);
const DATA_DIR = path.dirname(DATA_PATH);

const apps = new Map<string, AppEntry>();
loadFromDisk();

export function createAppDirectoryApp(): Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger: log }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.get(
    '/v1/apps',
    asyncHandler((_req, res) => {
      const list = Array.from(apps.values()).sort((a, b) => a.name.localeCompare(b.name));
      res.json(list);
    }),
  );

  app.post(
    '/v1/apps',
    asyncHandler((req, res) => {
      const parsed = AppSchema.parse(req.body);
      if (apps.has(parsed.id)) {
        throw new HttpError(409, `App with id ${parsed.id} already exists`);
      }
      const now = new Date().toISOString();
      const entry: AppEntry = { ...parsed, createdAt: now, updatedAt: now };
      apps.set(entry.id, entry);
      persist();
      res.status(201).json(entry);
    }),
  );

  app.get(
    '/v1/apps/:id',
    asyncHandler((req, res) => {
      const entry = apps.get(req.params.id);
      if (!entry) {
        throw new HttpError(404, 'not_found');
      }
      res.json(entry);
    }),
  );

  app.put(
    '/v1/apps/:id',
    asyncHandler((req, res) => {
      const parsed = AppSchema.parse({ ...req.body, id: req.params.id });
      const existing = apps.get(req.params.id);
      if (!existing) {
        throw new HttpError(404, 'not_found');
      }
      const entry: AppEntry = { ...existing, ...parsed, updatedAt: new Date().toISOString() };
      apps.set(req.params.id, entry);
      persist();
      res.json(entry);
    }),
  );

  app.delete(
    '/v1/apps/:id',
    asyncHandler((req, res) => {
      const existed = apps.delete(req.params.id);
      if (existed) {
        persist();
      }
      res.json({ deleted: existed });
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

const PORT = Number(process.env.APPD_PORT || 4001);

if (process.env.NODE_ENV !== 'test') {
  const app = createAppDirectoryApp();
  app.listen(PORT, () => log.info(`AppD listening on :${PORT}`));
}

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return;
    }
    const content = fs.readFileSync(DATA_PATH, 'utf8');
    const parsed = JSON.parse(content) as AppEntry[];
    parsed.forEach((entry) => apps.set(entry.id, entry));
    log.info({ count: apps.size }, 'app_directory_loaded');
  } catch (error) {
    log.error({ err: error }, 'failed_loading_app_directory');
  }
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = JSON.stringify(Array.from(apps.values()), null, 2);
    fs.writeFileSync(DATA_PATH, payload);
  } catch (error) {
    log.error({ err: error }, 'failed_persisting_app_directory');
  }
}