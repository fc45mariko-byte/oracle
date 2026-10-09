// IndexedDB backend for the Oracle store: the whole record is one JSON document under one key.
// IndexedDB is the browser's database for this site. It stays on this device, in this browser.

const DB_NAME = 'oracle';
const STORE = 'kv';
const KEY = 'record';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDBBackend {
  constructor() { this.db = null; this.persisted = null; }

  async ready() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  async load() {
    const db = await this.ready();
    // Ask the browser not to evict this site's storage under pressure. It may say no.
    try { this.persisted = await navigator.storage?.persist?.() ?? null; } catch { this.persisted = null; }
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async save(data) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  describe() {
    return {
      kind: 'indexeddb',
      location: `This browser on this device (IndexedDB, origin ${location.origin})`,
      encrypted: false,
      persistent: this.persisted,
    };
  }
}
