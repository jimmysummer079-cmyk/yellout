import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb, getUploadDir } from './db/index.js';
import { globalRateLimit } from './middleware/rateLimit.js';
import { sessionRouter } from './routes/session.js';
import { repliesRouter, ventsRouter } from './routes/vents.js';
import { createE2ERouter } from './routes/e2e.js';
import { startExpiryScheduler } from './services/expiry.js';
import { moderationProvider } from './services/moderation.js';
import { bootDatabase } from './boot.js';
import { REPO_ROOT, resolveFromRoot } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(REPO_ROOT, '.env') });
dotenv.config();

const startedAt = Date.now();

export { bootDatabase } from './boot.js';

export function createApp() {
  getUploadDir();
  getDb();

  const app = express();
  // Required behind Render / reverse proxies for correct client IP + rate limits
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(globalRateLimit);

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      moderation: moderationProvider(),
    });
  });

  app.use('/api/v1/session', sessionRouter);
  app.use('/api/v1/vents', ventsRouter);
  app.use('/api/v1/replies', repliesRouter);

  const e2e = createE2ERouter();
  if (e2e) {
    app.use('/api/v1/e2e', e2e);
  }

  const webDist = resolveFromRoot(process.env.WEB_DIST || 'apps/web/dist');
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    const indexHtml = path.join(webDist, 'index.html');
    res.sendFile(indexHtml, (err) => {
      if (err) next();
    });
  });

  return app;
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
const selfTs = fileURLToPath(import.meta.url);
const selfJs = selfTs.replace(/\.ts$/, '.js');
const isDirectRun = entry === selfTs || entry === selfJs;

if (isDirectRun) {
  bootDatabase();
  startExpiryScheduler();
  const app = createApp();
  const port = Number(process.env.PORT || 8787);
  app.listen(port, '0.0.0.0', () => {
    console.log(`YellOut API listening on http://0.0.0.0:${port}`);
  });
}
