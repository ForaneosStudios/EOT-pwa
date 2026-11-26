import { defineConfig, devices } from '@playwright/test';

// The app is built and served in production mode, so the service worker and the manifest are real.
// Supabase and the backend never leave the machine: e2e/support/mockBackend.js answers their
// requests inside the browser. These fake origins only need to be recognisable.
export const SUPABASE_URL = 'http://supabase.test';
export const API_URL = 'http://api.test/api/v1';
const PORT = 3000;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-MX',
    // The mock answers requests itself; a service worker would hide them from it.
    // The PWA specs turn it back on explicitly.
    serviceWorkers: 'block',
    // Chromium's fake camera lets the profile-photo flow run for real, without hardware.
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive.spec.js/ },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /responsive\.spec\.js|mobile\..*\.spec\.js/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e',
      VITE_API_BASE_URL: API_URL,
    },
  },
});
