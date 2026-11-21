// Offline outbox for API mutations.
//
// Every mutation gets an Idempotency-Key the moment the user asks for it, and keeps that key
// through every retry. The backend runs the first request it receives with that key and answers
// every later one with the stored response. That makes two situations safe without having to tell
// them apart (a browser cannot):
//   - the request never left the device (offline, DNS failure): it waits here and is sent later;
//   - the request reached the server but the answer was lost (connection dropped, timeout): the
//     retry gets the original answer instead of creating a duplicate.
//
// Identical requests (same account, method, URL and body) are treated as one while the first is
// queued or in flight, and for DEDUP_WINDOW_MS after it is confirmed: the duplicate is dropped and
// its caller receives the first request's result.
//
// Each item also records when the user asked for it, in server time (X-Client-Intent-At). For
// edits, the server keeps the most recently MADE change: an edit queued on an offline phone that
// arrives after a newer edit from another device is answered with 409 STALE_WRITE. The item is
// then marked "superseded" (not an error) and the user may apply it again as a new edit.

export const DEDUP_WINDOW_MS = 10_000;
export const LIVE_TIMEOUT_MS = 15_000;
export const DRAIN_TIMEOUT_MS = 45_000; // Covers a cold start of the free Render instance.
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 60_000;
export const OUTBOX_SYNCED_EVENT = 'eot:outbox-synced';
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const INTENT_HEADER = 'X-Client-Intent-At';

const ACTIVE = new Set(['queued', 'sending']);

// Stable JSON: object keys sorted, undefined values dropped, so equal payloads compare equal.
export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return '[' + value.map((entry) => canonicalJson(entry ?? null)).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort((a, b) => a.localeCompare(b));
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value ?? null);
}

function describeError(error) {
  const response = error?.response;
  return {
    status: response?.status ?? null,
    code: response?.data?.code ?? error?.code ?? null,
    message: response?.data?.message ?? null,
  };
}

const defaultLock = (callback) => (globalThis.navigator?.locks?.request
  ? globalThis.navigator.locks.request('eot-outbox', callback)
  : callback());

