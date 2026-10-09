import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.js';
import { retrieve, dateHints } from '../server/retrieval.js';

const events = (r) => r.trace.filter((t) => t.type === 'event').map((t) => t.id);

test('date hints parse common forms', () => {
  assert.deepEqual(dateHints('what happened on june 18?'), [{ month: '06', day: '18', year: null }]);
  assert.deepEqual(dateHints('18 June 2026'), [{ month: '06', day: '18', year: '2026' }, { year: '2026' }]);
  assert.deepEqual(dateHints('I may be wrong'), []);
  assert.ok(dateHints('2025-10-05').includes('2025-10-05'));
});

test('a date question retrieves that event first', () => {
  const r = retrieve(freshStore(), { text: 'What happened on June 18 with Yosef?' });
  assert.equal(events(r)[0], 'e_2026_06_18_witch');
});

test('a name and a topic retrieve the right event', () => {
  const r = retrieve(freshStore(), { text: 'why did he hang up when he heard about Jibril' });
  assert.equal(events(r)[0], 'e_2025_12_10_jibril');
});

test('mentioning a person brings in their profile, chronology index, intervals, patterns and questions', () => {
  const r = retrieve(freshStore(), { text: 'Does Yosef love me?' });
  const types = new Set(r.trace.map((t) => t.type));
  for (const t of ['person', 'index', 'analysis', 'pattern', 'question']) assert.ok(types.has(t), t);
  assert.ok(r.trace.some((t) => t.id === 'q_love'));
  assert.match(r.context, /CHRONOLOGY INDEX/);
});

test('retrieval is selective: not every event is sent in full', () => {
  const s = freshStore();
  const r = retrieve(s, { text: 'Does Yosef love me?' });
  assert.ok(events(r).length < s.data.events.length / 2);
  assert.ok(r.context.length < 60000);
});

test('the latest events are always included, so "now" questions see the current state', () => {
  const r = retrieve(freshStore(), { text: 'I feel strange today' });
  assert.ok(events(r).includes('e_2026_10_08_bac'));
});

test('earlier interpretations are retrieved so they are not rediscovered as new', () => {
  const r = retrieve(freshStore(), { text: 'Is this a reward cycle with Yosef? The intensity when he comes back' });
  assert.ok(r.trace.some((t) => t.id === 'oi_reward_cycle'));
});

test('corrections are visible in retrieved text', () => {
  const s = freshStore();
  s.annotateEvent('e_2025_07_10_joke', { kind: 'correction', field: 'contactActorId', value: 'p_yosef', text: 'he was the one who blocked', author: 'user' });
  const r = retrieve(s, { text: 'the joke about his dad on july 10' });
  assert.match(r.context, /Correction .*contactActorId/);
});
