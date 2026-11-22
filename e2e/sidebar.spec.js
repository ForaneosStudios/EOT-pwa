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
});
