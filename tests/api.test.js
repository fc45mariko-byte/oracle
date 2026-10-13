import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../core/api.js';
import { freshStore, fakeClient, turn } from './helpers.js';

const memSettings = (initial = {}) => {
  let s = { ...initial };
  return { get: () => ({ ...s }), set: (p) => { s = { ...s, ...p }; for (const k of Object.keys(s)) if (s[k] === '') delete s[k]; } };
};
const status = async (p) => { try { await p; return 200; } catch (e) { return e.status; } };

test('status reports storage, and AI as off until a key is set', async () => {
  const settings = memSettings();
  const api = createApi({ store: freshStore(), settings });
  const s = await api('GET', '/status');
  assert.equal(s.storage.encrypted, false);
  assert.equal(s.ai.configured, false);
  await api('PATCH', '/settings', { apiKey: 'sk-ant-test', model: 'claude-sonnet-5-5' });
  const s2 = await api('GET', '/status');
  assert.equal(s2.ai.configured, true);
  assert.equal(s2.ai.model, 'claude-sonnet-5-5');
  const shown = await api('GET', '/settings');
  assert.equal(shown.hasApiKey, true);
  assert.equal(JSON.stringify(shown).includes('sk-ant-test'), false, 'the key is never returned');
  await api('PATCH', '/settings', { apiKey: '' });
  assert.equal((await api('GET', '/status')).ai.configured, false);
});

test('the API key is never part of an export', async () => {
  const api = createApi({ store: freshStore(), settings: memSettings({ apiKey: 'sk-ant-secret' }) });
  assert.equal(JSON.stringify(await api('GET', '/export')).includes('sk-ant-secret'), false);
});

test('a message without a key fails with 503 and stores nothing', async () => {
  const store = freshStore();
  const api = createApi({ store, settings: memSettings() });
  const c = await api('POST', '/conversations', {});
  assert.equal(await status(api('POST', `/conversations/${c.id}/messages`, { text: 'hi' })), 503);
  assert.equal(store.getConversation(c.id).messages.length, 0);
});

test('end to end: talk, then accept a proposal; it cannot be accepted twice', async () => {
  const store = freshStore();
  const client = fakeClient(() => turn({
    memory_proposals: [{ kind: 'add_question', target_id: null, summary: 'Open a question', rationale: '', label: 'unknown', data_json: JSON.stringify({ text: 'Why did he call back so fast?', personIds: ['p_yosef'] }) }],
  }));
  const api = createApi({ store, settings: memSettings(), client });
  const c = await api('POST', '/conversations', {});
  const t = await api('POST', `/conversations/${c.id}/messages`, { text: 'Yosef called back' });
  const before = store.data.questions.length;
  const acc = await api('POST', `/conversations/${c.id}/messages/${t.assistant.id}/proposals/0`, { action: 'accept' });
  assert.equal(acc.status, 'accepted');
  assert.equal(store.data.questions.length, before + 1);
  assert.equal(await status(api('POST', `/conversations/${c.id}/messages/${t.assistant.id}/proposals/0`, { action: 'accept' })), 400);
});

test('responses are copies: mutating them does not change the store', async () => {
  const store = freshStore();
  const api = createApi({ store, settings: memSettings() });
  const p = await api('GET', '/people/p_yosef');
  p.name = 'changed';
  assert.equal(store.get('people', 'p_yosef').name, 'Yosef');
});

test('the original record cannot be changed through the API', async () => {
  const api = createApi({ store: freshStore(), settings: memSettings() });
  assert.equal(await status(api('PATCH', '/events/e_2025_07_06_rain', { original: 'changed' })), 400);
});

test('delete-all requires explicit confirmation', async () => {
  const store = freshStore();
  const api = createApi({ store, settings: memSettings() });
  assert.equal(await status(api('POST', '/delete-all', {})), 400);
  await api('POST', '/delete-all', { confirm: 'DELETE' });
  assert.equal(store.data.events.length, 0);
});

test('async backends: saves land in order and flush waits for them', async () => {
  const { Store } = await import('../core/store.js');
  const saved = [];
  const backend = { load: async () => null, save: (d) => new Promise((r) => setTimeout(() => { saved.push(d.people.length); r(); }, 5)), describe: () => ({}) };
  const store = await Store.open(backend);
  store.create('people', { name: 'A' });
  store.create('people', { name: 'B' });
  await store.flush();
  assert.deepEqual(saved, [2, 3]);
});

test('merging the case-study file fills the blank self profile on a new device', async () => {
  const source = freshStore();
  const device = freshStore({ seeded: false });
  device.importAll(source.exportAll(), { mode: 'merge' });
  assert.ok(device.get('people', 'p_self').explicitStatements.length > 0);
  assert.equal(device.data.events.length, source.data.events.length);
});
