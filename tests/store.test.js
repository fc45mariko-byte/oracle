import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.js';
import { currentEvent } from '../server/model.js';

test('there is always a self profile', () => {
  const s = freshStore({ seeded: false });
  assert.equal(s.data.people.filter((p) => p.isSelf).length, 1);
  s.deleteAll();
  assert.equal(s.data.people.filter((p) => p.isSelf).length, 1);
});

test('the original record of an event cannot be updated', () => {
  const s = freshStore();
  assert.throws(() => s.update('events', 'e_2025_07_06_rain', { original: 'rewritten' }), /immutable/);
  assert.throws(() => s.annotateEvent('e_2025_07_06_rain', { kind: 'correction', field: 'original', value: 'x', text: 'no' }), /cannot be corrected/);
});

test('partial updates change only the fields sent, and keep history', () => {
  const s = freshStore();
  const before = structuredClone(s.get('people', 'p_yosef'));
  s.update('people', 'p_yosef', { notes: 'new note' }, { reason: 'test' });
  const after = s.get('people', 'p_yosef');
  assert.equal(after.notes, 'new note');
  assert.deepEqual(after.explicitStatements, before.explicitStatements);
  assert.equal(after.isSelf, false);
  assert.equal(after.history.at(-1).before.notes, before.notes);
  assert.equal(after.history.at(-1).reason, 'test');
});

test('corrections apply to the current view without erasing the original value', () => {
  const s = freshStore();
  const id = 'e_2025_07_10_joke';
  const original = s.get('events', id).date;
  const a = s.annotateEvent(id, { kind: 'correction', field: 'date', value: '2025-07-11', text: 'I misremembered', author: 'user' });
  const ev = s.get('events', id);
  assert.equal(ev.date, original, 'stored field unchanged');
  assert.equal(currentEvent(ev).date, '2025-07-11');
  assert.equal(a.from, original);
  s.setAnnotationStatus(id, a.id, 'withdrawn');
  assert.equal(currentEvent(s.get('events', id)).date, original);
  assert.equal(s.get('events', id).annotations.length >= 1, true, 'annotations are never deleted');
});

test('deleting an event removes references to it', () => {
  const s = freshStore();
  s.remove('events', 'e_2025_12_10_jibril');
  assert.ok(!s.data.patterns.some((p) => p.counterEventIds.includes('e_2025_12_10_jibril')));
  assert.ok(!s.data.questions.some((q) => q.evidenceEventIds.includes('e_2025_12_10_jibril')));
});

test('export and import round-trip; merge does not duplicate', () => {
  const s = freshStore();
  const dump = s.exportAll();
  const t = freshStore({ seeded: false });
  t.importAll(dump);
  assert.deepEqual(t.stats(), s.stats());
  t.importAll(dump, { mode: 'merge' });
  assert.deepEqual(t.stats(), s.stats());
  assert.throws(() => t.importAll({ schemaVersion: 99 }), /schema/);
});

test('every mutation is in the audit log', () => {
  const s = freshStore({ seeded: false });
  const p = s.create('people', { name: 'A' });
  s.update('people', p.id, { notes: 'x' });
  s.remove('people', p.id);
  assert.deepEqual(s.data.log.map((l) => l.action), ['create', 'update', 'delete']);
});
