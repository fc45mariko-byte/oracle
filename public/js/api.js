// The app's data access. Same shape as an HTTP client, but every call runs in this page against the
// record (see core/api.js). Where the record lives and how Claude is reached depend on where the page
// runs (see platform.js):
// - on claude.ai: the page's private per-user database, and Claude through your claude.ai account;
// - elsewhere: this browser's IndexedDB, and the Anthropic API with your own key.

import { Store } from '../../core/store.js';
import { createApi } from '../../core/api.js';
import { IndexedDBBackend } from './idb.js';
import { ArtifactDbBackend } from './artifact-db.js';
import { createSampleClient } from './sample-client.js';
import { capability, viewerId, inClaude } from './platform.js';

const SETTINGS_KEY = 'oracle.settings';

// Settings (API key, model) live in this browser's local storage. They are never part of an export.
let memorySettings = {};
const settings = {
  get() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return { ...memorySettings }; }
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    for (const k of Object.keys(next)) if (next[k] === '') delete next[k];
    memorySettings = next;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage blocked: keep for this visit */ }
  },
};

export { inClaude };

let requestPromise = null;
async function open() {
  let backend = null;
  let sampleClient = null;
  if (inClaude) {
    const [db, sample, uid] = await Promise.all([capability('db'), capability('sample'), viewerId()]);
    if (db && uid) backend = new ArtifactDbBackend(db, uid);
    if (sample) sampleClient = createSampleClient(sample, () => settings.get());
  }
  if (!backend) backend = new IndexedDBBackend();
  const store = await Store.open(backend);
  store.onSaveError = (e) => {
    console.error(e);
    document.dispatchEvent(new CustomEvent('oracle:save-error', { detail: e }));
  };
  return createApi({
    store,
    settings,
    getClient: sampleClient ? () => sampleClient : undefined,
    aiInfo: sampleClient ? () => ({
      provider: 'Claude, through your claude.ai account',
      model: `${settings.get().tier || 'complex'} tier`,
      viaClaudeAi: true,
      transmits: 'For each message you send, the retrieved memory context, recent turns of that conversation and your message are sent to Claude through claude.ai, using your own Claude usage. Nothing is sent when you browse or edit the record.',
    }) : undefined,
  });
}

function ready() {
  if (!requestPromise) requestPromise = open();
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

// Offer a file to the viewer. On claude.ai pages ordinary downloads are blocked, so use the
// platform's download capability there.
export async function saveFile(filename, text) {
  const downloads = await capability('downloads');
  if (downloads) {
    const r = await downloads.save({ filename, data: text });
    return r.status;
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'saved';
}

// The case-study file is published next to the page only in the claude.ai build.
export async function fetchCaseStudy() {
  const res = await fetch('case-study.json');
  if (!res.ok) throw new Error('The case study file is not available here. Import it from a file instead.');
  return res.json();
}
