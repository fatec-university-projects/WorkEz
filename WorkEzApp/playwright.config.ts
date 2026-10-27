import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração Playwright para o WorkEzApp (Expo Web).
 * Emula dispositivo móvel com resolução moderna (iPhone 14 / Pixel 7).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8081',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
