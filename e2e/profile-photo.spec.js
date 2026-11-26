import { expect, test } from './support/fixtures.js';

// The browser runs with a fake camera (see playwright.config.js), so the real getUserMedia flow is tested.
test.use({ permissions: ['camera'] });

async function openCameraDialog(page) {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Tomar foto con la cámara' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('profile photo with the camera', () => {
  test('takes a photo, shows a preview and saves it once with the consent', async ({ page, player }) => {
    await openCameraDialog(page);
    // Nothing can start before the consent is given.
    await expect(page.getByRole('button', { name: 'Abrir cámara' })).toBeDisabled();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Abrir cámara' }).click();

    const live = page.getByLabel('Vista de la cámara');
    await expect(live).toBeVisible();
    await expect.poll(() => live.evaluate((video) => video.videoWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Tomar foto', exact: true }).click();
    await expect(page.getByAltText('Vista previa de tu foto de perfil')).toBeVisible();

    await page.getByRole('button', { name: 'Usar esta foto' }).click();
    await expect(page.getByText('Foto de perfil actualizada.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();

    const sent = player.calls('PUT', '/users/me/profile-photo');
    expect(sent).toHaveLength(1);
    expect(sent[0].body.consent).toBe(true);
    expect(sent[0].body.image).toMatch(/^data:image\/jpeg;base64,/);
    expect(sent[0].body.image.length).toBeLessThan(200_000); // small enough for the offline queue and idempotency limit
    expect(sent[0].headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.getByRole('button', { name: 'Quitar mi foto' })).toBeVisible();
  });

  test('switches the camera off when the dialog is cancelled', async ({ page, player }) => {
    void player;
    await openCameraDialog(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Abrir cámara' }).click();
    await expect(page.getByLabel('Vista de la cámara')).toBeVisible();
    const tracksBefore = await page.evaluate(() => document.querySelector('video').srcObject.getTracks().map((track) => track.readyState));
    expect(tracksBefore).toContain('live');
    await page.evaluate(() => { window.__tracks = document.querySelector('video').srcObject.getTracks(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await page.evaluate(() => window.__tracks.map((track) => track.readyState))).toEqual(['ended']);
  });

  test('explains a denied camera and still lets the player pick a file', async ({ page, context, player }) => {
    void player;
    await context.clearPermissions();
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    });
    await openCameraDialog(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Abrir cámara' }).click();
    await expect(page.getByRole('alert')).toContainText('No diste permiso para usar la cámara');
    await expect(page.getByLabel(/Elegir una foto/)).toBeEnabled();
  });

  test('a photo taken offline waits in the queue and is sent when the connection returns', async ({ page, context, player }) => {
    await openCameraDialog(page);
    await context.setOffline(true);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Abrir cámara' }).click();
    await expect.poll(() => page.getByLabel('Vista de la cámara').evaluate((video) => video.videoWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Tomar foto', exact: true }).click();
    await page.getByRole('button', { name: 'Usar esta foto' }).click();
    await expect(page.getByText(/Tu foto se guardará al recuperar la conexión/)).toBeVisible();
    expect(player.calls('PUT', '/users/me/profile-photo')).toHaveLength(0);

    await context.setOffline(false);
    await expect.poll(() => player.calls('PUT', '/users/me/profile-photo').length, { timeout: 20_000 }).toBe(1);
    await expect(page.getByRole('button', { name: 'Quitar mi foto' })).toBeVisible({ timeout: 20_000 });
  });

  test('removes the photo', async ({ page, player }) => {
    player.state.user = { ...player.state.user, profilePicture: 'https://storage.test/profile-photos/me.jpg?v=1' };
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Quitar mi foto' }).click();
    await expect(page.getByText('Tu foto se quitó.')).toBeVisible();
    expect(player.calls('DELETE', '/users/me/profile-photo')).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'Quitar mi foto' })).toBeHidden();
  });
});
