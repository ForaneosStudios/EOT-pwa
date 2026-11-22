// Minimal IndexedDB helper shared by the outbox and the read cache: opens (and creates on first
// use) one object store and runs one operation per transaction.
export function createIdbStore(idb, { dbName, version = 1, storeName, keyPath }) {
  let dbPromise = null;

  function open() {
    dbPromise ??= new Promise((resolve, reject) => {
      const request = idb.open(dbName, version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña.'));
    });
    return dbPromise;
  }

  return async function run(mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  };
}
