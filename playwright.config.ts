import { defineConfig, devices } from '@playwright/test';

// Use port 3001 to avoid conflicts with other dev servers
const TEST_PORT = process.env.TEST_PORT || '3001';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${TEST_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: `npm run dev -- -p ${TEST_PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
