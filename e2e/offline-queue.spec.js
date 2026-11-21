import { expect, test } from './support/fixtures.js';

const THREAD = '/forum/thread-seed-1';
const banner = (page) => page.getByRole('region', { name: 'Acciones sin conexión' });

async function openThread(page) {
  await page.goto(THREAD);
  await expect(page.getByText('Primer comentario del hilo')).toBeVisible();
}

async function comment(page, text) {
  // The box is cleared a moment after the previous comment is accepted; typing before that would lose the text.
  await expect(page.getByPlaceholder('Escribe un comentario')).toHaveValue('');
  await page.getByPlaceholder('Escribe un comentario').fill(text);
  await page.getByRole('button', { name: 'Publicar comentario' }).click();
}

const shown = (page, text) => page.locator('p', { hasText: new RegExp(`^${text}$`) });
const postsWith = (backend, text) => backend.state.posts.filter((p) => p.content === text);

test.describe('offline queue', () => {
  test('a comment written offline waits, then is sent exactly once when the connection returns', async ({ page, context, player }) => {
    await openThread(page);
    await context.setOffline(true);
    await expect(page.getByText(/^Sin conexión\./)).toBeVisible();

    await comment(page, 'Escrito sin internet');
    await expect(page.getByText(/se enviará automáticamente al recuperar internet/)).toBeVisible();
    await expect(banner(page)).toContainText('1 acción pendiente de enviar');
    await expect(shown(page, 'Escrito sin internet')).toBeVisible(); // shown as pending
    expect(player.calls('POST', '/posts')).toHaveLength(0);

    await context.setOffline(false);
    await expect(banner(page)).toBeHidden({ timeout: 15_000 });
    await expect(shown(page, 'Escrito sin internet')).toBeVisible();

    const sent = player.calls('POST', '/posts');
    expect(sent).toHaveLength(1);
    expect(sent[0].headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(postsWith(player, 'Escrito sin internet')).toHaveLength(1);
  });

  test('the queue survives closing and reopening the page', async ({ page, player }) => {
    await openThread(page);
    // The API is unreachable although the browser reports being online (captive portal, cold start…).
    player.dropNext('POST', '/posts', 50);
    await comment(page, 'Sobrevive a la recarga');
    await expect(banner(page)).toContainText('1 acción pendiente de enviar');

    await page.reload();
    await expect(banner(page)).toContainText('1 acción pendiente de enviar');
    await expect(shown(page, 'Sobrevive a la recarga')).toBeVisible();

    player.state.failures.length = 0; // the API is reachable again
    await banner(page).getByRole('button', { name: 'Ver detalles' }).click();
    await banner(page).getByRole('button', { name: 'Enviar ahora' }).click();
    await expect(banner(page)).toBeHidden({ timeout: 15_000 });
    expect(postsWith(player, 'Sobrevive a la recarga')).toHaveLength(1);
  });

  test('when the response is lost after the server handled the request, the retry does not duplicate it', async ({ page, player }) => {
    await openThread(page);
    player.loseResponseNext('POST', '/posts');
    await comment(page, 'La respuesta se perdió');
    await expect(banner(page)).toContainText('1 acción pendiente de enviar');
    // The server already saved it even though the browser never heard back.
    await expect.poll(() => postsWith(player, 'La respuesta se perdió').length).toBe(1);

    await banner(page).getByRole('button', { name: 'Ver detalles' }).click();
    await banner(page).getByRole('button', { name: 'Enviar ahora' }).click();
    await expect(banner(page)).toBeHidden({ timeout: 15_000 });

    const attempts = player.calls('POST', '/posts');
    expect(attempts).toHaveLength(2);
    expect(attempts[1].headers['idempotency-key']).toBe(attempts[0].headers['idempotency-key']);
    expect(attempts[1].replayed).toBe(true);
    expect(postsWith(player, 'La respuesta se perdió')).toHaveLength(1);
    await expect(shown(page, 'La respuesta se perdió')).toHaveCount(1);
  });

  test('an identical comment sent twice within seconds is sent only once', async ({ page, player }) => {
    await openThread(page);
    await comment(page, 'Mismo mensaje');
    await expect(shown(page, 'Mismo mensaje')).toBeVisible();
    await comment(page, 'Mismo mensaje');
    await page.waitForTimeout(800);
    expect(player.calls('POST', '/posts')).toHaveLength(1);
    expect(postsWith(player, 'Mismo mensaje')).toHaveLength(1);
  });

  test('a different comment right after is not mistaken for a duplicate', async ({ page, player }) => {
    await openThread(page);
    await comment(page, 'Primero');
    await expect(shown(page, 'Primero')).toBeVisible();
    await comment(page, 'Segundo');
    await expect(shown(page, 'Segundo')).toBeVisible();
    // A pending comment is drawn before its request leaves, so wait for the server to receive it.
    await expect.poll(() => player.calls('POST', '/posts').length).toBe(2);
  });

  test('queued comments are sent in the order they were written', async ({ page, context, player }) => {
    await openThread(page);
    await context.setOffline(true);
    for (const text of ['Uno', 'Dos', 'Tres']) {
      await comment(page, text);
      await expect(banner(page)).toBeVisible();
    }
    await expect(banner(page)).toContainText('3 acciones pendientes de enviar');
    await context.setOffline(false);
    await expect(banner(page)).toBeHidden({ timeout: 20_000 });
    expect(player.calls('POST', '/posts').map((r) => r.body.content)).toEqual(['Uno', 'Dos', 'Tres']);
  });

  test('a pending action can be discarded and is then never sent', async ({ page, context, player }) => {
    await openThread(page);
    await context.setOffline(true);
    await comment(page, 'Me arrepentí');
    await banner(page).getByRole('button', { name: 'Ver detalles' }).click();
    await banner(page).getByRole('button', { name: 'Descartar' }).click();
    await expect(banner(page)).toBeHidden();
    await context.setOffline(false);
    await page.waitForTimeout(1500);
    expect(player.calls('POST', '/posts')).toHaveLength(0);
  });

  test('an edit made on an old queue loses against a newer edit from another device', async ({ page, player }) => {
    await openThread(page);
    await comment(page, 'Texto original');
    await expect.poll(() => postsWith(player, 'Texto original').length).toBe(1);
    await expect(shown(page, 'Texto original')).toBeVisible();
    const [mine] = postsWith(player, 'Texto original');

    player.dropNext('PUT', `/posts/${mine.postId}`, 1);
    page.once('dialog', (dialog) => dialog.accept('Edición desde el teléfono'));
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(banner(page)).toContainText('1 acción pendiente de enviar');

    // Meanwhile another device saved a newer edit, so the server refuses this older one.
    player.markStale('PUT', `/posts/${mine.postId}`);
    await banner(page).getByRole('button', { name: 'Ver detalles' }).click();
    await banner(page).getByRole('button', { name: 'Enviar ahora' }).click();
    await expect(banner(page)).toContainText('superada', { timeout: 15_000 });
    await expect(banner(page).getByText(/más reciente, hecha desde otro dispositivo/)).toBeVisible();
    expect(player.state.posts.find((p) => p.postId === mine.postId).content).toBe('Texto original');

    // The player chooses to apply it anyway: it counts as a new edit with a fresh key.
    const staleAttempt = player.calls('PUT', `/posts/${mine.postId}`).at(-1);
    await banner(page).getByRole('button', { name: 'Aplicar de todos modos' }).click();
    await expect(banner(page)).toBeHidden({ timeout: 15_000 });
    const lastAttempt = player.calls('PUT', `/posts/${mine.postId}`).at(-1);
    expect(lastAttempt.headers['idempotency-key']).not.toBe(staleAttempt.headers['idempotency-key']);
    expect(player.state.posts.find((p) => p.postId === mine.postId).content).toBe('Edición desde el teléfono');
  });

  test('requests carry the moment the player acted, in server time', async ({ page, player }) => {
    player.state.clockOffsetSeconds = -3600; // the device clock is an hour ahead of the server
    await openThread(page);
    await comment(page, 'Primera para sincronizar el reloj');
    await expect(shown(page, 'Primera para sincronizar el reloj')).toBeVisible();
    await comment(page, 'Segunda con el reloj corregido');
    await expect.poll(() => player.calls('POST', '/posts').length).toBe(2);
    const [, second] = player.calls('POST', '/posts');
    const sent = Date.parse(second.headers['x-client-intent-at']);
    const serverNow = Date.now() - 3600 * 1000;
    expect(Math.abs(sent - serverNow)).toBeLessThan(10_000);
  });

  test('signing out with unsent actions asks first and discards them if confirmed', async ({ page, context, player }) => {
    await page.goto('/forum/thread-seed-1');
    await expect(page.getByText('Primer comentario del hilo')).toBeVisible();
    await context.setOffline(true);
    await comment(page, 'Sin enviar');
    await expect(banner(page)).toBeVisible();

    let message = '';
    page.once('dialog', (dialog) => { message = dialog.message(); void dialog.dismiss(); });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect.poll(() => message).toContain('1 acción sin enviar');
    await expect(page).toHaveURL(/\/forum\//);

    page.once('dialog', (dialog) => { void dialog.accept(); });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    expect(player.calls('POST', '/posts')).toHaveLength(0);
  });

  test('two open tabs send a queued action only once', async ({ context, page, player }) => {
    await openThread(page);
    const other = await context.newPage();
    await openThread(other);

    await context.setOffline(true);
    await comment(page, 'Pendiente en dos pestañas');
    await expect(banner(page)).toBeVisible();
    await context.setOffline(false);

    await expect(banner(page)).toBeHidden({ timeout: 20_000 });
    await expect(banner(other)).toBeHidden({ timeout: 20_000 });
    expect(player.calls('POST', '/posts')).toHaveLength(1);
    expect(postsWith(player, 'Pendiente en dos pestañas')).toHaveLength(1);
  });

  test('the offline notice appears and disappears with the connection', async ({ page, context, player }) => {
    void player;
    await page.goto('/app');
    await expect(page.getByText(/^Sin conexión\./)).toBeHidden();
    await context.setOffline(true);
    await expect(page.getByText(/^Sin conexión\./)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(/^Sin conexión\./)).toBeHidden();
  });

  test('a profile picture chosen offline is saved when the connection returns', async ({ page, context, player }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: PLAYERNAME })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Seleccionar silueta 3' }).click();
    await page.getByRole('button', { name: 'Guardar retrato' }).click();
    await expect(page.getByText(/se guardará al recuperar la conexión/)).toBeVisible();
    await context.setOffline(false);
    await expect.poll(() => player.calls('PATCH', '/users/me/profile-picture').length, { timeout: 15_000 }).toBe(1);
    expect(player.calls('PATCH', '/users/me/profile-picture')[0].body).toEqual({ profilePicture: '/avatars/avatar-3.svg' });
    await expect(banner(page)).toBeHidden();
  });
});

const PLAYERNAME = 'Alma_Heredera';
