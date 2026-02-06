import { defineConfig, devices } from '@playwright/test';

// Use port 3001 to avoid conflicts with other dev servers
const TEST_PORT = process.env.TEST_PORT || '3001';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${TEST_PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/setup/global-setup.ts',

  // Run tests sequentially for integration tests, parallel for unit tests
  fullyParallel: false,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Single worker in CI for predictability
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Global settings
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Action defaults
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Local dev server
  webServer: process.env.CI
    ? undefined
    : {
        command: `npm run dev -- -p ${TEST_PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120000,
        stdout: 'ignore',
        stderr: 'pipe',
      },

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
