// The offline half of the Yosef evaluation: every case must retrieve the items it depends on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.js';
import { retrieve } from '../core/retrieval.js';
import { CASES } from '../evals/yosef-cases.js';

for (const c of CASES) {
  test(`eval retrieval: ${c.id} (${c.capability})`, () => {
    const r = retrieve(freshStore(), { text: c.message });
    const got = new Set(r.trace.map((t) => t.id));
    assert.deepEqual(c.mustRetrieve.filter((id) => !got.has(id)), []);
  });
}
