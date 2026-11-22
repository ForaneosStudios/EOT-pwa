// Last successful API reads (achievements, records, forum, profile...) kept on the device so the
// app can show them while offline. The cache belongs to one account at a time: storing data for a
// different account wipes the previous one, and signing out clears it, so a shared device never
// shows another player's data.

const DB_NAME = 'eot-read-cache';
const DB_VERSION = 1;
const STORE = 'responses';
export const OWNER_KEY = 'eot:read-cache-owner';

const clone = (value) => (value === undefined ? value : structuredClone(value));

function createMemoryStore() {
  const entries = new Map();
  return {
    get: async (key) => clone(entries.get(key)),
    put: async (entry) => { entries.set(entry.key, clone(entry)); },
    clear: async () => { entries.clear(); },
  };
}

function createIndexedDbStore(idb) {
  let dbPromise = null;
  function open() {
    dbPromise ??= new Promise((resolve, reject) => {
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña.'));
    });
    return dbPromise;
  }
  async function run(mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  return {
    get: (key) => run('readonly', (store) => store.get(key)),
    put: (entry) => run('readwrite', (store) => store.put(clone(entry))),
    clear: () => run('readwrite', (store) => store.clear()),
  };
}

function safeStorage(storage) {
  return {
    read: () => { try { return storage?.getItem(OWNER_KEY) || null; } catch { return null; } },
    write: (value) => { try { storage?.setItem(OWNER_KEY, value); } catch { /* private mode */ } },
    remove: () => { try { storage?.removeItem(OWNER_KEY); } catch { /* private mode */ } },
  };
}

/** Stable key for a GET: the URL plus its query parameters in a fixed order. */
export function readKey(url, params) {
  const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? `${url}?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : url;
}

export function createReadCache({ idb = globalThis.indexedDB, storage = globalThis.localStorage, now = () => Date.now() } = {}) {
  const memory = createMemoryStore();
  const persistent = idb ? createIndexedDbStore(idb) : null;
  let active = persistent || memory;
  const owners = safeStorage(storage);

  // IndexedDB can fail (quota, private mode); fall back to memory for the rest of the session.
  const call = async (method, ...args) => {
    if (active === memory) return memory[method](...args);
    try {
      return await active[method](...args);
    } catch {
      active = memory;
      return memory[method](...args);
    }
  };

  return {
    /** Account whose data is stored, or null after signing out. */
    owner: () => owners.read(),

    async put(owner, key, data) {
      if (!owner) return;
      if (owners.read() !== owner) {
        await call('clear');
        owners.write(owner);
      }
      await call('put', { key, data, savedAt: now() });
    },

    async get(owner, key) {
      if (!owner || owners.read() !== owner) return null;
      return (await call('get', key)) || null;
    },

    async clear() {
      owners.remove();
      await call('clear');
    },
  };
}

export const readCache = createReadCache();

// Tells the UI whether the screen shows saved data (the time it was saved) or fresh data (null).
let staleSince = null;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export const staleData = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot: () => staleSince,
  markStale(savedAt) {
    if (staleSince === null || savedAt < staleSince) { staleSince = savedAt; emit(); }
  },
  markFresh() {
    if (staleSince !== null) { staleSince = null; emit(); }
  },
};
