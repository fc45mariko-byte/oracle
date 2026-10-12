import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.js';
import { createApi } from '../core/api.js';
import { lowercaseStarts, personaDossier, simulationInstructions } from '../core/simulation.js';

const settings = { get: () => ({}), set: () => {} };

test('every sentence starts in lowercase; all-caps words stay', () => {
  assert.equal(lowercaseStarts('Bah ouais. Et toi?'), 'bah ouais. et toi?');
  assert.equal(lowercaseStarts('Wsh\nTu fais quoi'), 'wsh\ntu fais quoi');
  assert.equal(lowercaseStarts('OK MDR. Je sais pas'), 'OK MDR. je sais pas');
  assert.equal(lowercaseStarts('Éthiopie c’était chaud'), 'éthiopie c’était chaud');
  assert.equal(lowercaseStarts('Wsh\nT’es sérieuse. J\'ai pas compris'), 'wsh\nt’es sérieuse. j\'ai pas compris');
});

test('the dossier is built from the record: his reported words, statements and timeline', () => {
  const d = personaDossier(freshStore(), 'p_yosef');
  assert.match(d, /cannot give you that/);
  assert.match(d, /indifferent/);
  assert.match(d, /2026-10-08/);
  assert.match(d, /PERSONNE : Yosef/);
});

test('instructions require French, lowercase starts, no invented facts, and safety limits', () => {
  const t = simulationInstructions(freshStore(), 'p_yosef');
  assert.match(t, /en français/);
  assert.match(t, /commence par une minuscule/);
  assert.match(t, /sans inventer de nouveaux faits/);
  assert.match(t, /\[oracle\]/);
});

test('a simulated turn stores both messages, stays out of the Oracle conversation list, and never touches the record', async () => {
  const store = freshStore();
  const calls = [];
  const client = { completeText: async (req) => { calls.push(req); return 'Wsh. Ça va ou quoi\nPourquoi tu m’écris'; } };
  const api = createApi({ store, settings, client });
  const before = JSON.stringify({ e: store.data.events, p: store.data.patterns, q: store.data.questions });
  const sim = await api('POST', '/simulations', { personId: 'p_yosef' });
  const out = await api('POST', `/simulations/${sim.id}/messages`, { text: 't’es là ?' });
  assert.equal(out.sim.text, 'wsh. ça va ou quoi\npourquoi tu m’écris');
  assert.equal(calls[0].messages.at(-1).role, 'user');
  assert.match(calls[0].messages.at(-1).content, /t’es là \?/);
  assert.match(calls[0].system, /DOSSIER/);
  assert.equal((await api('GET', '/conversations')).length, 0);
  assert.equal((await api('GET', '/simulations')).length, 1);
  assert.equal(JSON.stringify({ e: store.data.events, p: store.data.patterns, q: store.data.questions }), before);
  const second = await api('POST', `/simulations/${sim.id}/messages`, { text: 'oui' });
  assert.ok(second.sim);
  assert.deepEqual(calls[1].messages.slice(0, 2).map((m) => m.role), ['user', 'assistant']);
});

test('you cannot simulate yourself, and without Claude the turn fails clearly', async () => {
  const store = freshStore();
  const api = createApi({ store, settings, client: null });
  await assert.rejects(api('POST', '/simulations', { personId: 'p_self' }), /yourself/);
  const sim = await api('POST', '/simulations', { personId: 'p_yosef' });
  await assert.rejects(api('POST', `/simulations/${sim.id}/messages`, { text: 'salut' }), (e) => e.status === 503);
});
