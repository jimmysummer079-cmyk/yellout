import { Router } from 'express';
import { getDb } from '../db/index.js';
import { purgeExpiredVents } from '../services/expiry.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Test-only routes enabled when E2E_MODE=1.
 * Never enable in production deployments.
 */
export function createE2ERouter(): Router | null {
  if (process.env.E2E_MODE !== '1') return null;

  const router = Router();

  router.post('/expire-vent/:id', requireAuth, (req, res) => {
    const db = getDb();
    const info = db
      .prepare(`UPDATE vents SET expires_at = ? WHERE id = ?`)
      .run(Date.now() - 1000, req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ ok: true, purgedReady: true });
  });

  router.post('/purge', requireAuth, (_req, res) => {
    const n = purgeExpiredVents();
    res.json({ purged: n });
  });

  router.get('/vent-count', requireAuth, (_req, res) => {
    const row = getDb()
      .prepare(`SELECT COUNT(*) as c FROM vents WHERE expires_at > ?`)
      .get(Date.now()) as { c: number };
    res.json({ count: row.c });
  });

  return router;
}
