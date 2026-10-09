// Memory proposals: changes the model suggests and the user accepts or rejects.
// Nothing here runs without an explicit accept from the user (see server/index.js).

import { z } from 'zod';
import { EventInput, QuestionInput, PatternInput, BeliefInput, PersonInput, EVENT_CATEGORIES, LABELS } from './model.js';

export const PROPOSAL_KINDS = [
  'add_event', 'correct_event', 'annotate_event', 'add_question', 'update_question',
  'add_pattern', 'update_pattern', 'add_belief', 'add_person', 'update_person', 'respond_to_interpretation',
];

const CORRECTABLE = ['date', 'title', 'summary', 'personIds', 'category', 'initiatorId', 'contactEffect', 'contactActorId', 'datePrecision'];

const DATA = {
  add_event: EventInput.extend({ category: z.enum(EVENT_CATEGORIES).default('other') }),
  correct_event: z.object({ field: z.enum(CORRECTABLE), value: z.any(), reason: z.string().default('') }),
  annotate_event: z.object({ kind: z.enum(['interpretation', 'note', 'link']), text: z.string().min(1), author: z.enum(['user', 'oracle']).default('oracle') }),
  add_question: QuestionInput,
  update_question: QuestionInput.partial(),
  add_pattern: PatternInput,
  update_pattern: PatternInput.partial(),
  add_belief: BeliefInput.extend({ supersedes: z.string().optional() }),
  add_person: PersonInput,
  update_person: PersonInput.partial(),
  respond_to_interpretation: z.object({ status: z.enum(['retained', 'revised', 'rejected']), userResponse: z.string().default('') }),
};

const NEEDS_TARGET = new Set(['correct_event', 'annotate_event', 'update_question', 'update_pattern', 'update_person', 'respond_to_interpretation']);
const TARGET_COLLECTION = {
  correct_event: 'events', annotate_event: 'events', update_question: 'questions', update_pattern: 'patterns',
  update_person: 'people', respond_to_interpretation: 'interpretations',
};

// Turns a raw model proposal into a validated pending proposal (or one marked invalid, with the reason).
export function validateProposal(store, raw) {
  const p = {
    kind: raw.kind, target_id: raw.target_id || null, summary: raw.summary || '', rationale: raw.rationale || '',
    label: LABELS.includes(raw.label) ? raw.label : 'inferred', status: 'pending', error: null, data: null,
  };
  try {
    if (!PROPOSAL_KINDS.includes(p.kind)) throw new Error(`unknown kind ${p.kind}`);
    let data = raw.data_json;
    if (typeof data === 'string') data = JSON.parse(data || '{}');
    p.data = DATA[p.kind].parse(data || {});
    if (p.kind.startsWith('update_')) p.data = Object.fromEntries(Object.entries(p.data).filter(([k]) => k in (data || {})));
    if (NEEDS_TARGET.has(p.kind)) {
      if (!p.target_id) throw new Error('missing target_id');
      store.get(TARGET_COLLECTION[p.kind], p.target_id);
    }
    // References must point at things that exist; the model must not invent ids.
    const refs = [...(p.data.personIds || []), ...(p.data.supportingEventIds || []), ...(p.data.counterEventIds || []),
      ...(p.data.evidenceEventIds || []), ...(p.data.relatedEventIds || [])];
    for (const id of refs) if (!store.find(id)) throw new Error(`unknown reference ${id}`);
  } catch (e) {
    p.status = 'invalid';
    p.error = e.message;
  }
  return p;
}

// Applies an accepted proposal. Returns a short description of what was stored.
export function applyProposal(store, p) {
  if (p.status !== 'pending') throw new Error(`proposal is ${p.status}`);
  const d = structuredClone(p.data);
  switch (p.kind) {
    case 'add_event': {
      const e = store.create('events', { source: 'conversation', ...d, label: d.label || 'recorded' }, { by: 'user-accepted' });
      return { collection: 'events', id: e.id };
    }
    case 'correct_event': {
      const a = store.annotateEvent(p.target_id, { kind: 'correction', field: d.field, value: d.value, text: d.reason || p.summary, author: 'user', label: 'recorded' });
      return { collection: 'events', id: p.target_id, annotationId: a.id };
    }
    case 'annotate_event': {
      const a = store.annotateEvent(p.target_id, { ...d, label: p.label });
      return { collection: 'events', id: p.target_id, annotationId: a.id };
    }
    case 'add_question': return { collection: 'questions', id: store.create('questions', d, { by: 'user-accepted' }).id };
    case 'update_question': store.update('questions', p.target_id, d, { by: 'user-accepted', reason: p.summary }); return { collection: 'questions', id: p.target_id };
    case 'add_pattern': return { collection: 'patterns', id: store.create('patterns', { origin: 'oracle', ...d }, { by: 'user-accepted' }).id };
    case 'update_pattern': store.update('patterns', p.target_id, d, { by: 'user-accepted', reason: p.summary }); return { collection: 'patterns', id: p.target_id };
    case 'add_belief': {
      const { supersedes, ...b } = d;
      const created = store.create('beliefs', { source: 'conversation', ...b }, { by: 'user-accepted' });
      if (supersedes && store.find(supersedes)) store.update('beliefs', supersedes, { supersededBy: created.id }, { by: 'user-accepted', reason: 'superseded by a later belief' });
      return { collection: 'beliefs', id: created.id };
    }
    case 'add_person': return { collection: 'people', id: store.create('people', d, { by: 'user-accepted' }).id };
    case 'update_person': store.update('people', p.target_id, d, { by: 'user-accepted', reason: p.summary }); return { collection: 'people', id: p.target_id };
    case 'respond_to_interpretation': store.update('interpretations', p.target_id, d, { by: 'user', reason: 'user response' }); return { collection: 'interpretations', id: p.target_id };
    default: throw new Error(`unknown kind ${p.kind}`);
  }
}
