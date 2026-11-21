import { ADMIN, PLAYER, expect, test } from './support/fixtures.js';
import { mockBackend } from './support/mockBackend.js';

const fillLogin = async (page, email, password) => {
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
};

test.describe('sign in', () => {
  test('a player signs in and lands on their codex', async ({ page, backend }) => {
    await page.goto('/login');
    await fillLogin(page, PLAYER.email, 'Secreta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(PLAYER.username).first()).toBeVisible();
    // The profile came from the API with the session's bearer token.
    await expect.poll(() => backend.calls('GET', '/users/me').length).toBeGreaterThan(0);
    expect(backend.calls('GET', '/users/me')[0].headers.authorization).toMatch(/^Bearer /);
  });

  test('wrong credentials show an error and keep the visitor on the form', async ({ page, backend }) => {
    void backend;
    await page.goto('/login');
    await fillLogin(page, PLAYER.email, 'Incorrecta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the form explains what is missing before calling the server', async ({ page, backend }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Introduce un correo válido.')).toBeVisible();
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
    expect(backend.calls()).toHaveLength(0);
  });

  test('the password can be revealed', async ({ page, backend }) => {
    void backend;
    await page.goto('/login');
    const password = page.getByLabel('Contraseña', { exact: true });
    await password.fill('Secreta1');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('signing in is blocked while offline', async ({ page, context, backend }) => {
    void backend;
    await page.goto('/login');
    await context.setOffline(true);
    await expect(page.getByText(/Sin conexión. Necesitas internet para iniciar sesión/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });

  test('links lead to account recovery and sign-up', async ({ page, backend }) => {
    void backend;
    await page.goto('/login');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe('session', () => {
  test('a signed-in player stays signed in after a reload and skips the login page', async ({ page, player }) => {
    void player;
    await page.goto('/app');
    await expect(page.getByText(PLAYER.username).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(PLAYER.username).first()).toBeVisible();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/app$/);
  });

  test('signing out returns to the landing and locks the private pages again', async ({ page, player }) => {
    void player;
    await page.goto('/app');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/forum');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('players cannot open the administration console, admins can', async ({ page, player }) => {
    void player;
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Administración/ })).toHaveCount(0);
  });

  test('administrators see the console and its menu entry', async ({ page, adminSession }) => {
    void adminSession;
    await page.goto('/app');
    await expect(page.getByRole('link', { name: /Administración/ })).toBeVisible();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Consejo de administración' })).toBeVisible();
    expect(ADMIN.role).toBe('ADMIN');
  });

  test('an expired session ends with a clear message instead of a broken page', async ({ page, context }) => {
    const backend = await mockBackend(context);
    await backend.signIn(PLAYER);
    await page.goto('/app');
    await expect(page.getByText(PLAYER.username).first()).toBeVisible();
    // The API now rejects every token, and the token refresh is rejected too.
    await context.route('http://api.test/api/v1/**', (route) => route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({ status: 401, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"code":"UNAUTHORIZED"}' }));
    await context.route('http://supabase.test/**', (route) => route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"code":"refresh_token_not_found","message":"Invalid Refresh Token"}' }));
    await page.getByRole('link', { name: /Logros/ }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Tu sesión terminó. Inicia sesión nuevamente.')).toBeVisible();
  });
});

test.describe('sign up', () => {
  const fillRegister = async (page, values = {}) => {
    const data = { 'Nombre de usuario': 'Nueva_Alma', 'Correo electrónico': 'nueva@example.com', 'Contraseña': 'Secreta1', 'Confirmar contraseña': 'Secreta1', ...values };
    for (const [label, value] of Object.entries(data)) await page.getByLabel(label, { exact: true }).fill(value);
  };

  test('validates each field as the player leaves it', async ({ page, backend }) => {
    await page.goto('/register');
    await page.getByLabel('Nombre de usuario').fill('abc');
    await page.getByLabel('Correo electrónico').click();
    await expect(page.getByText('Debe tener al menos 4 caracteres.')).toBeVisible();
    await page.getByLabel('Correo electrónico').fill('sin-arroba');
    await page.getByLabel('Contraseña', { exact: true }).click();
    await expect(page.getByText('Introduce un correo válido.')).toBeVisible();
    await page.getByLabel('Contraseña', { exact: true }).fill('corta');
    await page.getByLabel('Confirmar contraseña').click();
    await expect(page.getByText('Debe tener al menos 8 caracteres.')).toBeVisible();
    expect(backend.calls()).toHaveLength(0);
  });

  test('rejects a username that is already taken', async ({ page, context }) => {
    const backend = await mockBackend(context, { takenUsernames: ['Nueva_Alma'] });
    await page.goto('/register');
    await fillRegister(page);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Este nombre de usuario ya está en uso.')).toBeVisible();
    expect(backend.calls('GET', '/users/availability')).toHaveLength(1);
  });

  test('rejects passwords that do not match', async ({ page, backend }) => {
    void backend;
    await page.goto('/register');
    await fillRegister(page, { 'Confirmar contraseña': 'Distinta1' });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
  });

  test('creates the account and signs the new player in', async ({ page, backend }) => {
    await page.goto('/register');
    await fillRegister(page);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect.poll(() => backend.calls('GET', '/users/me').length).toBeGreaterThan(0);
  });
});
