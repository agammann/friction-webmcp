import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/native-webmcp.spec.ts',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.FRICTION_WEBMCP_URL || 'http://localhost:3017',
    channel: process.env.FRICTION_WEBMCP_CHANNEL || 'chrome',
    launchOptions: {
      args: ['--enable-features=WebMCP'],
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
    },
    trace: 'retain-on-failure',
  },
  webServer: process.env.FRICTION_WEBMCP_URL
    ? undefined
    : {
        command: 'pnpm start --port 3017',
        url: 'http://localhost:3017',
        reuseExistingServer: false,
        timeout: 120000,
      },
});
