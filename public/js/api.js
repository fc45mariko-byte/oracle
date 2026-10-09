// The app's data access. Same shape as an HTTP client, but every call runs in this page against the
// local store (see core/api.js). Only conversation turns reach the network, to api.anthropic.com.

import { Store } from '../../core/store.js';
import { createApi } from '../../core/api.js';
import { IndexedDBBackend } from './idb.js';

const SETTINGS_KEY = 'oracle.settings';

// Settings (API key, model) live in localStorage on this device. They are never part of an export.
const settings = {
  get() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    for (const k of Object.keys(next)) if (next[k] === '') delete next[k];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },
};

let requestPromise = null;
function ready() {
  if (!requestPromise) {
    requestPromise = Store.open(new IndexedDBBackend()).then((store) => {
      store.onSaveError = (e) => {
        console.error(e);
        document.dispatchEvent(new CustomEvent('oracle:save-error', { detail: e }));
      };
      return createApi({ store, settings });
    });
  }
  return requestPromise;
}

export async function api(path, { method = 'GET', body } = {}) {
  const request = await ready();
  return request(method, path, body);
}

export const get = (p) => api(p);
export const post = (p, body = {}) => api(p, { method: 'POST', body });
export const patch = (p, body = {}) => api(p, { method: 'PATCH', body });
export const del = (p) => api(p, { method: 'DELETE' });
