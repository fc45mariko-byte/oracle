import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshStore } from './helpers.js';
import { EVENTS } from '../seed/yosef-events.js';
import { importYosefCase } from '../server/seed.js';
import { COLLECTIONS } from '../server/model.js';
import { personSummaryStats } from '../server/analysis.js';

const RAW = fs.readFileSync(new URL('../seed/yosef-timeline-original.txt', import.meta.url), 'utf8');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

test('every imported timeline event is verbatim from the user’s text (nothing invented)', () => {
  const raw = squash(RAW);
  for (const e of EVENTS) assert.ok(raw.includes(squash(e.original)), `not verbatim: ${e.id}`);
});

test('every line of the user’s timeline is covered by an event (nothing dropped)', () => {
  const originals = squash(EVENTS.map((e) => e.original).join(' '));
  for (const line of RAW.split('\n').map(squash).filter(Boolean)) assert.ok(originals.includes(line), `dropped: ${line}`);
});

test('53 dated timeline events, in the order the user wrote them', () => {
  assert.equal(EVENTS.length, 53);
  const s = freshStore();
  const order = s.list('events').filter((e) => e.source.startsWith('user timeline')).map((e) => e.id);
  assert.deepEqual(order, EVENTS.map((e) => e.id));
});

test('inferred years are flagged on the event', () => {
  for (const e of EVENTS) {
    if (!/\b20\d\d\b/.test(e.original)) assert.match(e.dateNote || '', /inferred/i, e.id);
  }
});

test('all cross-references resolve', () => {
  const s = freshStore();
  const ids = new Set(Object.keys(COLLECTIONS).flatMap((c) => s.data[c].map((x) => x.id)));
  for (const c of Object.keys(COLLECTIONS)) {
    for (const x of s.data[c]) {
      for (const key of ['personIds', 'relatedEventIds', 'supportingEventIds', 'counterEventIds', 'evidenceEventIds', 'evidenceIds']) {
        for (const r of x[key] || []) assert.ok(ids.has(r), `${x.id}.${key} → ${r}`);
      }
    }
  }
});

test('re-importing is idempotent and keeps corrections', () => {
  const s = freshStore();
  s.annotateEvent('e_2025_07_10_joke', { kind: 'correction', field: 'contactActorId', value: 'p_yosef', text: 'he blocked me', author: 'user' });
  const before = s.stats();
  const added = importYosefCase(s);
  assert.deepEqual(s.stats(), before);
  assert.equal(added.events, 0);
  assert.equal(s.get('events', 'e_2025_07_10_joke').annotations.filter((a) => a.kind === 'correction').length, 1);
});

test('computed return intervals match the documented "three weeks" evidence', () => {
  const s = freshStore();
  const { intervals } = personSummaryStats(s, 'p_yosef');
  const days = (cut) => intervals.find((x) => x.cutDate === cut)?.days;
  assert.equal(days('2025-11-03'), 18);
  assert.equal(days('2025-12-26'), 19);
  assert.equal(days('2026-02-13'), 18);
  assert.equal(days('2026-05-31'), 9);
  assert.equal(days('2026-09-27'), 8);
});
