import { expect, test as base } from '@playwright/test';
import { ADMIN, PLAYER, mockBackend } from './mockBackend.js';

export { ADMIN, PLAYER, expect };

/**
 * `backend`: the network mock, no session yet (for sign-in flows).
 * `player`: the same mock with a signed-in player already in the browser.
 * `adminSession`: the same mock with a signed-in administrator.
 */
export const test = base.extend({
  backend: async ({ context }, provide) => { await provide(await mockBackend(context)); },
  player: async ({ context }, provide) => {
    const backend = await mockBackend(context);
    await backend.signIn(PLAYER);
    await provide(backend);
  },
  adminSession: async ({ context }, provide) => {
    const backend = await mockBackend(context, { user: ADMIN });
    await backend.signIn(ADMIN);
    await provide(backend);
  },
});
