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

const TOKEN_KEY = 'yellout_session_token';
const CODENAME_KEY = 'yellout_codename';
const ONBOARDING_KEY = 'yellout_onboarding_done';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredCodename(): string | null {
  return localStorage.getItem(CODENAME_KEY);
}

export function setStoredSession(token: string, codename: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CODENAME_KEY, codename);
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CODENAME_KEY);
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (auth) {
    const token = getStoredToken();
    if (!token) throw new ApiError('未登录会话', 401, 'UNAUTHORIZED');
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers });
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

export async function ensureSession(): Promise<AnonymousSession> {
  const existing = getStoredToken();
  if (existing) {
    try {
      const me = await apiFetch<{ id: string; codename: string }>('/api/v1/session/me');
      setStoredSession(existing, me.codename);
      return {
        id: me.id,
        token: existing,
        codename: me.codename,
        createdAt: new Date().toISOString(),
      };
    } catch {
      clearStoredSession();
    }
  }
  const session = await apiFetch<AnonymousSession>('/api/v1/session', { method: 'POST' }, false);
  setStoredSession(session.token, session.codename);
  return session;
}

export async function refreshCodename(): Promise<string> {
  const res = await apiFetch<{ codename: string }>('/api/v1/session/codename', {
    method: 'POST',
  });
  const token = getStoredToken();
  if (token) setStoredSession(token, res.codename);
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
  return apiFetch<PaginatedVents>(`/api/v1/vents${q ? `?${q}` : ''}`);
}

export async function createVent(input: {
  audio: Blob;
  targetTag: string;
  duration: number;
  voiceEffect: VoiceEffect;
  waveformData: number[];
}): Promise<{ vent: VentPostDto; crisisFlag: boolean }> {
  const form = new FormData();
  form.append('audio', input.audio, 'vent.webm');
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
  audio: Blob;
  duration: number;
  voiceEffect: VoiceEffect;
}): Promise<VoiceReplyDto> {
  const form = new FormData();
  form.append('audio', input.audio, 'reply.webm');
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

export function authAudioUrl(url: string): string {
  // Relative URLs work with cookie-less bearer via fetch blob; for <audio> we fetch manually.
  return url;
}

export async function fetchAudioBlob(url: string): Promise<Blob> {
  const token = getStoredToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError('音频加载失败', res.status);
  return res.blob();
}
