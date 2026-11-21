import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/apiClient.js';
import { healthUrl, outbox, probeApi, sendMutation, startOutbox } from '../src/services/offline/index.js';
import { adminMutations, forumMutations, profileMutations } from '../src/services/mutations.js';
import { createDefaultStorage, createIndexedDbStorage } from '../src/services/offline/storage.js';
import { OUTBOX_STATUS_LABELS, canRetry, outboxErrorMessage, retryLabel } from '../src/services/offline/messages.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn(), request: vi.fn(), defaults: { baseURL: 'https://api.example.com/api/v1' } },
}));

afterEach(() => vi.restoreAllMocks());

describe('offline index', () => {
  it('derives the health endpoint from the API base URL', () => {
    expect(healthUrl('https://api.example.com/api/v1')).toBe('https://api.example.com/actuator/health');
    expect(healthUrl('https://api.example.com/api/v1/')).toBe('https://api.example.com/actuator/health');
    expect(healthUrl('https://host.test/backend/api/v2')).toBe('https://host.test/backend/actuator/health');
    expect(healthUrl()).toBe('https://api.example.com/actuator/health');
  });

  it('treats any answer below 500 as a reachable API', async () => {
    apiClient.get.mockResolvedValueOnce({ status: 200 });
    expect(await probeApi()).toBe(true);
    apiClient.get.mockRejectedValueOnce({ response: { status: 401 } });
    expect(await probeApi()).toBe(true);
    apiClient.get.mockRejectedValueOnce({ response: { status: 503 } });
    expect(await probeApi()).toBe(false);
    apiClient.get.mockRejectedValueOnce(new Error('Network Error'));
    expect(await probeApi()).toBe(false);
  });

  it('drains on reconnect and when the tab becomes visible, once', () => {
    const drain = vi.spyOn(outbox, 'drain').mockResolvedValue();
    const stop = startOutbox();
    expect(startOutbox()).toBeTypeOf('function'); // Second call is a no-op.
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(drain).toHaveBeenCalledTimes(2);
    stop();
    window.dispatchEvent(new Event('online'));
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it('sends mutations through the shared outbox', async () => {
    const send = vi.spyOn(outbox, 'send').mockResolvedValue({ status: 'sent' });
    await sendMutation({ method: 'POST', url: '/x' });
    expect(send).toHaveBeenCalledWith({ method: 'POST', url: '/x' });
  });
});

describe('mutations', () => {
  it('maps every write to its method, URL, body and metadata', async () => {
    const send = vi.spyOn(outbox, 'send').mockResolvedValue({ status: 'sent' });
    await forumMutations.createThread({ userId: 'u', title: 'T', content: 'C' });
    await forumMutations.updateThread('t1', { title: 'T', content: 'C' });
    await forumMutations.deleteThread('t1', 'T');
    await forumMutations.lockThread('t1', true);
    await forumMutations.lockThread('t1', false);
    await forumMutations.createPost({ threadId: 't1', userId: 'u', content: 'C' });
    await forumMutations.createPost({ threadId: 't1', userId: 'u', content: 'C', parentPostId: 'p1' });
    await forumMutations.updatePost('p1', 'C', 't1');
    await forumMutations.deletePost('p1', 't1');
    await forumMutations.reportPost('p1', 'spam', 't1');
    await adminMutations.deleteUser({ userId: 'u2', username: 'Kai' });
    await adminMutations.deleteThread({ threadId: 't1', title: 'T' });
    await adminMutations.lockThread({ threadId: 't1' }, true);
    await adminMutations.createAchievement({ achName: 'A' });
    await adminMutations.createCategory({ categoryName: 'C' });
    await adminMutations.deleteCategory({ categoryId: 'c1', categoryName: 'C' });
    await profileMutations.updateAvatar('/avatars/avatar-1.svg');

    const calls = send.mock.calls.map(([m]) => `${m.method} ${m.url} ${m.meta.kind}`);
    expect(calls).toEqual([
      'POST /threads thread:create', 'PUT /threads/t1 thread:update', 'DELETE /threads/t1 thread:delete',
      'PATCH /threads/t1/lock thread:lock', 'PATCH /threads/t1/lock thread:lock', 'POST /posts post:create',
      'POST /posts post:create', 'PUT /posts/p1 post:update', 'DELETE /posts/p1 post:delete',
      'POST /posts/p1/reports post:report', 'DELETE /users/u2 admin:user:delete', 'DELETE /threads/t1 thread:delete',
      'PATCH /threads/t1/lock thread:lock', 'POST /achievements admin:achievement:create',
      'POST /categories admin:category:create', 'DELETE /categories/c1 admin:category:delete',
      'PATCH /users/me/profile-picture profile:avatar',
    ]);
    expect(send.mock.calls[6][0].label).toBe('Responder comentario');
    expect(send.mock.calls[4][0].label).toBe('Reabrir conversación');
  });
});

describe('IndexedDB storage', () => {
  it('stores, lists and removes items across instances', async () => {
    const first = createIndexedDbStorage();
    await first.put({ id: 'a', value: 1 });
    await first.put({ id: 'b', value: 2 });
    const second = createIndexedDbStorage();
    expect((await second.all()).map((item) => item.id).sort((x, y) => x.localeCompare(y))).toEqual(['a', 'b']);
    await second.remove('a');
    expect(await first.all()).toEqual([{ id: 'b', value: 2 }]);
    await second.remove('b');
  });

  it('uses IndexedDB by default and reports its kind', async () => {
    const storage = createDefaultStorage();
    await storage.put({ id: 'c' });
    expect(storage.kind).toBe('indexeddb');
    expect(await storage.all()).toEqual([{ id: 'c' }]);
    await storage.remove('c');
  });

  it('falls back to memory without IndexedDB', async () => {
    const storage = createDefaultStorage(null);
    await storage.put({ id: 'm' });
    expect(storage.kind).toBe('memory');
    await storage.remove('m');
    expect(await storage.all()).toEqual([]);
  });

  it('switches to memory when an IndexedDB request fails', async () => {
    const failing = { open: () => { const request = {}; queueMicrotask(() => { request.error = new Error('denied'); request.onerror(); }); return request; } };
    const storage = createDefaultStorage(failing);
    await storage.put({ id: 'x' });
    expect(storage.kind).toBe('memory');
    expect(await storage.all()).toEqual([{ id: 'x' }]);
  });
});

describe('outbox messages', () => {
  it('explains every kind of outcome', () => {
    expect(outboxErrorMessage(null)).toBe('');
    expect(outboxErrorMessage({ code: 'STALE_WRITE' })).toMatch(/más reciente/);
    expect(outboxErrorMessage({ status: 409, message: 'Hilo cerrado' })).toBe('Hilo cerrado');
    expect(outboxErrorMessage({ status: null })).toBe('Sin conexión con el servidor.');
    expect(outboxErrorMessage({ status: 404 })).toBe('El recurso ya no existe.');
    expect(outboxErrorMessage({ status: 418 })).toBe('Error del servidor (418).');
    expect(retryLabel({ status: 'superseded' })).toBe('Aplicar de todos modos');
    expect(retryLabel({ status: 'failed' })).toBe('Reintentar');
    expect(canRetry({ status: 'queued' })).toBe(false);
    expect(OUTBOX_STATUS_LABELS.superseded).toMatch(/Superada/);
  });
});
