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
import {
  ApiError,
  type ColdStartPhase,
  type FetchWithColdStartOptions,
  fetchWithColdStart,
  formatRemainingHours,
  formatTimeAgo,
  guessRecordingMime,
  joinApiUrl,
  resolveApiBaseUrl,
} from './apiCore';

export {
  ApiError,
  fetchWithColdStart,
  formatRemainingHours,
  formatTimeAgo,
  guessRecordingMime,
};
export type { ColdStartPhase, FetchWithColdStartOptions };

export function getApiBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, fromExtra);
}

export function absoluteUrl(path: string): string {
  return joinApiUrl(getApiBaseUrl(), path);
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
