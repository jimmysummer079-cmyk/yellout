import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FIXTURE_AUDIO = path.join(__dirname, 'fixtures/vent-tone.webm');

async function dismissOnboarding(page: Page) {
  const continueBtn = page.getByRole('button', { name: '继续' });
  const enterBtn = page.getByRole('button', { name: /进入树洞/ });
  const ventBtn = page.locator('#the-big-vent-button');

  // Onboarding overlay may sit above the app; wait for either path without strict OR matching.
  await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) {
    if (await enterBtn.isVisible().catch(() => false)) {
      await enterBtn.click();
      break;
    }
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(350);
      continue;
    }
    break;
  }
  await expect(ventBtn).toBeVisible({ timeout: 20_000 });
}

async function holdVentButton(page: Page, ms: number, opts?: { burn?: boolean }) {
  const btn = page.locator('#the-big-vent-button');
  const box = await btn.boundingBox();
  if (!box) throw new Error('vent button not found');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  if (opts?.burn) {
    await page.mouse.move(x, y - 120, { steps: 8 });
    await page.waitForTimeout(200);
  }
  await page.mouse.up();
}

async function createSession(request: APIRequestContext) {
  const res = await request.post('/api/v1/session');
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ token: string; codename: string; id: string }>;
}

async function apiCreateVent(
  request: APIRequestContext,
  token: string,
  tag = '领导'
) {
  const audio = fs.readFileSync(FIXTURE_AUDIO);
  const res = await request.post('/api/v1/vents', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      audio: {
        name: 'vent.webm',
        mimeType: 'audio/webm',
        buffer: audio,
      },
      targetTag: tag,
      duration: '3',
      voiceEffect: 'deep',
      waveformData: JSON.stringify([0.2, 0.5, 0.8, 0.4, 0.3]),
    },
  });
  return res;
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  // Ensure fixture exists (tiny webm-like bytes; API accepts any audio/*)
  fs.mkdirSync(path.dirname(FIXTURE_AUDIO), { recursive: true });
  if (!fs.existsSync(FIXTURE_AUDIO)) {
    fs.writeFileSync(FIXTURE_AUDIO, Buffer.from('YellOut-e2e-fixture-audio-webm'));
  }
});

test('health check is ready for deploy probes', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('first-run onboarding then vent home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('这里没有观众')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: '心理援助热线' })).toBeVisible();
  await dismissOnboarding(page);
  await expect(page.getByText('长按倾诉')).toBeVisible();
  await expect(page.locator('#the-big-vent-button')).toBeVisible();
});

