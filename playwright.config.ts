import { defineConfig, devices } from '@playwright/test';

/**
 * The critical user-flow specs run on all three engines (Chromium, Firefox,
 * WebKit). The broader page specs (smoke, docs) that use Chromium-only
 * capabilities (e.g. clipboard permission grants) run on Chromium only.
 */
const CRITICAL_FLOWS =
  /(auth|payments|settlement|settings|navigation|transactions|responsive|accessibility)\.spec\.ts$/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Chromium runs the entire suite (including smoke/docs).
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit validate the critical flows cross-browser.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: CRITICAL_FLOWS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: CRITICAL_FLOWS,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Point the API client at the same origin so route mocks are same-origin
    // (no CORS) and payment-link URLs resolve to the running app.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    },
  },
});
