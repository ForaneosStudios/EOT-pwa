import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright-core';

const port = 4317;
const baseURL = `http://127.0.0.1:${port}`;
const candidates = [
  process.env.PWA_TEST_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
].filter(Boolean);

async function waitForServer(processHandle) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error('El servidor de vista previa terminó antes de iniciarse.');
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch { /* The server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('No se pudo iniciar el servidor de vista previa.');
}

test('the cached app shell loads offline and reports reconnection', { timeout: 30000 }, async () => {
  const executablePath = candidates.find((path) => existsSync(path));
  assert.ok(executablePath, 'Instala Chrome o define PWA_TEST_BROWSER con la ruta al navegador.');
  assert.ok(existsSync('dist/index.html'), 'Ejecuta npm run build antes de npm run test:pwa.');
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext();
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/login`);
    const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href');
    assert.ok(manifestPath);
    const manifestResponse = await context.request.get(new URL(manifestPath, baseURL).href);
    assert.equal(manifestResponse.status(), 200);
    const manifest = await manifestResponse.json();
    for (const icon of manifest.icons) {
      const response = await context.request.get(new URL(icon.src, baseURL).href);
      assert.equal(response.status(), 200, `No se pudo cargar el icono ${icon.src}`);
      assert.match(response.headers()['content-type'], /^image\/png/);
    }
    assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
    assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    assert.equal(await page.locator('input[type="email"]').count(), 1);
    await context.setOffline(true);
    await page.reload();
    const offlineNotice = page.getByText('Sin conexión. Algunas funciones y datos necesitan internet.', { exact: true });
    await offlineNotice.waitFor();
    assert.equal(await page.locator('input[type="email"]').count(), 1);
    await context.setOffline(false);
    await offlineNotice.waitFor({ state: 'hidden' });
    await context.close();
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
});
