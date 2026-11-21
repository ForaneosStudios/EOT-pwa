import { describe, expect, it, vi } from 'vitest';
import { canonicalJson, createOutbox, DEDUP_WINDOW_MS, IDEMPOTENCY_HEADER, INTENT_HEADER } from '../src/services/offline/outbox.js';
import { createDefaultStorage, createMemoryStorage } from '../src/services/offline/storage.js';

const networkError = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });
const httpError = (status, data = {}, headers = {}) => Object.assign(new Error(`HTTP ${status}`), {
  isAxiosError: true, response: { status, data, headers },
});

function setup({ online = true, probe = async () => true, request } = {}) {
  let clock = 1_000;
  let ids = 0;
  const state = { online };
  const storage = createMemoryStorage();
  const synced = [];
  const outbox = createOutbox({
    request: request ?? vi.fn().mockResolvedValue({ status: 201, data: { id: 'server-1' } }),
    storage,
    isOnline: () => state.online,
    probe,
    now: () => clock,
    random: () => 0.5,
    newId: () => `id-${++ids}`,
    schedule: () => 0,
    cancel: () => {},
    withLock: (callback) => callback(),
    onSynced: (detail) => synced.push(detail),
  });
  return {
    outbox, storage, synced, state,
    advance: (ms) => { clock += ms; },
  };
}

const keyOf = (call) => call[0].headers[IDEMPOTENCY_HEADER];
const post = (content = 'hola') => ({ method: 'POST', url: '/posts', data: { threadId: 't1', content }, label: 'Nuevo comentario' });

