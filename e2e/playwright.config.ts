import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.E2E_PORT || 8790);
const baseURL = `http://127.0.0.1:${PORT}`;

const serverEnv = [
  'E2E_MODE=1',
  `PORT=${PORT}`,
  `DATABASE_PATH=${path.join(ROOT, 'data/e2e.db')}`,
  `UPLOAD_DIR=${path.join(ROOT, 'uploads-e2e')}`,
  `WEB_DIST=${path.join(ROOT, 'apps/web/dist')}`,
  'VENT_RATE_LIMIT_MAX=3',
  'RATE_LIMIT_MAX=5000',
  'NODE_ENV=production',
].join(' ');

export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...devices['Pixel 7'],
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  webServer: {
    cwd: ROOT,
    command: `npm run build --workspace=@yellout/shared && npm run build --workspace=@yellout/api && npm run build --workspace=@yellout/web && ${serverEnv} node apps/api/dist/index.js`,
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
