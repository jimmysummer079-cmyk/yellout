import {
  absoluteUrl,
  fetchWithColdStart,
  formatRemainingHours,
  formatTimeAgo,
  getApiBaseUrl,
  guessRecordingMime,
} from '../src/lib/api';

describe('getApiBaseUrl', () => {
  const prev = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = prev;
  });

  it('defaults to the Render production URL', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe('https://yellout.onrender.com');
  });

  it('uses EXPO_PUBLIC_API_URL and strips trailing slash', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://example.com/';
    expect(getApiBaseUrl()).toBe('https://example.com');
  });
});

describe('absoluteUrl', () => {
  it('joins relative API paths', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://yellout.onrender.com';
    expect(absoluteUrl('/api/v1/health')).toBe('https://yellout.onrender.com/api/v1/health');
  });

  it('passes through absolute URLs', () => {
    expect(absoluteUrl('https://cdn.example/a.m4a')).toBe('https://cdn.example/a.m4a');
  });
});

describe('guessRecordingMime', () => {
  it('detects m4a/mp4 as AAC container for mobile uploads', () => {
    expect(guessRecordingMime('file:///tmp/rec.m4a')).toEqual({
      mimeType: 'audio/mp4',
      fileName: 'vent.m4a',
    });
  });

  it('detects webm for web-like recordings', () => {
    expect(guessRecordingMime('file:///tmp/rec.webm').mimeType).toBe('audio/webm');
  });
});

describe('time helpers', () => {
  const now = Date.parse('2026-03-26T12:00:00.000Z');

  it('formats relative time in Chinese', () => {
    expect(formatTimeAgo('2026-03-26T11:59:30.000Z', now)).toBe('刚刚');
    expect(formatTimeAgo('2026-03-26T11:45:00.000Z', now)).toBe('15分钟前');
    expect(formatTimeAgo('2026-03-26T09:00:00.000Z', now)).toBe('3小时前');
  });

  it('formats remaining burn countdown', () => {
    expect(formatRemainingHours('2026-03-28T12:00:00.000Z', now)).toBe('48小时后焚毁');
  });
});

describe('fetchWithColdStart', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries on network failure then succeeds (cold start)', async () => {
    let n = 0;
    const phases: string[] = [];
    global.fetch = jest.fn(async () => {
      n += 1;
      if (n < 3) throw new Error('connect ECONNREFUSED');
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    }) as unknown as typeof fetch;

    const res = await fetchWithColdStart(
      'https://yellout.onrender.com/api/v1/health',
      {},
      {
        maxWaitMs: 15_000,
        onPhase: (p) => phases.push(p),
      }
    );
    expect(res.ok).toBe(true);
    expect(n).toBe(3);
    expect(phases).toContain('waking');
    expect(phases).toContain('ready');
  });

  it('retries on 503 then succeeds', async () => {
    let n = 0;
    global.fetch = jest.fn(async () => {
      n += 1;
      if (n === 1) return new Response('waking', { status: 503 });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const res = await fetchWithColdStart('https://example.com/h', {}, { maxWaitMs: 10_000 });
    expect(res.status).toBe(200);
    expect(n).toBe(2);
  });
});
