import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.RATE_LIMIT_MAX || 120);

export const globalRateLimit = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
});

export const ventCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.VENT_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.id || req.ip || 'anon',
  message: { error: 'Venting too frequently — take a breath', code: 'VENT_RATE_LIMITED' },
});

export const replyCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.REPLY_RATE_LIMIT_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.id || req.ip || 'anon',
  message: { error: 'Replying too frequently', code: 'REPLY_RATE_LIMITED' },
});

/** No-op passthrough when running tests with trust proxy quirks. */
export const optionalRateLimit: RequestHandler = (_req, _res, next) => next();
