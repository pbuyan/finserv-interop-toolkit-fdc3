
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger: log }));

const PORT = Number(process.env.APPD_PORT || 4001);

type AppEntry = {
  id: string;
  name: string;
  intents?: string[];
  url?: string;
  icons?: string[];
  manifest?: any;
};

const Apps = new Map<string, AppEntry>();

const AppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  intents: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  icons: z.array(z.string().url()).optional(),
  manifest: z.any().optional(),
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/v1/apps', (_req, res) => res.json(Array.from(Apps.values())));

app.post('/v1/apps', (req, res) => {
  const parsed = AppSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const appEntry = parsed.data;
  Apps.set(appEntry.id, appEntry);
  res.status(201).json(appEntry);
});

app.get('/v1/apps/:id', (req, res) => {
  const app = Apps.get(req.params.id);
  if (!app) return res.status(404).json({ error: 'not_found' });
  res.json(app);
});

app.put('/v1/apps/:id', (req, res) => {
  const parsed = AppSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  Apps.set(req.params.id, parsed.data);
  res.json(parsed.data);
});

app.delete('/v1/apps/:id', (req, res) => {
  const ok = Apps.delete(req.params.id);
  res.json({ deleted: ok });
});

app.listen(PORT, () => log.info(`AppD listening on :${PORT}`));
