import { expect, test } from './support/fixtures.js';

test.describe('public site', () => {
  test('landing presents the game and leads to sign-up and sign-in', async ({ page, backend }) => {
    void backend;
    await page.goto('/');
    await expect(page).toHaveTitle(/Echoes of the Throne/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El trono está vacío.');

    await page.getByRole('link', { name: 'Iniciar sesión' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('link', { name: /Volver a la portada/ }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Comenzar el viaje' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('every section of the landing is reachable from the menu', async ({ page }) => {
    await page.goto('/');
    for (const [name, id] of [['El mundo', 'mundo'], ['El proceso', 'proceso'], ['Comunidad', 'comunidad']]) {
      await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.05 });
    }
  });

  test('all landing images have alternative text and load', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Promise.all([...document.images].map((img) => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
    const broken = await page.evaluate(() => [...document.images].filter((img) => !img.hasAttribute('alt') || img.naturalWidth === 0).map((img) => img.src));
    expect(broken).toEqual([]);
  });

  test('unknown routes send visitors back to the landing', async ({ page }) => {
    await page.goto('/esta-ruta-no-existe');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El trono');
  });

  test('private pages require signing in and return the visitor to where they were going', async ({ page, backend }) => {
    void backend;
    await page.goto('/forum');
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Correo electrónico').fill('alma@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Secreta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/forum$/);
    await expect(page.getByRole('heading', { name: 'El Consejo de las Almas' })).toBeVisible();
  });

  for (const path of ['/app', '/achievements', '/chronicles', '/archive', '/forum', '/profile', '/admin']) {
    test(`${path} is not reachable without a session`, async ({ page, backend }) => {
      void backend;
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});
