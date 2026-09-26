/**
 * Pure API helpers (no Expo native modules) — safe for jest-expo / node tests.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function resolveApiBaseUrl(envUrl?: string | null, extraUrl?: string | null): string {
  const fromEnv = envUrl?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (extraUrl?.trim()) return extraUrl.trim().replace(/\/$/, '');
  return 'https://yellout.onrender.com';
}

export function joinApiUrl(base: string, path: string): string {
  if (path.startsWith('http')) return path;
  const root = base.replace(/\/$/, '');
  return `${root}${path.startsWith('/') ? '' : '/'}${path}`;
}

export type ColdStartPhase = 'idle' | 'waking' | 'ready' | 'error';

export interface FetchWithColdStartOptions {
  maxWaitMs?: number;
  onPhase?: (phase: ColdStartPhase, detail?: string) => void;
  signal?: AbortSignal;
}

export async function fetchWithColdStart(
  input: string,
  init: RequestInit = {},
  opts: FetchWithColdStartOptions = {}
): Promise<Response> {
  const maxWaitMs = opts.maxWaitMs ?? 90_000;
  const started = Date.now();
  let attempt = 0;
  let announcedWake = false;

  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const onOuterAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onOuterAbort);

    try {
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      if ([502, 503, 504].includes(res.status) && Date.now() - started < maxWaitMs) {
        if (!announcedWake) {
          announcedWake = true;
          opts.onPhase?.('waking', '服务器正在从休眠中唤醒…');
        }
        await sleep(Math.min(4000, 800 * attempt));
        continue;
      }
      opts.onPhase?.('ready');
      return res;
    } catch (err) {
      const elapsed = Date.now() - started;
      if (elapsed >= maxWaitMs || opts.signal?.aborted) {
        opts.onPhase?.('error', '无法连接服务器');
        throw err;
      }
      if (!announcedWake) {
        announcedWake = true;
        opts.onPhase?.('waking', '免费服务器启动中，大约需要 30–60 秒…');
      }
      await sleep(Math.min(5000, 1000 * attempt));
    } finally {
      clearTimeout(timeout);
      opts.signal?.removeEventListener('abort', onOuterAbort);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatTimeAgo(iso: string, now = Date.now()): string {
  const diff = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  return `${Math.floor(diff / 3600)}小时前`;
}

export function formatRemainingHours(iso: string, now = Date.now()): string {
  const hours = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 3_600_000));
  return `${hours}小时后焚毁`;
}

export function guessRecordingMime(uri: string): { mimeType: string; fileName: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webm')) return { mimeType: 'audio/webm', fileName: 'vent.webm' };
  if (lower.endsWith('.3gp') || lower.endsWith('.3gpp'))
    return { mimeType: 'audio/3gpp', fileName: 'vent.3gp' };
  if (lower.endsWith('.wav')) return { mimeType: 'audio/wav', fileName: 'vent.wav' };
  return { mimeType: 'audio/mp4', fileName: 'vent.m4a' };
}
