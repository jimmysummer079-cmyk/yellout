import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { resolveFromRoot } from '../paths.js';

export type Db = DatabaseSync;

let dbInstance: DatabaseSync | null = null;

export function getDbPath(): string {
  return resolveFromRoot(process.env.DATABASE_PATH || 'data/yellout.db');
}

export function getUploadDir(): string {
  const dir = resolveFromRoot(process.env.UPLOAD_DIR || 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function openDatabase(dbPath = getDbPath()): DatabaseSync {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = openDatabase();
  }
  return dbInstance;
}

export function setDb(db: DatabaseSync | null) {
  dbInstance = db;
}

export function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      codename TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      codename TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      duration INTEGER NOT NULL,
      voice_effect TEXT NOT NULL,
      waveform_json TEXT NOT NULL,
      audio_path TEXT NOT NULL,
      audio_mime TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      crisis_flag INTEGER NOT NULL DEFAULT 0,
      moderated INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_vents_expires ON vents(expires_at);
    CREATE INDEX IF NOT EXISTS idx_vents_created ON vents(created_at DESC);

    CREATE TABLE IF NOT EXISTS reactions (
      vent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (vent_id, session_id, type),
      FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      vent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      codename TEXT NOT NULL,
      duration INTEGER NOT NULL,
      voice_effect TEXT NOT NULL,
      audio_path TEXT NOT NULL,
      audio_mime TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_replies_vent ON replies(vent_id, created_at);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      vent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);
}
