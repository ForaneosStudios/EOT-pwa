import { PLAYER, expect, test } from './support/fixtures.js';

const newTopic = async (page, title, content) => {
  await page.getByRole('button', { name: '+ Nuevo tema' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Título/).fill(title);
  await dialog.getByLabel(/Mensaje/).fill(content);
  await dialog.getByRole('button', { name: 'Publicar tema' }).click();
};

test.describe('forum', () => {
  test('lists threads and opens one with its comments', async ({ page, player }) => {
    void player;
    await page.goto('/forum');
    await expect(page.getByRole('link', { name: /Bienvenidos al Consejo/ })).toBeVisible();
    await page.getByRole('link', { name: /Bienvenidos al Consejo/ }).click();
    await expect(page).toHaveURL(/\/forum\/thread-seed-1$/);
    await expect(page.getByRole('heading', { name: 'Bienvenidos al Consejo' })).toBeVisible();
    await expect(page.getByText('Primer comentario del hilo')).toBeVisible();
    await page.getByRole('link', { name: /Volver al foro/ }).click();
    await expect(page).toHaveURL(/\/forum$/);
  });

  test('a player starts a new topic and sees it listed', async ({ page, player }) => {
    await page.goto('/forum');
    await newTopic(page, 'Teorías sobre el trono vacío', 'Creo que el último rey nunca murió.');
    await expect(page.getByRole('link', { name: /Teorías sobre el trono vacío/ })).toBeVisible();
    const [post] = player.calls('POST', '/threads');
    expect(post.body).toMatchObject({ userId: PLAYER.userId, title: 'Teorías sobre el trono vacío', content: 'Creo que el último rey nunca murió.' });
    expect(post.headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(post.headers['x-client-intent-at']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('the topic form validates lengths before sending', async ({ page, player }) => {
    await page.goto('/forum');
    await page.getByRole('button', { name: '+ Nuevo tema' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Título/).fill('corto');
    await dialog.getByLabel(/Mensaje/).fill('muy corto');
    await expect(dialog.getByRole('button', { name: 'Publicar tema' })).toBeDisabled();
    await dialog.getByLabel(/Mensaje/).fill('Ahora sí tiene el largo suficiente.');
    await expect(dialog.getByRole('button', { name: 'Publicar tema' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
    expect(player.calls('POST', '/threads')).toHaveLength(0);
  });

  test('a player comments, edits and deletes their own comment', async ({ page, player }) => {
    await page.goto('/forum/thread-seed-1');
    await page.getByPlaceholder('Escribe un comentario').fill('Mi primera teoría');
    await page.getByRole('button', { name: 'Publicar comentario' }).click();
    await expect(page.locator('p', { hasText: /^Mi primera teoría$/ })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept('Mi teoría corregida'));
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.locator('p', { hasText: /^Mi teoría corregida$/ })).toBeVisible();
    await expect(page.getByText('Mi primera teoría')).toHaveCount(0);

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Mi teoría corregida')).toHaveCount(0);
    expect(player.calls().some((r) => r.method === 'DELETE' && r.path.startsWith('/posts/'))).toBe(true);
  });

  test('a player reports another player’s comment', async ({ page, player }) => {
    await page.goto('/forum/thread-seed-1');
    page.once('dialog', (dialog) => dialog.accept('Es spam'));
    await page.getByRole('button', { name: 'Reportar' }).click();
    await expect(page.getByText('Reporte enviado.')).toBeVisible();
    const [report] = player.calls('POST', '/posts/post-seed-1/reports');
    expect(report.body).toEqual({ reason: 'Es spam' });
    expect(report.headers['idempotency-key']).toBeTruthy();
  });

  test('the thread owner sees moderation actions, other players do not', async ({ page, player }) => {
    await page.goto('/forum/thread-seed-1');
    await expect(page.getByRole('button', { name: 'Eliminar tema' })).toHaveCount(0);

    await page.goto('/forum');
    await newTopic(page, 'Un hilo que es mío', 'Contenido del hilo propio para moderar.');
    await page.getByRole('link', { name: /Un hilo que es mío/ }).click();
    await expect(page.getByRole('button', { name: 'Cerrar conversación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar tema' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar tema' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar tema' }).click();
    await expect(page).toHaveURL(/\/forum$/);
    await expect(page.getByRole('link', { name: /Un hilo que es mío/ })).toHaveCount(0);
    expect(player.calls().some((r) => r.method === 'DELETE' && r.path.startsWith('/threads/'))).toBe(true);
  });

  test('a missing thread shows an error instead of a blank page', async ({ page, player }) => {
    void player;
    await page.goto('/forum/no-existe');
    await expect(page.getByRole('alert')).toContainText(/Hilo no encontrado|No se pudo cargar el hilo/);
  });
});
