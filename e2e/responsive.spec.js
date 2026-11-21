import { expect, test } from './support/fixtures.js';

// Runs in the "mobile" project (Pixel 7). These guard the fixes that make the app usable on a phone.
const horizontalOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const tooSmall = (page, selector) => page.evaluate((query) => [...document.querySelectorAll(query)]
  .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && getComputedStyle(el).visibility !== 'hidden' && (b.height < 39.5 || b.width < 39.5); })
  .map((el) => `${el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`), selector);

test.describe('phone layout', () => {
  test('the landing does not scroll sideways and keeps sign-in reachable', async ({ page }) => {
    await page.goto('/');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' }).first()).toBeVisible();
  });

  test('landing buttons and links are large enough to tap', async ({ page }) => {
    await page.goto('/');
    expect(await tooSmall(page, 'a, button')).toEqual([]);
  });

  test('the back-to-top button is large enough to tap and never clipped', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('link', { name: 'Volver al inicio' });
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(43);
    expect(box.height).toBeGreaterThanOrEqual(43);
  });

  test('the world banner keeps its proportions so its lettering is not cropped', async ({ page }) => {
    await page.goto('/');
    const ratio = await page.evaluate(() => {
      const img = document.querySelector('.public-world-banner img');
      const box = img.getBoundingClientRect();
      return { shown: box.width / box.height, natural: img.naturalWidth / img.naturalHeight };
    });
    expect(Math.abs(ratio.shown - ratio.natural)).toBeLessThan(0.05);
  });

  test('sign-in and sign-up forms fit, use 16px fields and have large touch targets', async ({ page, backend }) => {
    void backend;
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const sizes = await page.evaluate(() => [...new Set([...document.querySelectorAll('input')].map((i) => getComputedStyle(i).fontSize))]);
      expect(sizes).toEqual(['16px']);
      expect(await tooSmall(page, 'a, button, input')).toEqual([]);
    }
  });

  test('the menu opens as a full-screen dialog, navigates and closes', async ({ page, player }) => {
    void player;
    await page.goto('/app');
    await page.getByRole('button', { name: 'Abrir navegación' }).click();
    const menu = page.getByRole('dialog', { name: 'Navegación principal' });
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: /Foro/ }).click();
    await expect(page).toHaveURL(/\/forum$/);
    await expect(menu).toBeHidden();
  });

  test('the forum filter bar does not stay pinned over a small screen', async ({ page, player }) => {
    void player;
    await page.goto('/forum');
    await expect(page.getByRole('link', { name: /Bienvenidos al Consejo/ })).toBeVisible();
    const position = await page.locator('.forum-filter-bar').evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('static');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('the new-topic dialog scrolls when the keyboard leaves little room', async ({ page, player }) => {
    void player;
    await page.goto('/forum');
    await page.setViewportSize({ width: 740, height: 300 }); // a phone in landscape with the keyboard open
    await page.getByRole('button', { name: '+ Nuevo tema' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Publicar tema' }).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button', { name: 'Publicar tema' })).toBeInViewport();
    await expect(dialog.getByLabel(/Título/)).toBeAttached();
  });

  test('the thread owner’s actions wrap instead of overflowing', async ({ page, player }) => {
    await page.goto('/forum');
    await page.getByRole('button', { name: '+ Nuevo tema' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Título/).fill('Hilo con muchas acciones');
    await dialog.getByLabel(/Mensaje/).fill('Para comprobar que los botones caben en pantalla.');
    await dialog.getByRole('button', { name: 'Publicar tema' }).click();
    await page.getByRole('link', { name: /Hilo con muchas acciones/ }).click();
    await expect(page.getByRole('button', { name: 'Revisar reportes' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(player.calls('POST', '/threads')).toHaveLength(1);
  });

  test('the pending-actions banner stays inside the screen with its buttons usable', async ({ page, context, player }) => {
    void player;
    await page.goto('/forum/thread-seed-1');
    await expect(page.getByText('Primer comentario del hilo')).toBeVisible();
    await context.setOffline(true);
    await page.getByPlaceholder('Escribe un comentario').fill('Desde el teléfono');
    await page.getByRole('button', { name: 'Publicar comentario' }).click();
    const banner = page.getByRole('region', { name: 'Acciones sin conexión' });
    await banner.getByRole('button', { name: 'Ver detalles' }).click();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const small = await banner.getByRole('button').evaluateAll((buttons) => buttons.filter((b) => b.getBoundingClientRect().height < 39.5).map((b) => b.textContent));
    expect(small).toEqual([]);
  });
});
