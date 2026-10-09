import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server/index.js';
import { freshStore, fakeClient, turn } from './helpers.js';

async function serve(opts) {
  const server = http.createServer(createApp(opts));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { server, call };
}

test('status reports storage honestly and AI as not configured without a key', async () => {
  const { server, call } = await serve({ store: freshStore(), client: null });
  const r = await call('/api/status');
  assert.equal(r.body.storage.encrypted, false);
  assert.equal(typeof r.body.ai.configured, 'boolean');
  const c = await call('/api/conversations', { method: 'POST', body: {} });
  const m = await call(`/api/conversations/${c.body.id}/messages`, { method: 'POST', body: { text: 'hi' } });
  assert.equal(m.status, 503);
  server.closeAllConnections(); server.close();
});

test('passcode is enforced on the API when set', async () => {
  const { server, call } = await serve({ store: freshStore(), client: null, passcode: 'secret' });
  assert.equal((await call('/api/status')).status, 401);
  assert.equal((await call('/api/status', { headers: { 'x-oracle-passcode': 'secret' } })).status, 200);
  server.closeAllConnections(); server.close();
});

test('end to end: talk, then accept a proposal through the API', async () => {
  const store = freshStore();
  const client = fakeClient(() => turn({
    memory_proposals: [{ kind: 'add_question', target_id: null, summary: 'Open a question', rationale: '', label: 'unknown', data_json: JSON.stringify({ text: 'Why did he call back so fast?', personIds: ['p_yosef'] }) }],
  }));
  const { server, call } = await serve({ store, client });
  const c = (await call('/api/conversations', { method: 'POST', body: {} })).body;
  const t = (await call(`/api/conversations/${c.id}/messages`, { method: 'POST', body: { text: 'Yosef called back' } })).body;
  const before = store.data.questions.length;
  const acc = await call(`/api/conversations/${c.id}/messages/${t.assistant.id}/proposals/0`, { method: 'POST', body: { action: 'accept' } });
  assert.equal(acc.status, 200);
  assert.equal(acc.body.status, 'accepted');
  assert.equal(store.data.questions.length, before + 1);
  const again = await call(`/api/conversations/${c.id}/messages/${t.assistant.id}/proposals/0`, { method: 'POST', body: { action: 'accept' } });
  assert.equal(again.status, 400, 'cannot accept twice');
  server.closeAllConnections(); server.close();
});

test('the original record cannot be changed through the API', async () => {
  const { server, call } = await serve({ store: freshStore(), client: null });
  const r = await call('/api/events/e_2025_07_06_rain', { method: 'PATCH', body: { original: 'changed' } });
  assert.equal(r.status, 400);
  server.closeAllConnections(); server.close();
});

test('delete-all requires explicit confirmation', async () => {
  const store = freshStore();
  const { server, call } = await serve({ store, client: null });
  assert.equal((await call('/api/delete-all', { method: 'POST', body: {} })).status, 400);
  assert.equal((await call('/api/delete-all', { method: 'POST', body: { confirm: 'DELETE' } })).status, 200);
  assert.equal(store.data.events.length, 0);
  server.closeAllConnections(); server.close();
});