describe('offline outbox', () => {
  it('sends online with an idempotency key and keeps nothing afterwards', async () => {
    const request = vi.fn().mockResolvedValue({ status: 201, data: { id: 'p1' } });
    const { outbox, storage } = setup({ request });
    await outbox.setOwner('user-1');
    const result = await outbox.send(post());
    expect(result).toEqual({ status: 'sent', data: { id: 'p1' } });
    expect(keyOf(request.mock.calls[0])).toBeTruthy();
    expect(await storage.all()).toEqual([]);
  });

  it('coalesces a double click into one request and one result', async () => {
    let resolve;
    const request = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { outbox } = setup({ request });
    await outbox.setOwner('user-1');
    const first = outbox.send(post());
    const second = outbox.send(post());
    expect(second).toBe(first);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    resolve({ status: 201, data: { id: 'p1' } });
    await expect(second).resolves.toEqual({ status: 'sent', data: { id: 'p1' } });
  });

  it('queues while offline and sends once the connection returns', async () => {
    const request = vi.fn().mockResolvedValue({ status: 201, data: { id: 'p1' } });
    const { outbox, storage, synced, state } = setup({ online: false, request });
    await outbox.setOwner('user-1');
    const result = await outbox.send(post());
    expect(result.status).toBe('queued');
    expect(request).not.toHaveBeenCalled();
    expect(outbox.getSnapshot().pending).toBe(1);

    state.online = true;
    await outbox.drain();
    expect(request).toHaveBeenCalledOnce();
    expect(await storage.all()).toEqual([]);
    expect(synced[0].data).toEqual({ id: 'p1' });
  });

  it('retries a lost response with the same key so the server can replay it', async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ status: 201, data: { id: 'p1' }, headers: { 'idempotency-replayed': 'true' } });
    const { outbox, advance } = setup({ request });
    await outbox.setOwner('user-1');
    expect((await outbox.send(post())).status).toBe('queued');
    advance(60_000);
    await outbox.drain();
    expect(request).toHaveBeenCalledTimes(2);
    expect(keyOf(request.mock.calls[1])).toBe(keyOf(request.mock.calls[0]));
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('drops an identical request for a short window after it was confirmed', async () => {
    const request = vi.fn().mockResolvedValue({ status: 201, data: { id: 'p1' } });
    const { outbox, advance } = setup({ request });
    await outbox.setOwner('user-1');
    await outbox.send(post());
    const duplicate = await outbox.send({ ...post(), data: { content: 'hola', threadId: 't1' } });
    expect(duplicate).toEqual({ status: 'sent', data: { id: 'p1' }, deduplicated: true });
    expect(request).toHaveBeenCalledOnce();

    advance(DEDUP_WINDOW_MS + 1);
    await outbox.send(post());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns the waiting item instead of queueing an identical copy', async () => {
    const { outbox } = setup({ online: false });
    await outbox.setOwner('user-1');
    const first = await outbox.send(post());
    const second = await outbox.send(post());
    expect(second.deduplicated).toBe(true);
    expect(second.item.id).toBe(first.item.id);
    expect(outbox.getSnapshot().items).toHaveLength(1);
  });

  it('waits and retries when the server is still processing the same key', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(httpError(409, { code: 'IDEMPOTENCY_IN_PROGRESS' }, { 'retry-after': '3' }))
      .mockResolvedValueOnce({ status: 201, data: { id: 'p1' } });
    const { outbox, advance } = setup({ request });
    await outbox.setOwner('user-1');
    expect((await outbox.send(post())).status).toBe('queued');
    expect(outbox.getSnapshot().items[0].nextAttemptAt).toBe(1_000 + 3_000);
    advance(3_000);
    await outbox.drain();
    expect(keyOf(request.mock.calls[1])).toBe(keyOf(request.mock.calls[0]));
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('treats 404 on a replayed delete as done', async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError()).mockRejectedValueOnce(httpError(404));
    const { outbox, advance, synced } = setup({ request });
    await outbox.setOwner('user-1');
    await outbox.send({ method: 'DELETE', url: '/posts/p1' });
    advance(60_000);
    await outbox.drain();
    expect(outbox.getSnapshot().items).toEqual([]);
    expect(synced).toHaveLength(1);
  });

  it('rejects a live business error without keeping the item', async () => {
    const request = vi.fn().mockRejectedValue(httpError(409, { message: 'Hilo cerrado' }));
    const { outbox } = setup({ request });
    await outbox.setOwner('user-1');
    await expect(outbox.send(post())).rejects.toMatchObject({ response: { status: 409 } });
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('marks a replayed business error as failed and retries it with a new key', async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(httpError(403, { message: 'Sin permiso' }))
      .mockResolvedValueOnce({ status: 201, data: {} });
    const { outbox, advance } = setup({ request });
    await outbox.setOwner('user-1');
    await outbox.send(post());
    advance(60_000);
    await outbox.drain();
    const [failed] = outbox.getSnapshot().items;
    expect(failed.status).toBe('failed');
    expect(failed.lastError).toMatchObject({ status: 403, message: 'Sin permiso' });

    await outbox.retry(failed.id);
    expect(keyOf(request.mock.calls[2])).not.toBe(keyOf(request.mock.calls[1]));
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('pauses on 401 and keeps the item for the next login', async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError()).mockRejectedValueOnce(httpError(401));
    const { outbox, advance } = setup({ request });
    await outbox.setOwner('user-1');
    await outbox.send(post());
    advance(60_000);
    await outbox.drain();
    expect(outbox.getSnapshot()).toMatchObject({ paused: true, pending: 1 });
  });

  it('backs off on server errors and does not send while the API is unreachable', async () => {
    const request = vi.fn().mockRejectedValue(httpError(503));
    let reachable = false;
    const { outbox, advance } = setup({ request, probe: async () => reachable });
    await outbox.setOwner('user-1');
    await outbox.send(post());
    expect(outbox.getSnapshot().items[0].status).toBe('queued');
    advance(60_000);
    await outbox.drain();
    expect(request).toHaveBeenCalledOnce();
    reachable = true;
    await outbox.drain();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps order and stops at the first connectivity problem', async () => {
    const request = vi.fn().mockRejectedValueOnce(networkError());
    const { outbox, state, advance } = setup({ online: false, request });
    await outbox.setOwner('user-1');
    await outbox.send(post('uno'));
    advance(1);
    await outbox.send(post('dos'));
    state.online = true;
    await outbox.drain();
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0].data.content).toBe('uno');
  });

  it('recovers items left in "sending" and removes other accounts on owner change', async () => {
    const { outbox, storage } = setup();
    await storage.put({ id: 'a', owner: 'user-1', status: 'sending', fingerprint: 'f', idempotencyKey: 'k', method: 'POST', url: '/posts', data: {}, attempts: 1, nextAttemptAt: 0, createdAt: 1 });
    await storage.put({ id: 'b', owner: 'user-2', status: 'queued', fingerprint: 'g', idempotencyKey: 'k2', method: 'POST', url: '/posts', data: {}, attempts: 0, nextAttemptAt: 0, createdAt: 2 });
    const request = vi.fn().mockResolvedValue({ status: 201, data: {} });
    const recovering = createOutbox({ request, storage, isOnline: () => true, schedule: () => 0, cancel: () => {}, withLock: (cb) => cb(), onSynced: () => {} });
    await recovering.setOwner('user-1');
    await recovering.drain();
    expect(request).toHaveBeenCalledOnce();
    expect(keyOf(request.mock.calls[0])).toBe('k');
    expect(await storage.all()).toEqual([]);
    expect(outbox).toBeTruthy();
  });

  it('edits a queued item with a new key and discards on request', async () => {
    const { outbox } = setup({ online: false });
    await outbox.setOwner('user-1');
    const { item } = await outbox.send(post());
    await outbox.update(item.id, { threadId: 't1', content: 'editado' });
    const [edited] = outbox.getSnapshot().items;
    expect(edited.data.content).toBe('editado');
    expect(edited.idempotencyKey).not.toBe(item.idempotencyKey);
    await outbox.discard(item.id);
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('clears everything for the account on logout', async () => {
    const { outbox, storage } = setup({ online: false });
    await outbox.setOwner('user-1');
    await outbox.send(post('uno'));
    await outbox.send(post('dos'));
    await outbox.clearOwner();
    expect(await storage.all()).toEqual([]);
  });
});