test('crisis modal is prominent from header', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await page.getByRole('button', { name: /温暖守护/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('生活很重，但你的存在更珍贵')).toBeVisible();
  await expect(page.getByText('400-161-9995')).toBeVisible();
  await page.getByRole('button', { name: /我已知晓/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('record/upload vent appears for a second browser session', async ({ browser, request }) => {
  const contextA = await browser.newContext({
    permissions: ['microphone'],
  });
  const pageA = await contextA.newPage();
  await pageA.addInitScript(() => {
    localStorage.removeItem('yellout_onboarding_done');
  });

  const ventPosts: string[] = [];
  pageA.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/vents') && !req.url().includes('/reactions')) {
      ventPosts.push(req.url());
    }
  });

  await pageA.goto('/');
  await dismissOnboarding(pageA);

  await holdVentButton(pageA, 1800);
  await expect(pageA.getByText(/已推送到同温层|发送失败/)).toBeVisible({ timeout: 20_000 });
  // Prefer success path
  await expect(pageA.getByText(/已推送到同温层/)).toBeVisible({ timeout: 5_000 });
  expect(ventPosts.length).toBeGreaterThan(0);

  // Second independent session
  const sessionB = await createSession(request);
  const list = await request.get('/api/v1/vents', {
    headers: { Authorization: `Bearer ${sessionB.token}` },
  });
  expect(list.ok()).toBeTruthy();
  const body = await list.json();
  expect(body.items.length).toBeGreaterThan(0);
  expect(body.items.some((v: { targetTag: string }) => v.targetTag === '领导')).toBeTruthy();

  const contextB = await browser.newContext({
    permissions: ['microphone'],
  });
  await contextB.addInitScript((token) => {
    localStorage.setItem('yellout_session_token', token);
    localStorage.setItem('yellout_onboarding_done', '1');
  }, sessionB.token);
  const pageB = await contextB.newPage();
  await pageB.goto('/plaza');
  await expect(pageB.getByText('#领导').first()).toBeVisible({ timeout: 25_000 });
  await expect(pageB.getByText('正在汇集同温层回声…')).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

test('reactions and voice reply persist across reload', async ({ request, browser }) => {
  const a = await createSession(request);
  const createRes = await apiCreateVent(request, a.token, '生活');
  expect(createRes.status()).toBe(201);
  const { vent } = await createRes.json();

  const b = await createSession(request);
  const react = await request.post(`/api/v1/vents/${vent.id}/reactions`, {
    headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'application/json' },
    data: { type: 'hugs' },
  });
  expect(react.ok()).toBeTruthy();
  const reactBody = await react.json();
  expect(reactBody.userReactions.hugs).toBe(true);

  const replyAudio = fs.readFileSync(FIXTURE_AUDIO);
  const reply = await request.post(`/api/v1/vents/${vent.id}/replies`, {
    headers: { Authorization: `Bearer ${b.token}` },
    multipart: {
      audio: { name: 'reply.webm', mimeType: 'audio/webm', buffer: replyAudio },
      duration: '2',
      voiceEffect: 'deep',
    },
  });
  expect(reply.status()).toBe(201);

  // Reload via UI session B
  const ctx = await browser.newContext();
  await ctx.addInitScript((token) => {
    localStorage.setItem('yellout_session_token', token);
    localStorage.setItem('yellout_onboarding_done', '1');
  }, b.token);
  const page = await ctx.newPage();
  await page.goto('/plaza');
  await expect(page.locator('article').filter({ hasText: '#生活' }).first()).toBeVisible({
    timeout: 20_000,
  });
  // After reload, reaction state should still be active for this session
  await expect(page.getByRole('button', { name: '抱抱' }).first()).toBeVisible();
  await expect(page.getByText(/同温层回声/).first()).toBeVisible({ timeout: 15_000 });

  // API reload check
  const again = await request.get(`/api/v1/vents/${vent.id}`, {
    headers: { Authorization: `Bearer ${b.token}` },
  });
  const detail = await again.json();
  expect(detail.userReactions.hugs).toBe(true);
  expect(detail.voiceReplies.length).toBeGreaterThan(0);

  await ctx.close();
});

test('Burn to Void never uploads', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);

  const uploads: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/v1\/vents\/?$/.test(new URL(req.url()).pathname)) {
      uploads.push(req.url());
    }
  });

  await holdVentButton(page, 1200, { burn: true });
  await expect(page.getByText(/已焚入虚空/)).toBeVisible({ timeout: 10_000 });
  expect(uploads.length).toBe(0);
});

test('post expiry cleanup deletes audio', async ({ request }) => {
  const s = await createSession(request);
  const created = await apiCreateVent(request, s.token, '客户');
  expect(created.status()).toBe(201);
  const { vent } = await created.json();

  const expire = await request.post(`/api/v1/e2e/expire-vent/${vent.id}`, {
    headers: { Authorization: `Bearer ${s.token}` },
  });
  expect(expire.ok()).toBeTruthy();

  const purge = await request.post('/api/v1/e2e/purge', {
    headers: { Authorization: `Bearer ${s.token}` },
  });
  expect(purge.ok()).toBeTruthy();
  const purged = await purge.json();
  expect(purged.purged).toBeGreaterThanOrEqual(1);

  const gone = await request.get(`/api/v1/vents/${vent.id}`, {
    headers: { Authorization: `Bearer ${s.token}` },
  });
  expect(gone.status()).toBe(404);
});

test('vent rate limiting returns 429', async ({ request }) => {
  const s = await createSession(request);
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++) {
    const res = await apiCreateVent(request, s.token, '匿名');
    statuses.push(res.status());
  }
  // VENT_RATE_LIMIT_MAX=3 in webServer env
  expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);
  expect(statuses.some((s) => s === 429)).toBeTruthy();
});

test('abuse reporting works', async ({ request }) => {
  const a = await createSession(request);
  const b = await createSession(request);
  const created = await apiCreateVent(request, a.token, '伴侣');
  // may be rate limited if same IP/session spam — use fresh if needed
  if (created.status() === 429) {
    const c = await createSession(request);
    const again = await apiCreateVent(request, c.token, '伴侣');
    expect(again.status()).toBe(201);
    const { vent } = await again.json();
    const report = await request.post(`/api/v1/vents/${vent.id}/report`, {
      headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'application/json' },
      data: { reason: 'abuse', detail: 'e2e' },
    });
    expect(report.status()).toBe(201);
    return;
  }
  expect(created.status()).toBe(201);
  const { vent } = await created.json();
  const report = await request.post(`/api/v1/vents/${vent.id}/report`, {
    headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'application/json' },
    data: { reason: 'spam', detail: 'e2e report' },
  });
  expect(report.status()).toBe(201);
  const body = await report.json();
  expect(body.status).toBe('received');
});
