import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrefetcher, prefetchForOffline, prefetchRequests } from '../src/services/offline/prefetch.js';

vi.mock('../src/services/apiClient.js', () => ({ apiClient: { get: vi.fn() } }));

afterEach(() => vi.restoreAllMocks());

const player = { userId: 'u1', role: 'USER' };
const admin = { userId: 'a1', role: 'ADMIN' };

function fakeClient(threads = [{ threadId: 't1' }, { threadId: 't2' }]) {
  return {
    get: vi.fn((url) => {
      if (url === '/leaderboard') return Promise.reject(new Error('down'));
      if (url === '/threads/search') return Promise.resolve({ data: { content: threads } });
      return Promise.resolve({ data: {} });
    }),
  };
}

describe('offline prefetch', () => {
  it('requests the reads every screen uses, with the same parameters as the pages', () => {
    const urls = prefetchRequests(player);
    expect(urls).toContainEqual(['/user-achievements/me']);
    expect(urls).toContainEqual(['/leaderboard', { limit: 10 }]);
    expect(urls).toContainEqual(['/threads/search', { page: 0, size: 10 }]);
    expect(urls).toContainEqual(['/threads/search', { page: 0, size: 10, participantId: 'u1' }]);
    expect(urls.some(([url]) => url === '/users')).toBe(false);
    expect(prefetchRequests(admin)).toEqual(expect.arrayContaining([['/users'], ['/achievements', { includeHidden: true }], ['/categories']]));
  });

  it('also loads each thread of the first forum page and ignores failures', async () => {
    const client = fakeClient();
    const ok = await prefetchForOffline(player, { client });
    expect(client.get).toHaveBeenCalledWith('/threads/t1', undefined);
    expect(client.get).toHaveBeenCalledWith('/posts/page', { params: { threadId: 't2', page: 0, size: 10 } });
    // 6 base reads (one fails) + 2 threads × 2 reads.
    expect(ok).toBe(9);
  });

  it('does nothing without a user or without connection, and skips details served from the device', async () => {
    const client = fakeClient();
    expect(await prefetchForOffline(null, { client })).toBe(0);
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(await prefetchForOffline(player, { client })).toBe(0);
    offline.mockRestore();
    expect(client.get).not.toHaveBeenCalled();

    const cached = { get: vi.fn(() => Promise.resolve({ data: { content: [{ threadId: 't1' }] }, fromCache: true })) };
    expect(await prefetchForOffline(player, { client: cached })).toBe(0);
    expect(cached.get).not.toHaveBeenCalledWith('/threads/t1', undefined);
  });

  it('runs at most once per interval per account unless forced', async () => {
    let time = 0;
    const prefetch = vi.fn(() => Promise.resolve(3));
    const run = createPrefetcher({ prefetch, now: () => time, minInterval: 1000 });
    await run(player);
    await run(player);
    expect(prefetch).toHaveBeenCalledTimes(1);
    time = 1500;
    await run(player);
    await run(admin);
    expect(prefetch).toHaveBeenCalledTimes(3);
    await run(admin, { force: true });
    expect(prefetch).toHaveBeenCalledTimes(4);
    expect(await run(null)).toBe(0);

    // A run in progress is shared, and a failing prefetch never rejects.
    const failing = createPrefetcher({ prefetch: vi.fn(() => Promise.reject(new Error('x'))) });
    const first = failing(player);
    expect(failing(player)).toBe(first);
    await expect(first).resolves.toBe(0);
  });
});
