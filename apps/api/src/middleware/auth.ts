import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';

export interface AuthedSession {
  id: string;
  codename: string;
}

declare global {
  namespace Express {
    interface Request {
      session?: AuthedSession;
    }
  }
}

export function hashToken(token: string): string {
  const pepper = process.env.SESSION_SECRET || '';
  return crypto.createHash('sha256').update(`${pepper}:${token}`).digest('hex');
}

export function createToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Missing session token', code: 'UNAUTHORIZED' });
    return;
  }
  const tokenHash = hashToken(match[1]!);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, codename FROM sessions WHERE token_hash = ?`
    )
    .get(tokenHash) as { id: string; codename: string } | undefined;

  if (!row) {
    res.status(401).json({ error: 'Invalid session token', code: 'UNAUTHORIZED' });
    return;
  }

  db.prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`).run(Date.now(), row.id);
  req.session = { id: row.id, codename: row.codename };
  next();
}
