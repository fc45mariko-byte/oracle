// Oracle data model.
//
// Six memory layers (spec §5), each a collection in the store:
//   1. events         — the original record (immutable `original`), plus annotations/corrections
//   2. people + links — the relationship graph (ids cross-reference across collections)
//   3. patterns       — recurring dynamics stored as hypotheses with evidence and counterexamples
//   4. beliefs        — the user's intellectual history (what she thought, when)
//   5. questions      — the unresolved-question register
//   6. interpretations — Oracle's own interpretive history
// Plus conversations (the dialogue record) and settings.

import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const LABELS = ['recorded', 'observed', 'inferred', 'contested', 'unknown', 'superseded'];
export const Label = z.enum(LABELS);

export const EVENT_CATEGORIES = [
  'meeting', 'contact', 'conversation', 'intimacy', 'conflict', 'rupture', 'return',
  'plan', 'disclosure', 'statement', 'reflection', 'other',
];

export const REQUEST_TYPES = [
  'new_event', 'ask_about_person', 'develop_hypothesis', 'revisit_interpretation',
  'philosophical', 'practical', 'correction', 'expressing_feeling',
];

export const now = () => new Date().toISOString();
export const newId = (prefix) => `${prefix}_${globalThis.crypto.randomUUID().slice(0, 8)}`;

// Dates are partial ISO strings: "2025", "2025-05", "2025-05-13". `datePrecision`
// says how much of it is known; `dateNote` explains inferences (e.g. an inferred year).
const PartialDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Use YYYY, YYYY-MM or YYYY-MM-DD');

export const PersonInput = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  context: z.string().default(''),          // how the user knows them
  howMet: z.string().default(''),
  explicitStatements: z.array(z.string()).default([]), // what the person has explicitly communicated
  observations: z.array(z.string()).default([]),       // directly observed behaviour
  unknowns: z.array(z.string()).default([]),
  notes: z.string().default(''),
  isSelf: z.boolean().default(false),
});

export const EventInput = z.object({
  date: PartialDate.nullable().default(null),
  datePrecision: z.enum(['day', 'month', 'year', 'approximate', 'unknown']).default('day'),
  dateNote: z.string().default(''),
  sortKey: z.string().optional(),            // for ordering undated / same-day events
  personIds: z.array(z.string()).default([]),
  // Who initiated the contact / action, when the record says so: a person id, 'mutual', or null (unknown).
  initiatorId: z.string().nullable().default(null),
  category: z.enum(EVENT_CATEGORIES).default('other'),
  // Effect on contact: 'cut' (block, deletion, declared ending), 'reopen', 'reopen_then_cut', or 'none'.
  contactEffect: z.enum(['cut', 'reopen', 'reopen_then_cut', 'none']).default('none'),
  // Whose action cut or reopened contact (can differ from the initiator: she booked, he blocked).
  contactActorId: z.string().nullable().default(null),
  title: z.string().min(1),
  original: z.string().min(1),               // the user's own words, as first recorded. Never rewritten.
  summary: z.string().default(''),           // neutral restatement (may be edited; original is not)
  quotes: z.array(z.object({ speaker: z.string(), text: z.string() })).default([]),
  feelingAtTime: z.string().default(''),
  interpretationAtTime: z.string().default(''),
  themes: z.array(z.string()).default([]),
  relatedEventIds: z.array(z.string()).default([]),
  source: z.string().default('user'),
  label: Label.default('recorded'),
  ambiguities: z.array(z.string()).default([]), // explicit notes where the record itself is unclear
});

export const AnnotationInput = z.object({
  kind: z.enum(['interpretation', 'correction', 'note', 'link']),
  text: z.string().min(1),
  author: z.enum(['user', 'oracle']).default('user'),
  label: Label.default('inferred'),
  // For corrections: which field is corrected and to what. The original stays readable.
  field: z.string().optional(),
  value: z.any().optional(),
});

export const PatternInput = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  supportingEventIds: z.array(z.string()).default([]),
  counterEventIds: z.array(z.string()).default([]),
  evidenceNotes: z.string().default(''),
  alternatives: z.array(z.string()).default([]),
  confidence: z.enum(['low', 'moderate', 'high']).default('low'),
  label: Label.default('inferred'),
  personIds: z.array(z.string()).default([]),
  revisionConditions: z.string().default(''),
  status: z.enum(['active', 'weakened', 'split', 'obsolete']).default('active'),
  origin: z.enum(['user', 'oracle', 'document']).default('user'),
});

export const QuestionInput = z.object({
  text: z.string().min(1),
  whyItMatters: z.string().default(''),
  evidenceEventIds: z.array(z.string()).default([]),
  possibleAnswers: z.array(z.string()).default([]),
  discriminatingEvidence: z.string().default(''),
  personIds: z.array(z.string()).default([]),
  status: z.enum(['open', 'paused', 'resolved', 'dropped']).default('open'),
  stillInvestigating: z.boolean().default(true),
});

export const BeliefInput = z.object({
  subject: z.string().min(1),                // a person id, or a theme like "relationships", "self"
  text: z.string().min(1),
  asOf: PartialDate.nullable().default(null),
  datePrecision: z.enum(['day', 'month', 'year', 'approximate', 'unknown']).default('day'),
  label: Label.default('recorded'),
  evidenceEventIds: z.array(z.string()).default([]),
  source: z.string().default('user'),
  supersededBy: z.string().nullable().default(null),
});

export const InterpretationInput = z.object({
  text: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
  personIds: z.array(z.string()).default([]),
  label: Label.default('inferred'),
  source: z.string().default('oracle'),     // 'oracle' (this app) or a description of an outside source
  conversationId: z.string().nullable().default(null),
  status: z.enum(['proposed', 'retained', 'revised', 'rejected']).default('proposed'),
  userResponse: z.string().default(''),
});

export const COLLECTIONS = {
  people: { prefix: 'p', schema: PersonInput },
  events: { prefix: 'e', schema: EventInput },
  patterns: { prefix: 'pat', schema: PatternInput },
  questions: { prefix: 'q', schema: QuestionInput },
  beliefs: { prefix: 'b', schema: BeliefInput },
  interpretations: { prefix: 'oi', schema: InterpretationInput },
};

export function emptyStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now(),
    people: [], events: [], patterns: [], questions: [], beliefs: [], interpretations: [],
    conversations: [],
    log: [], // append-only audit log of memory mutations
  };
}

// The "current view" of an event: original record + applied corrections.
// The original values are kept in `corrections[].from`, and `original` itself never changes.
export function currentEvent(ev) {
  const view = { ...ev };
  for (const c of ev.annotations || []) {
    if (c.kind === 'correction' && c.field && c.status !== 'withdrawn' && c.field !== 'original') {
      view[c.field] = c.value;
    }
  }
  return view;
}

// Sort key for chronology. Undated events go last; partial dates sort at the start of their period
// unless an explicit sortKey is given.
export function chronoKey(ev) {
  if (ev.sortKey) return ev.sortKey;
  if (!ev.date) return '9999';
  return ev.date;
}

export function byChronology(a, b) {
  const ka = chronoKey(currentEvent(a)), kb = chronoKey(currentEvent(b));
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}
