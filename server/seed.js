// Imports the Yosef case study into a store. Idempotent: items whose ids already exist are skipped,
// so re-importing never overwrites corrections or annotations made since.

import { buildCase } from '../seed/yosef-case.js';

export function importYosefCase(store) {
  const c = buildCase();
  const added = { people: 0, events: 0, patterns: 0, questions: 0, beliefs: 0, interpretations: 0, annotations: 0 };
  const has = (col, id) => store.data[col].some((x) => x.id === id);

  for (const col of ['people', 'events', 'patterns', 'questions', 'beliefs', 'interpretations']) {
    for (const { id, ...rest } of c[col]) {
      if (has(col, id)) {
        // The self profile exists from the start; fill it in if it is still blank.
        const existing = store.data[col].find((x) => x.id === id);
        if (col === 'people' && existing.isSelf && !existing.explicitStatements.length) {
          store.update('people', id, { explicitStatements: rest.explicitStatements || [] }, { by: 'import', reason: 'case study import' });
        }
        continue;
      }
      store.create(col, rest, { id, by: 'import' });
      added[col]++;
    }
  }
  for (const { eventId, ...a } of c.annotations) {
    const ev = store.data.events.find((e) => e.id === eventId);
    if (!ev || ev.annotations.some((x) => x.text === a.text)) continue;
    store.annotateEvent(eventId, a);
    added.annotations++;
  }
  // Make relatedEventIds symmetric.
  for (const ev of store.data.events) {
    for (const r of ev.relatedEventIds) {
      const other = store.data.events.find((e) => e.id === r);
      if (other && !other.relatedEventIds.includes(ev.id)) other.relatedEventIds.push(ev.id);
    }
  }
  store.persist();
  return added;
}
