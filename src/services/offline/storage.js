// Persistent storage for the offline outbox. IndexedDB survives reloads and closed tabs;
// when it is unavailable (some private modes, quota errors) we fall back to memory so the
// app keeps working online exactly as before, only without surviving a reload.

import { createIdbStore } from './idbStore.js';

const DB_NAME = 'eot-offline';
const DB_VERSION = 1;
const STORE = 'outbox';

const clone = (value) => (value === undefined ? value : structuredClone(value));

export function createMemoryStorage() {
  const items = new Map();
  return {
    kind: 'memory',
    all: async () => [...items.values()].map(clone),
    put: async (item) => { items.set(item.id, clone(item)); },
    remove: async (id) => { items.delete(id); },
  };
}

export function createIndexedDbStorage(idb = globalThis.indexedDB) {
  const run = createIdbStore(idb, { dbName: DB_NAME, version: DB_VERSION, storeName: STORE, keyPath: 'id' });
  return {
    kind: 'indexeddb',
    all: async () => (await run('readonly', (store) => store.getAll())) || [],
    put: (item) => run('readwrite', (store) => store.put(clone(item))),
    remove: (id) => run('readwrite', (store) => store.delete(id)),
  };
}

// Uses IndexedDB and switches permanently to memory on the first failure.
export function createDefaultStorage(idb = globalThis.indexedDB) {
  const memory = createMemoryStorage();
  if (!idb) return memory;
  const persistent = createIndexedDbStorage(idb);
  let active = persistent;

  const guarded = (method) => async (...args) => {
    if (active === memory) return memory[method](...args);
    try {
      return await persistent[method](...args);
    } catch {
      active = memory;
      return memory[method](...args);
    }
  };

  return {
    get kind() { return active.kind; },
    all: guarded('all'),
    put: guarded('put'),
    remove: guarded('remove'),
  };
}
