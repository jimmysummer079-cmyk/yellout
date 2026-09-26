import crypto from 'node:crypto';
import {
  generateCodename,
  type AnonymousSession,
  type VentPostDto,
  type VoiceReplyDto,
  type VentReactions,
  type UserReactions,
  type ReactionType,
  VENT_TTL_MS,
} from '@yellout/shared';
import { getDb } from '../db/index.js';
import { createToken, hashToken } from '../middleware/auth.js';

export function createSession(): AnonymousSession {
  const db = getDb();
  const id = crypto.randomUUID();
  const token = createToken();
  const codename = generateCodename();
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (id, token_hash, codename, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, hashToken(token), codename, now, now);

  return {
    id,
    token,
    codename,
    createdAt: new Date(now).toISOString(),
  };
}

export function refreshCodename(sessionId: string): string {
  const db = getDb();
  const codename = generateCodename();
  db.prepare(`UPDATE sessions SET codename = ?, last_seen_at = ? WHERE id = ?`).run(
    codename,
    Date.now(),
    sessionId
  );
  return codename;
}

function emptyUserReactions(): UserReactions {
  return { hugs: false, understands: false, resonates: false, shoulderTap: false };
}

function countReactions(ventId: string): VentReactions {
  const db = getDb();
  const rows = db
    .prepare(`SELECT type, COUNT(*) as c FROM reactions WHERE vent_id = ? GROUP BY type`)
    .all(ventId) as Array<{ type: string; c: number }>;
  const result: VentReactions = { hugs: 0, understands: 0, resonates: 0, shoulderTaps: 0 };
  for (const row of rows) {
    if (row.type === 'hugs') result.hugs = row.c;
    else if (row.type === 'understands') result.understands = row.c;
    else if (row.type === 'resonates') result.resonates = row.c;
    else if (row.type === 'shoulder_tap') result.shoulderTaps = row.c;
  }
  return result;
}

function userReactionsFor(ventId: string, sessionId: string): UserReactions {
  const db = getDb();
  const rows = db
    .prepare(`SELECT type FROM reactions WHERE vent_id = ? AND session_id = ?`)
    .all(ventId, sessionId) as Array<{ type: string }>;
  const ur = emptyUserReactions();
  for (const row of rows) {
    if (row.type === 'hugs') ur.hugs = true;
    else if (row.type === 'understands') ur.understands = true;
    else if (row.type === 'resonates') ur.resonates = true;
    else if (row.type === 'shoulder_tap') ur.shoulderTap = true;
  }
  return ur;
}

function mapReply(row: {
  id: string;
  vent_id: string;
  codename: string;
  duration: number;
  voice_effect: string;
  created_at: number;
}): VoiceReplyDto {
  return {
    id: row.id,
    ventId: row.vent_id,
    codename: row.codename,
    duration: row.duration,
    voiceEffect: row.voice_effect as VoiceReplyDto['voiceEffect'],
    createdAt: new Date(row.created_at).toISOString(),
    audioUrl: `/api/v1/replies/${row.id}/audio`,
  };
}

export function mapVent(
  row: {
    id: string;
    codename: string;
    target_tag: string;
    duration: number;
    voice_effect: string;
    waveform_json: string;
    created_at: number;
    expires_at: number;
    crisis_flag: number;
  },
  sessionId?: string
): VentPostDto {
  const db = getDb();
  const replies = db
    .prepare(
      `SELECT id, vent_id, codename, duration, voice_effect, created_at
       FROM replies WHERE vent_id = ? ORDER BY created_at ASC`
    )
    .all(row.id) as Array<{
    id: string;
    vent_id: string;
    codename: string;
    duration: number;
    voice_effect: string;
    created_at: number;
  }>;

  return {
    id: row.id,
    codename: row.codename,
    targetTag: row.target_tag,
    duration: row.duration,
    voiceEffect: row.voice_effect as VentPostDto['voiceEffect'],
    waveformData: JSON.parse(row.waveform_json) as number[],
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    audioUrl: `/api/v1/vents/${row.id}/audio`,
    reactions: countReactions(row.id),
    userReactions: sessionId ? userReactionsFor(row.id, sessionId) : emptyUserReactions(),
    voiceReplies: replies.map(mapReply),
    crisisFlag: Boolean(row.crisis_flag),
  };
}

export function listVents(opts: {
  sessionId?: string;
  tag?: string;
  cursor?: string;
  limit?: number;
}): { items: VentPostDto[]; nextCursor: string | null } {
  const db = getDb();
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 50);
  const now = Date.now();
  const cursorTs = opts.cursor ? Number(opts.cursor) : now + 1;

  let rows: Array<{
    id: string;
    codename: string;
    target_tag: string;
    duration: number;
    voice_effect: string;
    waveform_json: string;
    created_at: number;
    expires_at: number;
    crisis_flag: number;
  }>;

  if (opts.tag) {
    rows = db
      .prepare(
        `SELECT * FROM vents
         WHERE expires_at > ? AND created_at < ? AND target_tag = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(now, cursorTs, opts.tag, limit + 1) as typeof rows;
  } else {
    rows = db
      .prepare(
        `SELECT * FROM vents
         WHERE expires_at > ? AND created_at < ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(now, cursorTs, limit + 1) as typeof rows;
  }

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: slice.map((r) => mapVent(r, opts.sessionId)),
    nextCursor: hasMore ? String(slice[slice.length - 1]!.created_at) : null,
  };
}

