import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../..');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: path.join(configDir, 'test-results'),
  reporter: [['html', { open: 'never', outputFolder: path.join(configDir, 'playwright-report') }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome locally to avoid 200MB download; CI uses bundled Chromium
        ...(process.env.E2E_USE_SYSTEM_CHROME ? { channel: 'chrome' as const } : {}),
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          env: {
            ...process.env,
            VITE_AUTH_MODE: 'local',
          },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `bash ${path.join(repoRoot, 'scripts/dev/run-e2e-backend-dev.sh')}`,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            LOCALSTACK_ENDPOINT: 'http://localhost:4566',
            ENABLE_E2E_SEED: 'true',
          },
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