export function createOutbox({
  request,
  storage,
  isOnline = () => globalThis.navigator?.onLine ?? true,
  probe = async () => true,
  now = () => Date.now(),
  random = Math.random,
  newId = () => globalThis.crypto.randomUUID(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (handle) => clearTimeout(handle),
  withLock = defaultLock,
  channel = null,
  onSynced = (detail) => globalThis.window?.dispatchEvent(new CustomEvent(OUTBOX_SYNCED_EVENT, { detail })),
  intentClock = () => Date.now(),
  onError = (message, error) => globalThis.console?.warn('[outbox] ' + message, error),
}) {
  let owner = null;
  let items = [];
  let paused = false;
  let draining = false;
  let timer = null;
  let snapshot = { owner: null, items: [], pending: 0, failed: 0, superseded: 0, paused: false };
  const listeners = new Set();
  const inFlight = new Map();
  const recent = new Map();

  function notify() {
    snapshot = {
      owner,
      items: items.map((item) => ({ ...item })),
      pending: items.filter((item) => ACTIVE.has(item.status)).length,
      failed: items.filter((item) => item.status === 'failed').length,
      superseded: items.filter((item) => item.status === 'superseded').length,
      paused,
    };
    for (const listener of listeners) {
      try { listener(snapshot); } catch (error) { onError('A listener failed', error); }
    }
  }

  function synced(detail) {
    try { onSynced(detail); } catch (error) { onError('A sync listener failed', error); }
  }

  const intentNow = () => new Date(intentClock()).toISOString();

  function broadcast() {
    try { channel?.postMessage('changed'); } catch { /* Other tabs will refresh on their next drain. */ }
  }

  async function refresh() {
    try {
      const all = await storage.all();
      items = all.filter((item) => owner && item.owner === owner).sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      onError('Could not read the queue; keeping the copy in memory', error);
    }
    notify();
  }

  async function save(item) {
    await storage.put(item);
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index === -1) items.push(item); else items[index] = item;
    notify();
    broadcast();
  }

  async function drop(item) {
    await storage.remove(item.id);
    items = items.filter((entry) => entry.id !== item.id);
    notify();
    broadcast();
  }

  const fingerprintOf = (method, url, data) => `${owner}|${method.toUpperCase()}|${url}|${canonicalJson(data)}`;

  function backoff(attempts) {
    const base = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
    return Math.round(base * (0.5 + random() / 2));
  }

  function pruneRecent() {
    const limit = now() - DEDUP_WINDOW_MS;
    for (const [fingerprint, entry] of recent) if (entry.at < limit) recent.delete(fingerprint);
  }

  function scheduleDrain(delay) {
    if (timer) cancel(timer);
    timer = schedule(() => { timer = null; void drain(); }, Math.max(0, delay));
  }

  function scheduleNext() {
    const waiting = items.filter((item) => item.status === 'queued');
    if (!waiting.length || paused || !owner) return;
    const next = Math.min(...waiting.map((item) => item.nextAttemptAt));
    scheduleDrain(Math.min(MAX_BACKOFF_MS, next - now()));
  }

  async function requeue(item, delay, error) {
    await save({ ...item, status: 'queued', nextAttemptAt: now() + delay, lastError: error ? describeError(error) : item.lastError });
  }

  async function complete(item, data) {
    recent.set(item.fingerprint, { at: now(), data });
    // A confirmed answer makes any queued copy of the same request redundant.
    await Promise.all(items.filter((entry) => entry.fingerprint === item.fingerprint).map(drop));
    synced({ item, data });
  }

  // Sends one item. Returns what happened so the caller can decide what the user sees.
  async function attempt(item, timeout) {
    const sending = { ...item, status: 'sending', attempts: item.attempts + 1 };
    await save(sending);
    try {
      const response = await request({
        method: sending.method,
        url: sending.url,
        data: sending.data,
        timeout,
        headers: {
          [IDEMPOTENCY_HEADER]: sending.idempotencyKey,
          ...(sending.intentAt ? { [INTENT_HEADER]: sending.intentAt } : {}),
        },
      });
      await complete(sending, response?.data);
      return { type: 'done', data: response?.data };
    } catch (error) {
      return handleFailure(sending, error);
    }
  }

  // Decides what a failed send means: retry later, wait, done, superseded or failed for good.
  async function handleFailure(sending, error) {
    const status = error?.response?.status;
    if (!error?.response) {
      // Offline, timeout or DNS: the request may or may not have reached the server.
      await requeue(sending, backoff(sending.attempts), error);
      return { type: 'retry', error };
    }
    if (status === 409 && error.response.data?.code === 'IDEMPOTENCY_IN_PROGRESS') {
      const seconds = Number(error.response.headers?.['retry-after']) || 2;
      await requeue(sending, seconds * 1000, error);
      return { type: 'retry', error };
    }
    if (status === 409 && error.response.data?.code === 'STALE_WRITE') {
      // A newer edit made on another device already won. Not an error: keep it so the user can
      // see it and decide whether to apply it again.
      const current = error.response.data?.current ?? null;
      await save({ ...sending, status: 'superseded', lastError: describeError(error) });
      synced({ item: sending, data: current, superseded: true });
      return { type: 'superseded', error };
    }
    if (status === 404 && sending.method === 'DELETE') {
      await complete(sending, null); // Already gone: the goal of the request is met.
      return { type: 'done', data: null };
    }
    if (status === 401) {
      // The API client already tried to renew the token. Keep the item and wait for a new login.
      paused = true;
      await requeue(sending, 0, error);
      return { type: 'auth', error };
    }
    if (status === 408 || status === 429 || status >= 500) {
      await requeue(sending, backoff(sending.attempts), error);
      return { type: 'retry', error };
    }
    await save({ ...sending, status: 'failed', lastError: describeError(error) });
    return { type: 'failed', error };
  }

  async function drain() {
    if (draining || paused || !owner || !isOnline()) return;
    draining = true;
    let failedUnexpectedly = false;
    try {
      await withLock(async () => {
        await refresh(); // Another tab may have changed the queue.
        const due = items.filter((item) => item.status === 'queued' && item.nextAttemptAt <= now());
        if (!due.length) return;
        if (!(await probe())) {
          scheduleDrain(backoff(Math.max(...due.map((item) => item.attempts)) + 1));
          return;
        }
        for (const item of due) {
          if (paused || item.owner !== owner) break;
          if (inFlight.has(item.fingerprint)) continue; // Being sent right now from this tab.
          const current = items.find((entry) => entry.id === item.id);
          if (current?.status !== 'queued') continue;
          const outcome = await attempt(current, DRAIN_TIMEOUT_MS);
          // Stop at the first connectivity problem so later items keep their order.
          if (outcome.type === 'retry' || outcome.type === 'auth') break;
        }
      });
    } catch (error) {
      // Storage or lock failures must not leave the queue stuck: try again later.
      failedUnexpectedly = true;
      onError('Sending the queue failed; it will be retried', error);
    } finally {
      draining = false;
      if (failedUnexpectedly) scheduleDrain(MAX_BACKOFF_MS); else scheduleNext();
    }
  }

  // Deliberately not async: an identical call made while the first is in flight must get the
  // very same promise, and everything up to inFlight.set runs synchronously for that reason.
  function send({ method, url, data, label = 'Acción', meta = {} }) {
    const normalizedMethod = method.toUpperCase();
    if (!owner) {
      // No signed-in account to own a queued item: behave like a plain request.
      return request({ method: normalizedMethod, url, data, timeout: LIVE_TIMEOUT_MS,
        headers: { [IDEMPOTENCY_HEADER]: newId() } }).then((response) => ({ status: 'sent', data: response?.data }));
    }

    const fingerprint = fingerprintOf(normalizedMethod, url, data);
    pruneRecent();
    const confirmed = recent.get(fingerprint);
    if (confirmed) return Promise.resolve({ status: 'sent', data: confirmed.data, deduplicated: true });
    if (inFlight.has(fingerprint)) return inFlight.get(fingerprint);
    const waiting = items.find((item) => item.fingerprint === fingerprint && ACTIVE.has(item.status));
    if (waiting) return Promise.resolve({ status: 'queued', item: { ...waiting }, deduplicated: true });

    const item = {
      id: newId(), idempotencyKey: newId(), fingerprint, owner, method: normalizedMethod, url,
      data: data ?? null, label, meta, status: 'queued', attempts: 0, nextAttemptAt: now(), lastError: null,
      createdAt: now(), intentAt: intentNow(),
    };

    const promise = (async () => {
      await save(item);
      if (!isOnline() || paused) {
        scheduleNext();
        return { status: 'queued', item: { ...item } };
      }
      const outcome = await attempt(item, LIVE_TIMEOUT_MS);
      if (outcome.type === 'done') return { status: 'sent', data: outcome.data };
      if (outcome.type === 'failed' || outcome.type === 'superseded') {
        // The user is looking at the form: show the error there instead of keeping the item.
        await drop(item);
        throw outcome.error;
      }
      scheduleNext();
      return { status: 'queued', item: { ...items.find((entry) => entry.id === item.id) } };
    })().finally(() => inFlight.delete(fingerprint));

    inFlight.set(fingerprint, promise);
    return promise;
  }

  async function setOwner(nextOwner) {
    owner = nextOwner ?? null;
    paused = false;
    if (owner) {
      try {
        const all = await storage.all();
        await Promise.all(all.map((item) => {
          // Never keep another account's pending content on this device.
          if (item.owner !== owner) return storage.remove(item.id);
          // A tab closed mid-request leaves "sending"; the same key makes resending safe.
          if (item.status === 'sending') return storage.put({ ...item, status: 'queued', nextAttemptAt: now() });
          return null;
        }));
      } catch (error) {
        onError('Could not tidy the queue for the new account', error);
      }
    }
    await refresh();
    await drain();
  }

  async function update(id, data) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === 'sending') return false;
    // A different body needs a new key; reusing the old one would be rejected by the server.
    // Editing counts as a new edit made now.
    await save({ ...item, data, fingerprint: fingerprintOf(item.method, item.url, data), idempotencyKey: newId(),
      intentAt: intentNow(), status: 'queued', attempts: 0, nextAttemptAt: now(), lastError: null });
    await drain();
    return true;
  }

  // Applies a failed or superseded item again. It counts as a new decision made now, and gets a new
  // key because the server stored the previous outcome under the old one.
  async function retry(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item || (item.status !== 'failed' && item.status !== 'superseded')) return false;
    await save({ ...item, idempotencyKey: newId(), intentAt: intentNow(), status: 'queued', attempts: 0,
      nextAttemptAt: now(), lastError: null });
    await drain();
    return true;
  }

  async function discard(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === 'sending') return false;
    await drop(item);
    return true;
  }

  async function clearOwner() {
    await Promise.all(items.map(drop));
    recent.clear();
  }

  return {
    send,
    drain,
    setOwner,
    update,
    retry,
    discard,
    clearOwner,
    refresh,
    // Skips the backoff wait, e.g. when the user presses "send now".
    async sendNow() {
      paused = false;
      await Promise.all(items.filter((entry) => entry.status === 'queued')
        .map((item) => save({ ...item, nextAttemptAt: now() })));
      await drain();
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
  };
}
