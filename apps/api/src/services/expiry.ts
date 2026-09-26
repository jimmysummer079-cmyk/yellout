import fs from 'node:fs';
import path from 'node:path';
import { getDb, getUploadDir } from '../db/index.js';

export function purgeExpiredVents(now = Date.now()): number {
  const db = getDb();
  const expired = db
    .prepare(`SELECT id, audio_path FROM vents WHERE expires_at <= ?`)
    .all(now) as Array<{ id: string; audio_path: string }>;

  if (expired.length === 0) return 0;

  const replyRows = db
    .prepare(
      `SELECT audio_path FROM replies WHERE vent_id IN (${expired.map(() => '?').join(',')})`
    )
    .all(...expired.map((e) => e.id)) as Array<{ audio_path: string }>;

  const deleteVent = db.prepare(`DELETE FROM vents WHERE id = ?`);
  for (const row of expired) {
    deleteVent.run(row.id);
  }

  for (const row of expired) {
    safeUnlink(path.join(getUploadDir(), row.audio_path));
  }
  for (const row of replyRows) {
    safeUnlink(path.join(getUploadDir(), row.audio_path));
  }

  return expired.length;
}

function safeUnlink(filePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore disk errors
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startExpiryScheduler(intervalMs = 60_000) {
  if (intervalId) return;
  purgeExpiredVents();
  intervalId = setInterval(() => {
    try {
      purgeExpiredVents();
    } catch (err) {
      console.error('[expiry] purge failed', err);
    }
  }, intervalMs);
  if (typeof intervalId === 'object' && 'unref' in intervalId) {
    intervalId.unref();
  }
}

export function stopExpiryScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
