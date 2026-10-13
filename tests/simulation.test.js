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

test('his real messages are in the dossier, without her phone contact or address', () => {
  const d = personaDossier(freshStore(), 'p_yosef');
  assert.match(d, /Mdr mais toi t'aime trop chouiner/);
  assert.match(d, /Je peux passer stv/);
  assert.match(d, /Sa façon d'écrire/);
  assert.doesNotMatch(d, /sittelles|\+33|17 92/i);
});

test('loading the case study again fills in voice samples on an existing profile without touching edits', async () => {
  const { Store, MemoryBackend } = await import('../core/store.js');
  const { importYosefCase } = await import('../seed/import.js');
  const s = freshStore();
  s.update('people', 'p_yosef', { voiceSamples: [], voiceNotes: '', notes: 'my note' });
  importYosefCase(s);
  assert.ok(s.get('people', 'p_yosef').voiceSamples.length >= 5);
  assert.equal(s.get('people', 'p_yosef').notes, 'my note');
  const device = new Store(new MemoryBackend());
  device.importAll(freshStore().exportAll(), { mode: 'merge' });
  device.update('people', 'p_yosef', { voiceSamples: [] });
  device.importAll(freshStore().exportAll(), { mode: 'merge' });
  assert.ok(device.get('people', 'p_yosef').voiceSamples.length >= 5);
});

test('feedback reads the whole simulated chat with the dossier, is stored apart, and is not replayed to the character', async () => {
  const store = freshStore();
  const calls = [];
  const client = { completeText: async (req) => { calls.push(req); return req.tier === 'complex' ? '**En bref** : ton message relance la poursuite.' : 'mdr t’es sérieuse'; } };
  const api = createApi({ store, settings, client });
  const sim = await api('POST', '/simulations', { personId: 'p_yosef' });
  await assert.rejects(api('POST', `/simulations/${sim.id}/feedback`), /at least one message/);
  await api('POST', `/simulations/${sim.id}/messages`, { text: 'tu me manques' });
  const fb = await api('POST', `/simulations/${sim.id}/feedback`);
  assert.equal(fb.feedback.role, 'feedback');
  const req = calls[1];
  assert.equal(req.tier, 'complex');
  assert.match(req.system, /Step 8 — Preserve uncertainty/);
  assert.match(req.system, /effet que ses messages/);
  assert.match(req.messages[0].content, /elle: tu me manques/);
  assert.match(req.messages[0].content, /yosef \(simulé\): mdr t’es sérieuse/);
  await api('POST', `/simulations/${sim.id}/messages`, { text: 'et maintenant ?' });
  assert.ok(!calls[2].messages.some((m) => m.content.includes('En bref')), 'feedback is not sent to the character');
});

test('each reply gets a direction, never the same move as the last two, and the model is told to avoid his recent openers', async () => {
  const { pickDirection, MOVES } = await import('../core/simulation.js');
  for (let i = 0; i < 200; i++) {
    const d = pickDirection(['taquin', 'esquive']);
    assert.ok(!['taquin', 'esquive'].includes(d.move));
    assert.ok(MOVES.some((m) => m.id === d.move));
    assert.ok(d.burst >= 0 && d.burst <= 4);
  }
  const store = freshStore();
  const calls = [];
  const replies = ['Wsh. Ça va ou quoi', 'Mdr t’es grave\nBon vas-y', '[vu]\nautre chose'];
  const client = { completeText: async (req) => { calls.push(req); return replies[calls.length - 1]; } };
  const api = createApi({ store, settings, client });
  const sim = await api('POST', '/simulations', { personId: 'p_yosef' });
  await api('POST', `/simulations/${sim.id}/messages`, { text: 'salut' });
  await api('POST', `/simulations/${sim.id}/messages`, { text: 'tu fais quoi' });
  const third = await api('POST', `/simulations/${sim.id}/messages`, { text: 'réponds' });
  const last = calls[2].messages.at(-1).content;
  assert.match(last, /Consigne pour CETTE réponse/);
  assert.match(last, /« wsh\. ça »/);
  assert.match(last, /« mdr t’es »/);
  assert.equal(third.sim.text, '[vu]', 'a "seen" reply is only that');
  const moves = store.getConversation(sim.id).messages.filter((m) => m.role === 'sim').map((m) => m.move);
  assert.equal(moves.length, 3);
  assert.ok(moves.every(Boolean));
});
