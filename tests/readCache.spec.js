import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { OWNER_KEY, createReadCache, readKey, staleData } from '../src/services/offline/readCache.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
}

describe('read cache', () => {
  it('builds the same key whatever the parameter order, skipping empty values', () => {
    expect(readKey('/threads/search', { size: 10, page: 0, title: undefined })).toBe('/threads/search?page=0&size=10');
    expect(readKey('/threads/search', { page: 0, size: 10 })).toBe('/threads/search?page=0&size=10');
    expect(readKey('/users/me')).toBe('/users/me');
  });

  it.each([
    ['IndexedDB', () => new IDBFactory()],
    ['memory', () => undefined],
  ])('stores reads per account and wipes them for another account or on sign-out (%s)', async (_name, idb) => {
    const storage = memoryStorage();
    const cache = createReadCache({ idb: idb(), storage, now: () => 1000 });

    expect(await cache.get('alice', '/users/me')).toBeNull();
    await cache.put(null, '/users/me', { username: 'nobody' });
    expect(cache.owner()).toBeNull();

    await cache.put('alice', '/user-achievements/me', [{ achId: 'a' }]);
    expect(cache.owner()).toBe('alice');
    expect(await cache.get('alice', '/user-achievements/me')).toEqual({ key: '/user-achievements/me', data: [{ achId: 'a' }], savedAt: 1000 });
    expect(await cache.get('bob', '/user-achievements/me')).toBeNull();

    await cache.put('bob', '/users/me', { username: 'bob' });
    expect(storage.getItem(OWNER_KEY)).toBe('bob');
    expect(await cache.get('bob', '/user-achievements/me')).toBeNull();

    await cache.clear();
    expect(cache.owner()).toBeNull();
    expect(await cache.get('bob', '/users/me')).toBeNull();
  });

  it('keeps working in memory when IndexedDB fails', async () => {
    const broken = { open: () => { throw new Error('quota'); } };
    const cache = createReadCache({ idb: broken, storage: memoryStorage() });
    await cache.put('alice', '/users/me', { username: 'alice' });
    expect((await cache.get('alice', '/users/me')).data).toEqual({ username: 'alice' });
  });

  it('tolerates unavailable localStorage', async () => {
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
    const cache = createReadCache({ idb: undefined, storage: throwing });
    await cache.put('alice', '/users/me', {});
    expect(cache.owner()).toBeNull();
    await expect(cache.clear()).resolves.toBeUndefined();
  });

  it('reports the oldest saved data on screen until fresh data arrives', () => {
    const listener = vi.fn();
    const unsubscribe = staleData.subscribe(listener);
    staleData.markStale(2000);
    staleData.markStale(3000);
    staleData.markStale(1500);
    expect(staleData.getSnapshot()).toBe(1500);
    staleData.markFresh();
    staleData.markFresh();
    expect(staleData.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
