import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/native-webmcp.spec.ts',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3012',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'pnpm start --port 3012',
        url: 'http://localhost:3012',
        reuseExistingServer: false,
        timeout: 120000,
      },
});
