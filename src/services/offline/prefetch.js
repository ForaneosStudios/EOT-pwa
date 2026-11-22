import { apiClient } from '../apiClient.js';

// Loads, right after signing in and whenever the connection comes back, every read the screens
// use, so the read cache (readCache.js) already has them if the connection drops later. The
// parameters must match the ones each page sends, because the cache key is the URL plus its query.

const THREAD_PAGE = { page: 0, size: 10 };
const MAX_PARALLEL = 4;
export const MIN_INTERVAL_MS = 60_000;

export function prefetchRequests(user) {
  const requests = [
    ['/users/me'],
    ['/user-achievements/me'],                           // inicio, logros, perfil
    ['/time-records/me'],                                // panel de récords
    ['/leaderboard', { limit: 10 }],
    ['/threads/search', THREAD_PAGE],                    // foro (vista inicial)
    ['/threads/search', { ...THREAD_PAGE, participantId: user.userId }], // foro: «donde participé»
  ];
  if (user.role === 'ADMIN') {
    requests.push(
      ['/users'],
      ['/threads/search', { page: 0, size: 50 }],
      ['/achievements', { includeHidden: true }],
      ['/categories'],
    );
  }
  return requests;
}

// Runs the tasks with at most `limit` in flight; resolves with allSettled-style results in order.
function runLimited(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = () => {
    if (next >= tasks.length) return Promise.resolve();
    const index = next++;
    return Promise.allSettled([Promise.resolve().then(tasks[index])]).then(([result]) => {
      results[index] = result;
      return worker();
    });
  };
  return Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker)).then(() => results);
}

/**
 * Fetches everything for offline use. Never throws: a failed read only means that screen will not
 * be available offline. Returns how many requests succeeded.
 */
export async function prefetchForOffline(user, { client = apiClient } = {}) {
  if (!user?.userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 0;
  const get = (url, params) => () => client.get(url, params ? { params } : undefined);
  const results = await runLimited(prefetchRequests(user).map(([url, params]) => get(url, params)), MAX_PARALLEL);

  // The conversations of the first forum page: the thread and its first page of comments.
  const firstPage = results[4]?.status === 'fulfilled' && !results[4].value?.fromCache ? results[4].value.data?.content || [] : [];
  const details = firstPage.filter((thread) => thread?.threadId).flatMap((thread) => [
    get(`/threads/${thread.threadId}`),
    get('/posts/page', { threadId: thread.threadId, ...THREAD_PAGE }),
  ]);
  const detailResults = await runLimited(details, MAX_PARALLEL);
  return [...results, ...detailResults].filter((result) => result.status === 'fulfilled' && !result.value?.fromCache).length;
}

/** Runs the prefetch at most once per interval per account (sign-in, reconnection, tab focus). */
export function createPrefetcher({ prefetch = prefetchForOffline, now = () => Date.now(), minInterval = MIN_INTERVAL_MS } = {}) {
  let last = { userId: null, at: -Infinity };
  let running = null;
  return function run(user, { force = false } = {}) {
    if (!user?.userId || running) return running || Promise.resolve(0);
    if (!force && last.userId === user.userId && now() - last.at < minInterval) return Promise.resolve(0);
    last = { userId: user.userId, at: now() };
    running = prefetch(user).catch(() => 0).finally(() => { running = null; });
    return running;
  };
}

export const prefetchOnce = createPrefetcher();
