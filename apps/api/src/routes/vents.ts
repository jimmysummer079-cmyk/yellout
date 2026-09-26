import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import {
  MAX_AUDIO_BYTES,
  MAX_REPLY_DURATION_SEC,
  MAX_TARGET_TAG_LEN,
  MAX_VENT_DURATION_SEC,
  type ReactionType,
  type ReportReason,
  type VoiceEffect,
} from '@yellout/shared';
import { requireAuth } from '../middleware/auth.js';
import { replyCreateRateLimit, ventCreateRateLimit } from '../middleware/rateLimit.js';
import { getUploadDir } from '../db/index.js';
import { moderateVentContent } from '../services/moderation.js';
import {
  createReply,
  createReport,
  createVent,
  getReplyAudio,
  getVent,
  getVentAudio,
  listVents,
  toggleReaction,
} from '../services/vents.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
});

const VOICE_EFFECTS: VoiceEffect[] = ['deep', 'robotic', 'ethereal'];
const REACTION_TYPES: ReactionType[] = ['hugs', 'understands', 'resonates', 'shoulder_tap'];
const REPORT_REASONS: ReportReason[] = ['abuse', 'spam', 'crisis_concern', 'other'];

export const ventsRouter = Router();

ventsRouter.get('/', requireAuth, (req, res) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = listVents({
    sessionId: req.session!.id,
    tag,
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  res.json(result);
});

ventsRouter.get('/:id', requireAuth, (req, res) => {
  const vent = getVent(req.params.id, req.session!.id);
  if (!vent) {
    res.status(404).json({ error: 'Vent not found or expired', code: 'NOT_FOUND' });
    return;
  }
  res.json(vent);
});

ventsRouter.get('/:id/audio', requireAuth, (req, res) => {
  const audio = getVentAudio(req.params.id);
  if (!audio) {
    res.status(404).json({ error: 'Audio not found', code: 'NOT_FOUND' });
    return;
  }
  const fullPath = path.join(getUploadDir(), audio.path);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Audio file missing', code: 'NOT_FOUND' });
    return;
  }
  res.setHeader('Content-Type', audio.mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(fullPath).pipe(res);
});

ventsRouter.post(
  '/',
  requireAuth,
  ventCreateRateLimit,
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'audio file required', code: 'VALIDATION' });
        return;
      }

      const targetTag = String(req.body.targetTag || '').trim();
      const duration = Number(req.body.duration);
      const voiceEffect = String(req.body.voiceEffect || '') as VoiceEffect;
      let waveformData: number[] = [];
      try {
        waveformData = JSON.parse(String(req.body.waveformData || '[]')) as number[];
      } catch {
        res.status(400).json({ error: 'waveformData must be JSON array', code: 'VALIDATION' });
        return;
      }

      if (!targetTag || targetTag.length > MAX_TARGET_TAG_LEN) {
        res.status(400).json({
          error: `targetTag required, max ${MAX_TARGET_TAG_LEN} chars`,
          code: 'VALIDATION',
        });
        return;
      }
      if (!Number.isFinite(duration) || duration < 1 || duration > MAX_VENT_DURATION_SEC) {
        res.status(400).json({
          error: `duration must be 1-${MAX_VENT_DURATION_SEC}`,
          code: 'VALIDATION',
        });
        return;
      }
      if (!VOICE_EFFECTS.includes(voiceEffect)) {
        res.status(400).json({ error: 'invalid voiceEffect', code: 'VALIDATION' });
        return;
      }
      if (!Array.isArray(waveformData) || waveformData.length === 0) {
        waveformData = Array.from({ length: 24 }, () => 0.3 + Math.random() * 0.5);
      }

      const moderation = await moderateVentContent({ targetTag });
      if (!moderation.ok) {
        res.status(422).json({
          error: 'Content blocked by moderation',
          code: 'MODERATION_BLOCKED',
          details: { reason: moderation.reason },
        });
        return;
      }

      const ext = mimeToExt(req.file.mimetype);
      const filename = `vent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const abs = path.join(getUploadDir(), filename);
      fs.writeFileSync(abs, req.file.buffer);

      // Refresh codename after vent (privacy: cut trajectory)
      const vent = createVent({
        sessionId: req.session!.id,
        codename: req.session!.codename,
        targetTag,
        duration: Math.floor(duration),
        voiceEffect,
        waveformData: waveformData.slice(0, 48).map((n) => Math.max(0, Math.min(1, Number(n) || 0))),
        audioPath: filename,
        audioMime: req.file.mimetype || 'audio/webm',
        crisisFlag: moderation.crisisFlag,
      });

      res.status(201).json({
        vent,
        crisisFlag: moderation.crisisFlag,
      });
    } catch (err) {
      console.error('[create vent]', err);
      res.status(500).json({ error: 'Failed to create vent', code: 'INTERNAL' });
    }
  }
);

ventsRouter.post('/:id/reactions', requireAuth, (req, res) => {
  const type = req.body?.type as ReactionType;
  if (!REACTION_TYPES.includes(type)) {
    res.status(400).json({ error: 'invalid reaction type', code: 'VALIDATION' });
    return;
  }
  const result = toggleReaction(req.params.id, req.session!.id, type);
  if (!result) {
    res.status(404).json({ error: 'Vent not found or expired', code: 'NOT_FOUND' });
    return;
  }
  res.json({ ventId: req.params.id, ...result });
});

ventsRouter.post(
  '/:id/replies',
  requireAuth,
  replyCreateRateLimit,
  upload.single('audio'),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'audio file required', code: 'VALIDATION' });
      return;
    }
    const duration = Number(req.body.duration);
    const voiceEffect = (String(req.body.voiceEffect || 'deep') as VoiceEffect);
    if (!Number.isFinite(duration) || duration < 1 || duration > MAX_REPLY_DURATION_SEC) {
      res.status(400).json({
        error: `duration must be 1-${MAX_REPLY_DURATION_SEC}`,
        code: 'VALIDATION',
      });
      return;
    }
    if (!VOICE_EFFECTS.includes(voiceEffect)) {
      res.status(400).json({ error: 'invalid voiceEffect', code: 'VALIDATION' });
      return;
    }

    const ext = mimeToExt(req.file.mimetype);
    const filename = `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(getUploadDir(), filename), req.file.buffer);

    const reply = createReply({
      ventId: req.params.id,
      sessionId: req.session!.id,
      codename: req.session!.codename,
      duration: Math.floor(duration),
      voiceEffect,
      audioPath: filename,
      audioMime: req.file.mimetype || 'audio/webm',
    });

    if (!reply) {
      try {
        fs.unlinkSync(path.join(getUploadDir(), filename));
      } catch {
        // ignore
      }
      res.status(404).json({ error: 'Vent not found or expired', code: 'NOT_FOUND' });
      return;
    }
    res.status(201).json(reply);
  }
);

ventsRouter.post('/:id/report', requireAuth, (req, res) => {
  const reason = req.body?.reason as ReportReason;
  const detail = typeof req.body?.detail === 'string' ? req.body.detail.slice(0, 500) : undefined;
  if (!REPORT_REASONS.includes(reason)) {
    res.status(400).json({ error: 'invalid reason', code: 'VALIDATION' });
    return;
  }
  const report = createReport({
    ventId: req.params.id,
    sessionId: req.session!.id,
    reason,
    detail,
  });
  if (!report) {
    res.status(404).json({ error: 'Vent not found', code: 'NOT_FOUND' });
    return;
  }
  res.status(201).json({ id: report.id, status: 'received' });
});

export const repliesRouter = Router();

repliesRouter.get('/:id/audio', requireAuth, (req, res) => {
  const audio = getReplyAudio(req.params.id);
  if (!audio) {
    res.status(404).json({ error: 'Audio not found', code: 'NOT_FOUND' });
    return;
  }
  const fullPath = path.join(getUploadDir(), audio.path);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Audio file missing', code: 'NOT_FOUND' });
    return;
  }
  res.setHeader('Content-Type', audio.mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(fullPath).pipe(res);
});

function mimeToExt(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}
