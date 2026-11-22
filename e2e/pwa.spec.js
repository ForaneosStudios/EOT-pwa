import { expect, test } from './support/fixtures.js';
import { API_URL, SUPABASE_URL } from '../playwright.config.js';

// The service worker is switched back on here; everything else runs with it blocked.
test.use({ serviceWorkers: 'allow' });

test.describe('installable PWA', () => {
  test('publishes a valid web app manifest with installable icons', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const response = await request.get(new URL(href, page.url()).toString());
    expect(response.ok()).toBe(true);
    const manifest = await response.json();

    expect(manifest).toMatchObject({ name: 'Echoes of the Throne', short_name: 'EOT', display: 'standalone', lang: 'es' });
    expect(manifest.theme_color).toMatch(/^#/);
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of manifest.icons) {
      const file = await request.get(new URL(icon.src, page.url()).toString());
      expect(file.ok(), `${icon.src} should be served`).toBe(true);
      expect(file.headers()['content-type']).toContain('image/png');
    }
  });

  test('declares the mobile viewport and theme colour', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0C0808');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('registers a service worker that controls the app', async ({ page }) => {
    await page.goto('/');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  });

  test('precaches the app shell so it opens without a connection', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); // the worker now controls the page and the shell is cached
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).length))).reduce((a, b) => a + b, 0));
    expect(cached).toBeGreaterThan(5);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El trono está vacío.');
    await expect(page.getByText(/^Sin conexión\./)).toBeVisible();

    // Navigating inside the app also works from the cache.
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Regreso del Heredero' })).toBeVisible();
    await context.setOffline(false);
  });

  test('keeps the session and the last saved data after reloading without a connection', async ({ page, context, player }) => {
    void player;
    await page.goto('/forum');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); // the worker now controls the page; the forum read is saved on the device
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await expect(page.getByRole('link', { name: /Bienvenidos al Consejo/ })).toBeVisible();

    // Offline: the API and Supabase are unreachable (mocked routes would otherwise still answer).
    await context.setOffline(true);
    await context.route(`${new URL(API_URL).origin}/**`, (route) => route.abort('internetdisconnected'));
    await context.route(`${new URL(SUPABASE_URL).origin}/**`, (route) => route.abort('internetdisconnected'));
    await page.reload();
    await expect(page).toHaveURL(/\/forum$/); // still signed in, not sent to the login form
    await expect(page.getByRole('link', { name: /Bienvenidos al Consejo/ })).toBeVisible();
    await expect(page.getByText(/Mostrando datos guardados en este dispositivo/)).toBeVisible();
    await context.setOffline(false);
  });

  test('never caches API responses in the service worker, so another account can never see someone else’s data', async ({ page, player }) => {
    void player;
    await page.goto('/forum');
    await expect(page.getByRole('link', { name: /Bienvenidos al Consejo/ })).toBeVisible();
    const cachedApi = await page.evaluate(async () => {
      const urls = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(request.url);
      return urls.filter((url) => url.includes('/api/v1/'));
    });
    expect(cachedApi).toEqual([]);
  });
});