export function getVent(id: string, sessionId?: string): VentPostDto | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM vents WHERE id = ? AND expires_at > ?`).get(id, Date.now()) as
    | {
        id: string;
        codename: string;
        target_tag: string;
        duration: number;
        voice_effect: string;
        waveform_json: string;
        created_at: number;
        expires_at: number;
        crisis_flag: number;
      }
    | undefined;
  if (!row) return null;
  return mapVent(row, sessionId);
}

export function createVent(input: {
  sessionId: string;
  codename: string;
  targetTag: string;
  duration: number;
  voiceEffect: string;
  waveformData: number[];
  audioPath: string;
  audioMime: string;
  crisisFlag: boolean;
  ttlMs?: number;
}): VentPostDto {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt =
    now + (input.ttlMs ?? (Number(process.env.VENT_TTL_MS) || VENT_TTL_MS));
  db.prepare(
    `INSERT INTO vents (
      id, session_id, codename, target_tag, duration, voice_effect,
      waveform_json, audio_path, audio_mime, created_at, expires_at, crisis_flag, moderated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    id,
    input.sessionId,
    input.codename,
    input.targetTag,
    input.duration,
    input.voiceEffect,
    JSON.stringify(input.waveformData),
    input.audioPath,
    input.audioMime,
    now,
    expiresAt,
    input.crisisFlag ? 1 : 0
  );
  return getVent(id, input.sessionId)!;
}

export function getVentAudio(id: string): { path: string; mime: string } | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT audio_path, audio_mime FROM vents WHERE id = ? AND expires_at > ?`)
    .get(id, Date.now()) as { audio_path: string; audio_mime: string } | undefined;
  if (!row) return null;
  return { path: row.audio_path, mime: row.audio_mime };
}

export function toggleReaction(
  ventId: string,
  sessionId: string,
  type: ReactionType
): { reactions: VentReactions; userReactions: UserReactions } | null {
  const db = getDb();
  const exists = db
    .prepare(`SELECT id FROM vents WHERE id = ? AND expires_at > ?`)
    .get(ventId, Date.now());
  if (!exists) return null;

  const existing = db
    .prepare(`SELECT 1 FROM reactions WHERE vent_id = ? AND session_id = ? AND type = ?`)
    .get(ventId, sessionId, type);

  if (existing) {
    db.prepare(
      `DELETE FROM reactions WHERE vent_id = ? AND session_id = ? AND type = ?`
    ).run(ventId, sessionId, type);
  } else {
    db.prepare(
      `INSERT INTO reactions (vent_id, session_id, type, created_at) VALUES (?, ?, ?, ?)`
    ).run(ventId, sessionId, type, Date.now());
  }

  return {
    reactions: countReactions(ventId),
    userReactions: userReactionsFor(ventId, sessionId),
  };
}

export function createReply(input: {
  ventId: string;
  sessionId: string;
  codename: string;
  duration: number;
  voiceEffect: string;
  audioPath: string;
  audioMime: string;
}): VoiceReplyDto | null {
  const db = getDb();
  const vent = db
    .prepare(`SELECT id FROM vents WHERE id = ? AND expires_at > ?`)
    .get(input.ventId, Date.now());
  if (!vent) return null;

  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO replies (id, vent_id, session_id, codename, duration, voice_effect, audio_path, audio_mime, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.ventId,
    input.sessionId,
    input.codename,
    input.duration,
    input.voiceEffect,
    input.audioPath,
    input.audioMime,
    now
  );

  return {
    id,
    ventId: input.ventId,
    codename: input.codename,
    duration: input.duration,
    voiceEffect: input.voiceEffect as VoiceReplyDto['voiceEffect'],
    createdAt: new Date(now).toISOString(),
    audioUrl: `/api/v1/replies/${id}/audio`,
  };
}

export function getReplyAudio(id: string): { path: string; mime: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT r.audio_path, r.audio_mime FROM replies r
       JOIN vents v ON v.id = r.vent_id
       WHERE r.id = ? AND v.expires_at > ?`
    )
    .get(id, Date.now()) as { audio_path: string; audio_mime: string } | undefined;
  if (!row) return null;
  return { path: row.audio_path, mime: row.audio_mime };
}

export function createReport(input: {
  ventId: string;
  sessionId: string;
  reason: string;
  detail?: string;
}): { id: string } | null {
  const db = getDb();
  const vent = db.prepare(`SELECT id FROM vents WHERE id = ?`).get(input.ventId);
  if (!vent) return null;
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO reports (id, vent_id, session_id, reason, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.ventId, input.sessionId, input.reason, input.detail || null, Date.now());
  return { id };
}
