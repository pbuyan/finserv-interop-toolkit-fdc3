
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger: log }));

const PORT = Number(process.env.BRIDGE_PORT || 4000);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/agent/info', (_req, res) => {
  res.json({
    name: 'FinServ Bridge',
    version: '0.1.0',
    fdc3: '2.0-compatible (skeleton)',
  });
});

app.post('/v1/context/broadcast', (req, res) => {
  const { context, channelId } = req.body || {};
  req.log.info({ contextType: context?.type, channelId }, 'broadcast');
  res.json({ status: 'ok' });
});

app.post('/v1/intents/raise', (req, res) => {
  const { intent, context } = req.body || {};
  req.log.info({ intent, contextType: context?.type }, 'raiseIntent');
  res.json({ status: 'ok', data: { handledBy: 'placeholder-app' } });
});

app.post('/v1/channels/join', (req, res) => {
  const { channelId } = req.body || {};
  req.log.info({ channelId }, 'joinUserChannel');
  res.json({ channelId });
});

app.listen(PORT, () => log.info(`Bridge listening on :${PORT}`));
