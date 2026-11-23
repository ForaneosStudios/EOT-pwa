import { expect, test } from './support/fixtures.js';

// Desktop: the collapse button sits on the sidebar's right edge, not on the edge of the window.
test.describe('desktop sidebar', () => {
  test('the collapse button stays on the sidebar border, expanded and collapsed', async ({ page, player }) => {
    void player;
    await page.goto('/achievements');
    const sidebar = page.locator('aside').first();
    const toggle = page.getByRole('button', { name: 'Contraer navegación' });
    await expect(toggle).toBeVisible();

    const onBorder = async (button) => {
      const aside = await sidebar.boundingBox();
      const box = await button.boundingBox();
      const center = box.x + box.width / 2;
      expect(Math.abs(center - (aside.x + aside.width))).toBeLessThanOrEqual(box.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    };

    await onBorder(toggle);
    await toggle.click();
    const expand = page.getByRole('button', { name: 'Expandir navegación' });
    await expect(expand).toBeVisible();
    await expect.poll(async () => (await sidebar.boundingBox()).width).toBeLessThan(100);
    await onBorder(expand);
  });

  test('the sidebar fills the screen and stays in place while the page scrolls', async ({ page, player }) => {
    void player;
    await page.goto('/app');
    const sidebar = page.locator('aside').first();
    const height = page.viewportSize().height;
    await expect.poll(async () => Math.round((await sidebar.boundingBox()).height)).toBe(height);
    await expect(page.getByText('El legado permanece')).toBeInViewport();

    await page.mouse.wheel(0, 2000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(Math.round((await sidebar.boundingBox()).y)).toBe(0);
    await expect(page.getByText('El legado permanece')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Contraer navegación' })).toBeInViewport();
  });
});
