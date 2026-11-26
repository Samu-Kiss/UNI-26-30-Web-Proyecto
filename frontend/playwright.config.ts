import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:4200';
const isFullStack = process.env['E2E_MODE'] === 'fullstack';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isFullStack,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: isFullStack ? 1 : process.env['CI'] ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    {
      name: 'mocked',
      testIgnore: /.*\.fullstack\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'fullstack',
      testMatch: /.*\.fullstack\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env['PLAYWRIGHT_SKIP_WEBSERVER']
    ? undefined
    : {
        command: 'npm run start -- --port 4200',
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
