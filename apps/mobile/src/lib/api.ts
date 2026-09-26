import Constants from 'expo-constants';
import type {
  AnonymousSession,
  PaginatedVents,
  ReactionToggleResponse,
  ReactionType,
  ReportReason,
  ReportResponse,
  VentPostDto,
  VoiceEffect,
  VoiceReplyDto,
} from '@yellout/shared';
import {
  clearStoredSession,
  getStoredToken,
  setStoredSession,
} from './storage';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
    ?.apiUrl;
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  return 'https://yellout.onrender.com';
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
}

export type ColdStartPhase = 'idle' | 'waking' | 'ready' | 'error';

export interface FetchWithColdStartOptions {
  /** Max wait while waking a free-tier host (ms). Default 90s. */
  maxWaitMs?: number;
  onPhase?: (phase: ColdStartPhase, detail?: string) => void;
  signal?: AbortSignal;
}

/**
 * Fetch with retries suited to Render free-tier cold starts (30–60s wake).
 * Pure-ish helper — exported for unit tests.
 */
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
      // 502/503/504 often mean the free dyno is still waking
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

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
  cold?: FetchWithColdStartOptions
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (auth) {
    const token = await getStoredToken();
    if (!token) throw new ApiError('未登录会话', 401, 'UNAUTHORIZED');
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetchWithColdStart(absoluteUrl(path), { ...init, headers }, cold);
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      message = body.error || message;
      code = body.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function pingHealth(
  cold?: FetchWithColdStartOptions
): Promise<{ status: string }> {
  return apiFetch('/api/v1/health', {}, false, cold);
}

export async function ensureSession(
  cold?: FetchWithColdStartOptions
): Promise<AnonymousSession> {
  const existing = await getStoredToken();
  if (existing) {
    try {
      const me = await apiFetch<{ id: string; codename: string }>(
        '/api/v1/session/me',
        {},
        true,
        cold
      );
      await setStoredSession(existing, me.codename);
      return {
        id: me.id,
        token: existing,
        codename: me.codename,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearStoredSession();
      } else {
        throw err;
      }
    }
  }
  const session = await apiFetch<AnonymousSession>(
    '/api/v1/session',
    { method: 'POST' },
    false,
    cold
  );
  await setStoredSession(session.token, session.codename);
  return session;
}

export async function refreshCodename(): Promise<string> {
  const res = await apiFetch<{ codename: string }>('/api/v1/session/codename', {
    method: 'POST',
  });
  const token = await getStoredToken();
  if (token) await setStoredSession(token, res.codename);
  return res.codename;
}

export async function fetchVents(params?: {
  tag?: string;
  cursor?: string;
}): Promise<PaginatedVents> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.cursor) qs.set('cursor', params.cursor);
  const q = qs.toString();
  return apiFetch(`/api/v1/vents${q ? `?${q}` : ''}`);
}

export async function createVent(input: {
  uri: string;
  mimeType: string;
  fileName: string;
  targetTag: string;
  duration: number;
  voiceEffect: VoiceEffect;
  waveformData: number[];
}): Promise<{ vent: VentPostDto; crisisFlag: boolean }> {
  const form = new FormData();
  form.append('audio', {
    uri: input.uri,
    type: input.mimeType,
    name: input.fileName,
  } as unknown as Blob);
  form.append('targetTag', input.targetTag);
  form.append('duration', String(input.duration));
  form.append('voiceEffect', input.voiceEffect);
  form.append('waveformData', JSON.stringify(input.waveformData));
  return apiFetch('/api/v1/vents', { method: 'POST', body: form });
}

export async function toggleReaction(
  ventId: string,
  type: ReactionType
): Promise<ReactionToggleResponse> {
  return apiFetch(`/api/v1/vents/${ventId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export async function createReply(input: {
  ventId: string;
  uri: string;
  mimeType: string;
  fileName: string;
  duration: number;
  voiceEffect: VoiceEffect;
}): Promise<VoiceReplyDto> {
  const form = new FormData();
  form.append('audio', {
    uri: input.uri,
    type: input.mimeType,
    name: input.fileName,
  } as unknown as Blob);
  form.append('duration', String(input.duration));
  form.append('voiceEffect', input.voiceEffect);
  return apiFetch(`/api/v1/vents/${input.ventId}/replies`, {
    method: 'POST',
    body: form,
  });
}

export async function reportVent(
  ventId: string,
  reason: ReportReason,
  detail?: string
): Promise<ReportResponse> {
  return apiFetch(`/api/v1/vents/${ventId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, detail }),
  });
}

export async function authorizedAudioHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Format helpers used by UI + unit tests */
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
  // Expo HIGH_QUALITY on iOS/Android → m4a / mp4 AAC
  return { mimeType: 'audio/mp4', fileName: 'vent.m4a' };
}