describe('outbox helpers', () => {
  it('canonical JSON ignores key order and undefined values', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [1, null] } })).toBe(canonicalJson({ a: { c: [1, null] }, b: 1 }));
  });

  it('falls back to memory when IndexedDB fails', async () => {
    const brokenIdb = { open: () => { throw new Error('denied'); } };
    const storage = createDefaultStorage(brokenIdb);
    await storage.put({ id: 'x' });
    expect(await storage.all()).toEqual([{ id: 'x' }]);
    expect(storage.kind).toBe('memory');
  });
});

describe('last edit made wins', () => {
  function setupIntent(request) {
    let intent = Date.parse('2026-11-21T10:00:00Z');
    const storage = createMemoryStorage();
    const synced = [];
    let ids = 0;
    let clock = 1_000;
    const state = { online: false };
    const outbox = createOutbox({
      request, storage, isOnline: () => state.online, now: () => clock, random: () => 0.5,
      newId: () => `id-${++ids}`, schedule: () => 0, cancel: () => {}, withLock: (cb) => cb(),
      onSynced: (detail) => synced.push(detail), intentClock: () => intent, onError: () => {},
    });
    return { outbox, synced, state, setIntent: (iso) => { intent = Date.parse(iso); }, advance: (ms) => { clock += ms; } };
  }
  const edit = (content) => ({ method: 'PUT', url: '/posts/p1', data: { content }, meta: { kind: 'post:update', threadId: 't1', postId: 'p1' } });
  const stale = () => httpError(409, { code: 'STALE_WRITE', message: 'Otra edicion mas reciente ya se aplico', current: { content: 'B' } });

  it('sends the moment the edit was made, not when it is finally delivered', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, data: {} });
    const { outbox, state, setIntent } = setupIntent(request);
    await outbox.setOwner('user-1');
    await outbox.send(edit('A'));
    setIntent('2026-11-21T14:00:00Z'); // Hours later the connection returns.
    state.online = true;
    await outbox.drain();
    expect(request.mock.calls[0][0].headers[INTENT_HEADER]).toBe('2026-11-21T10:00:00.000Z');
  });

  it('marks a stale edit as superseded, not failed, and reports the winning state', async () => {
    const request = vi.fn().mockRejectedValue(stale());
    const { outbox, state, synced } = setupIntent(request);
    await outbox.setOwner('user-1');
    await outbox.send(edit('A'));
    state.online = true;
    await outbox.drain();
    expect(outbox.getSnapshot()).toMatchObject({ superseded: 1, failed: 0, pending: 0 });
    expect(outbox.getSnapshot().items[0].lastError.code).toBe('STALE_WRITE');
    expect(synced[0]).toMatchObject({ superseded: true, data: { content: 'B' } });
  });

  it('keeps sending the rest of the queue after a superseded edit', async () => {
    const request = vi.fn().mockRejectedValueOnce(stale()).mockResolvedValueOnce({ status: 201, data: {} });
    const { outbox, state, advance } = setupIntent(request);
    await outbox.setOwner('user-1');
    await outbox.send(edit('A'));
    advance(1);
    await outbox.send(post('otro'));
    state.online = true;
    await outbox.drain();
    expect(request).toHaveBeenCalledTimes(2);
    expect(outbox.getSnapshot().items.map((item) => item.status)).toEqual(['superseded']);
  });

  it('applying a superseded edit again counts as a new edit made now', async () => {
    const request = vi.fn().mockRejectedValueOnce(stale()).mockResolvedValueOnce({ status: 200, data: {} });
    const { outbox, state, setIntent } = setupIntent(request);
    await outbox.setOwner('user-1');
    await outbox.send(edit('A'));
    state.online = true;
    await outbox.drain();
    const [item] = outbox.getSnapshot().items;
    setIntent('2026-11-21T15:00:00Z');
    await outbox.retry(item.id);
    const second = request.mock.calls[1][0].headers;
    expect(second[INTENT_HEADER]).toBe('2026-11-21T15:00:00.000Z');
    expect(second[IDEMPOTENCY_HEADER]).not.toBe(request.mock.calls[0][0].headers[IDEMPOTENCY_HEADER]);
    expect(outbox.getSnapshot().items).toEqual([]);
  });

  it('shows a live stale edit in the form instead of keeping it', async () => {
    const request = vi.fn().mockRejectedValue(stale());
    const { outbox, state } = setupIntent(request);
    state.online = true;
    await outbox.setOwner('user-1');
    await expect(outbox.send(edit('A'))).rejects.toMatchObject({ response: { status: 409 } });
    expect(outbox.getSnapshot().items).toEqual([]);
  });
});

describe('outbox resilience', () => {
  it('survives storage failures while sending and schedules another attempt', async () => {
    const scheduled = [];
    const errors = [];
    const broken = { all: vi.fn().mockRejectedValue(new Error('quota')), put: vi.fn(), remove: vi.fn() };
    const outbox = createOutbox({
      request: vi.fn(), storage: broken, isOnline: () => true, schedule: (cb, ms) => scheduled.push(ms),
      cancel: () => {}, withLock: () => Promise.reject(new Error('lock lost')), onSynced: () => {},
      onError: (message) => errors.push(message),
    });
    await expect(outbox.setOwner('user-1')).resolves.toBeUndefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(scheduled.length).toBeGreaterThan(0);
  });

  it('a failing listener does not break the queue', async () => {
    const { outbox } = setup({ online: false });
    outbox.subscribe(() => { throw new Error('render failed'); });
    await outbox.setOwner('user-1');
    await expect(outbox.send(post())).resolves.toMatchObject({ status: 'queued' });
  });
});
