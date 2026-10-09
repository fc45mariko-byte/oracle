// Memory retrieval. Builds a selective, traceable context for one user message.
//
// It does not attach every memory to every prompt. It always includes a compact chronology index
// for the people in focus (one line per event: cheap, and it lets the model reason about sequence),
// then adds full detail only for the events that score highest. Every included item is
// recorded in `trace` with the reason it was included, and the UI shows this to the user.

import { currentEvent, byChronology } from './model.js';
import { personSummaryStats, describeIntervals } from './analysis.js';

const STOP = new Set(`a an the and or but if of to in on at for with by from as is are was were be been being it its this that these those
i me my mine you your he him his she her they them their we us our what which who whom why how when where do does did done
not no yes so than then there here just about into over after before again also very can could would should will shall may might
have has had having im i'm dont don't didnt didn't up out more most some any all one two get got
le la les un une des du de et ou mais si à au aux en dans sur pour par avec que qui quoi est sont était je tu il elle nous vous ils elles
me te se mon ma mes ton ta tes son sa ses ce cette ces pas ne plus`.split(/\s+/));

const MONTHS = {
  january: '01', jan: '01', janvier: '01', february: '02', feb: '02', fevrier: '02', march: '03', mar: '03', mars: '03',
  april: '04', apr: '04', avril: '04', may: '05', mai: '05', june: '06', jun: '06', juin: '06', july: '07', jul: '07', juillet: '07',
  august: '08', aug: '08', aout: '08', september: '09', sep: '09', sept: '09', septembre: '09', october: '10', oct: '10', octobre: '10',
  november: '11', nov: '11', novembre: '11', december: '12', dec: '12', decembre: '12',
};

// Light concept expansion: everyday words → themes used in the record. Kept small and explicit.
const EXPANSIONS = {
  feel: ['love', 'declaration', 'asymmetry'], feeling: ['love', 'declaration', 'asymmetry'], love: ['declaration', 'asymmetry', 'limit'],
  care: ['love', 'declaration'], sex: ['sexual', 'chemistry', 'intimacy'], chemistry: ['sexual', 'intimacy'],
  jealous: ['jealousy', 'other', 'partner'], jealousy: ['other', 'partner'], block: ['blocking', 'rupture'], ghost: ['blocking', 'rupture', 'withdrawal'],
  commitment: ['limit', 'declaration', 'relationship'], serious: ['relationship', 'expectation'], consent: ['boundarie', 'consent'],
  promise: ['promise', 'change'], change: ['promise', 'change'],
};

export function normalize(s = '') {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'");
}

export function tokenize(s) {
  return normalize(s).split(/[^a-z0-9€]+/).filter((t) => t.length > 1 && !STOP.has(t)).map(stem);
}

// Very light stemming so that "blocked"/"blocks"/"blocking" match.
function stem(t) {
  return t.replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1') || t;
}

function eventText(ev) {
  const v = currentEvent(ev);
  return [v.title, v.original, v.summary, v.feelingAtTime, v.interpretationAtTime, (v.themes || []).join(' '),
    (v.quotes || []).map((q) => q.text).join(' '), (v.annotations || []).filter((a) => a.status === 'active').map((a) => a.text).join(' ')].join(' ');
}

// Extract date hints from the query: "june 18", "18 june", "september 2026", "2025", "2025-10-05".
export function dateHints(query) {
  const q = normalize(query);
  const hints = [];
  for (const m of q.matchAll(/\b(20\d\d)-(\d\d)(?:-(\d\d))?\b/g)) hints.push(m[3] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}`);
  const monthRe = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
  for (const m of q.matchAll(new RegExp(`\\b(?:(\\d{1,2})(?:st|nd|rd|th|er)?\\s+)?(${monthRe})\\b(?:\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b)?(?:,?\\s+(20\\d\\d))?`, 'g'))) {
    const day = m[1] || m[3];
    if (m[2] === 'may' && !day && !m[4]) continue; // "may" is usually the verb
    if (m[2] === 'mar' && !day && !m[4]) continue; // "mar" ambiguous
    hints.push({ month: MONTHS[m[2]], day: day ? day.padStart(2, '0') : null, year: m[4] || null });
  }
  for (const m of q.matchAll(/\b(202\d)\b/g)) hints.push({ year: m[1] });
  return hints;
}

function dateScore(ev, hints) {
  const d = currentEvent(ev).date;
  if (!d) return 0;
  let best = 0;
  for (const h of hints) {
    if (typeof h === 'string') { if (d.startsWith(h) || h.startsWith(d)) best = Math.max(best, h.length === 10 && d === h ? 6 : 3); continue; }
    const [y, m, dd] = d.split('-');
    if (h.month && h.month !== m) continue;
    if (h.year && h.year !== y) continue;
    if (h.day && dd && h.day === dd) best = Math.max(best, 6);
    else if (h.day && dd) continue;
    else if (h.month) best = Math.max(best, 2.5);
    else if (h.year) best = Math.max(best, 0.5);
  }
  return best;
}

export function detectPeople(store, text) {
  const q = ` ${normalize(text)} `;
  const found = [];
  for (const p of store.data.people) {
    if (p.isSelf) continue;
    const names = [p.name, ...(p.aliases || [])].filter((n) => n.length > 2).map(normalize);
    if (names.some((n) => new RegExp(`[^a-z]${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(q))) found.push(p.id);
  }
  return found;
}

// BM25 over events.
function bm25(events, queryTokens) {
  const docs = events.map((e) => tokenize(eventText(e)));
  const N = docs.length || 1;
  const avg = docs.reduce((s, d) => s + d.length, 0) / N || 1;
  const df = new Map();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const k1 = 1.2, b = 0.75;
  return docs.map((d) => {
    const tf = new Map();
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const t of new Set(queryTokens)) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.length / avg));
    }
    return s;
  });
}

const oneLine = (ev) => {
  const v = currentEvent(ev);
  const corrected = (ev.annotations || []).some((a) => a.kind === 'correction' && a.status === 'active');
  return `[${ev.id}] ${v.date || 'undated'}${v.datePrecision && v.datePrecision !== 'day' ? ` (${v.datePrecision})` : ''} · ${v.title}${corrected ? ' · (corrected)' : ''}`;
};

export function renderEvent(ev, store) {
  const v = currentEvent(ev);
  const name = (id) => store.data.people.find((p) => p.id === id)?.name || id;
  const lines = [
    `EVENT ${ev.id} · ${v.date || 'undated'} (${v.datePrecision}) · ${v.category} · label: ${v.label} · source: ${v.source}`,
    `Title: ${v.title}`,
    `Original record (user's words, verbatim): ${v.original}`,
  ];
  if (v.summary) lines.push(`Neutral summary (added at import, not the user's words): ${v.summary}`);
  if (v.dateNote) lines.push(`Date note: ${v.dateNote}`);
  if (v.initiatorId) lines.push(`Initiated by: ${v.initiatorId === 'mutual' ? 'both' : name(v.initiatorId)}`);
  if (v.contactEffect && v.contactEffect !== 'none') lines.push(`Effect on contact: ${v.contactEffect}${v.contactActorId ? ` (by ${name(v.contactActorId)})` : ''}`);
  if (v.feelingAtTime) lines.push(`Feeling at the time (reported): ${v.feelingAtTime}`);
  if (v.interpretationAtTime) lines.push(`Interpretation at the time: ${v.interpretationAtTime}`);
  for (const q of v.quotes || []) lines.push(`Quote, ${q.speaker}: "${q.text}"`);
  for (const a of v.ambiguities || []) lines.push(`Ambiguity in the record: ${a}`);
  for (const a of ev.annotations || []) {
    const st = a.status !== 'active' ? ` [${a.status}]` : '';
    if (a.kind === 'correction') lines.push(`Correction (${a.at.slice(0, 10)})${st}: ${a.field} changed from ${JSON.stringify(a.from)} to ${JSON.stringify(a.value)}. Reason: ${a.text}`);
    else lines.push(`Later ${a.kind} by ${a.author} (${a.at.slice(0, 10)}, ${a.label})${st}: ${a.text}`);
  }
  if (v.relatedEventIds?.length) lines.push(`Related events: ${v.relatedEventIds.join(', ')}`);
  return lines.join('\n');
}

function renderPerson(p) {
  const L = [`PERSON ${p.id} · ${p.name}${p.isSelf ? ' (the user)' : ''}`];
  if (p.context) L.push(`Context: ${p.context}`);
  if (p.howMet) L.push(`How they met: ${p.howMet}`);
  if (p.explicitStatements?.length) L.push(`Explicitly communicated (recorded):\n- ${p.explicitStatements.join('\n- ')}`);
  if (p.observations?.length) L.push(`Observed behaviour (recorded):\n- ${p.observations.join('\n- ')}`);
  if (p.unknowns?.length) L.push(`Unknown:\n- ${p.unknowns.join('\n- ')}`);
  if (p.notes) L.push(`Notes: ${p.notes}`);
  return L.join('\n');
}

function renderPattern(p) {
  return [`PATTERN ${p.id} · ${p.title} · ${p.label} · confidence ${p.confidence} · ${p.status} · origin ${p.origin}`,
    p.description,
    p.supportingEventIds.length ? `Supporting events: ${p.supportingEventIds.join(', ')}` : '',
    p.counterEventIds.length ? `Counterexamples: ${p.counterEventIds.join(', ')}` : '',
    p.evidenceNotes ? `Evidence notes: ${p.evidenceNotes}` : '',
    p.alternatives.length ? `Alternative explanations: ${p.alternatives.join('; ')}` : '',
    p.revisionConditions ? `Revise if: ${p.revisionConditions}` : '',
    `Last reviewed: ${(p.updatedAt || '').slice(0, 10)}`].filter(Boolean).join('\n');
}

function renderQuestion(q) {
  return [`QUESTION ${q.id} · ${q.status} · ${q.text}`, q.whyItMatters && `Why it matters: ${q.whyItMatters}`,
    q.possibleAnswers.length && `Possible answers: ${q.possibleAnswers.join('; ')}`,
    q.discriminatingEvidence && `What would help decide: ${q.discriminatingEvidence}`,
    q.evidenceEventIds.length && `Evidence events: ${q.evidenceEventIds.join(', ')}`].filter(Boolean).join('\n');
}

function renderBelief(b) {
  return `BELIEF ${b.id} · ${b.asOf || 'undated'} · about ${b.subject} · ${b.label}${b.supersededBy ? ` · later superseded by ${b.supersededBy}` : ''} · source ${b.source}\n${b.text}`;
}

function renderInterp(i) {
  return `ORACLE-INTERPRETATION ${i.id} · ${i.status} · ${i.label} · source ${i.source} · ${(i.createdAt || '').slice(0, 10)}\n${i.text}${i.userResponse ? `\nUser's response: ${i.userResponse}` : ''}`;
}

/**
 * @param {import('./store.js').Store} store
 * @param {{ text: string, focusPersonIds?: string[], recentText?: string, maxEvents?: number }} opts
 */
export function retrieve(store, { text, focusPersonIds = [], recentText = '', maxEvents = 12 }) {
  const trace = [];
  const add = (id, type, reason, score) => trace.push({ id, type, reason, ...(score != null ? { score: +score.toFixed(2) } : {}) });

  // People in focus: mentioned in this message, in recent turns, or pinned by the conversation.
  const mentioned = detectPeople(store, text);
  const recent = detectPeople(store, recentText);
  const focus = [...new Set([...mentioned, ...focusPersonIds, ...recent])];
  const self = store.data.people.find((p) => p.isSelf);

  const sections = [];
  const people = focus.map((id) => store.data.people.find((p) => p.id === id)).filter(Boolean);
  if (self) people.unshift(self);
  for (const p of people) add(p.id, 'person', p.isSelf ? 'the user' : mentioned.includes(p.id) ? 'mentioned in this message' : 'in focus in this conversation');
  if (people.length) sections.push(['PEOPLE', people.map(renderPerson).join('\n\n')]);

  // Chronology index for people in focus (or everything, if nobody is in focus and the record is small).
  const others = people.filter((p) => !p.isSelf).map((p) => p.id);
  const all = store.list('events');
  // The index covers the people in focus and the people they share events with (Jibril → Yosef).
  const circle = new Set(others);
  for (const e of all) if (e.personIds.some((id) => others.includes(id))) e.personIds.forEach((id) => circle.add(id));
  if (self) circle.delete(self.id);
  const scoped = circle.size ? all.filter((e) => e.personIds.some((id) => circle.has(id))) : (all.length <= 80 ? all : []);
  if (scoped.length) {
    sections.push(['CHRONOLOGY INDEX (one line per recorded event; full detail below only for the most relevant)', scoped.map(oneLine).join('\n')]);
    add('chronology', 'index', `${scoped.length} events, one line each`);
  }

  // Score events. Person names are left out of the lexical query (people are handled by focus),
  // otherwise every event that mentions the name would match.
  // Names of people who appear across many events don't discriminate between them, so they are dropped
  // (their events get the person boost instead). Rare names, like a one-off third party, are kept.
  const eventCount = (id) => all.filter((e) => e.personIds.includes(id)).length;
  const nameTokens = new Set(store.data.people.filter((p) => !p.isSelf && eventCount(p.id) > 5)
    .flatMap((p) => tokenize([p.name, ...(p.aliases || [])].join(' '))));
  const base = tokenize(text);
  const expanded = base.flatMap((t) => (EXPANSIONS[t] || []).map(stem));
  const qTokens = base.concat(expanded, tokenize(recentText).slice(0, 40)).filter((t) => !nameTokens.has(t));
  const hints = dateHints(text);
  const lexical = bm25(all, qTokens);
  const scored = all.map((ev, i) => {
    let s = lexical[i];
    const ds = dateScore(ev, hints);
    s += ds;
    if (others.length && ev.personIds.some((id) => others.includes(id))) s += 0.3;
    return { ev, s, ds, lex: lexical[i] };
  }).filter((x) => x.s > 0.6).sort((a, b) => b.s - a.s);

  const picked = new Map();
  for (const x of scored.slice(0, maxEvents)) {
    picked.set(x.ev.id, x.ev);
    add(x.ev.id, 'event', x.ds >= 2 ? 'date in your message matches' : 'words in your message match', x.s);
  }
  // Temporal neighbours: an event asked about by its exact date comes with the events just before and after it.
  const dated = all.filter((e) => e.date);
  for (const x of scored.filter((y) => y.ds >= 6).slice(0, 2)) {
    const i = dated.indexOf(x.ev);
    for (const n of [dated[i - 1], dated[i + 1]]) {
      if (n && !picked.has(n.id)) { picked.set(n.id, n); add(n.id, 'event', `just before or after ${x.ev.id}`); }
    }
  }
  // Ranges: "between X and Y", "from X to Y", "since X". Include the events between the two best anchors.
  if (/\b(between|from|since|until|till|entre|depuis|jusqu)\b/i.test(text)) {
    const anchors = scored.slice(0, 2).filter((x) => x.s >= 3).map((x) => x.ev).sort(byChronology);
    if (anchors.length === 2) {
      const i = dated.indexOf(anchors[0]), j = dated.indexOf(anchors[1]);
      for (const ev of dated.slice(i + 1, j).slice(0, 15)) {
        if (!picked.has(ev.id)) { picked.set(ev.id, ev); add(ev.id, 'event', 'between the events you named'); }
      }
    }
  }
  // Recency: the most recent events (for people in focus, or overall), so a "what now" message
  // has the latest state.
  for (const ev of (others.length ? scoped : all).filter((e) => e.date).slice(others.length ? -4 : -3)) {
    if (!picked.has(ev.id)) { picked.set(ev.id, ev); add(ev.id, 'event', 'most recent in the record'); }
  }
  // Graph expansion: directly related events of the top hits.
  for (const ev of [...picked.values()].slice(0, 6)) {
    for (const r of ev.relatedEventIds || []) {
      const rel = all.find((e) => e.id === r);
      if (rel && !picked.has(r) && picked.size < maxEvents + 6) { picked.set(r, rel); add(r, 'event', `linked to ${ev.id}`); }
    }
  }
  const events = [...picked.values()].sort(byChronology);
  if (events.length) sections.push(['EVENTS IN DETAIL', events.map((e) => renderEvent(e, store)).join('\n\n')]);

  // Patterns, questions, beliefs and interpretations: those touching focus people or picked events,
  // or matching words in the message.
  const pickedIds = new Set(picked.keys());
  const touches = (ids = []) => ids.some((id) => pickedIds.has(id) || others.includes(id));
  const lexHit = (s) => { const t = new Set(tokenize(s)); return qTokens.some((q) => t.has(q)); };

  const patterns = store.data.patterns.filter((p) => p.status !== 'obsolete' && (touches(p.personIds) || touches(p.supportingEventIds) || touches(p.counterEventIds) || lexHit(p.title + ' ' + p.description)));
  for (const p of patterns) add(p.id, 'pattern', 'concerns people or events in focus');
  if (patterns.length) sections.push(['PATTERN LIBRARY (hypotheses, not facts)', patterns.map(renderPattern).join('\n\n')]);

  // Deterministic contact-interval analysis for people in focus, or people of matched patterns.
  const intervalPeople = new Set([...others, ...patterns.flatMap((p) => p.personIds)]);
  for (const pid of intervalPeople) {
    const person = store.data.people.find((p) => p.id === pid);
    if (!person || person.isSelf) continue;
    const stats = personSummaryStats(store, pid);
    if (!stats.intervals.length) continue;
    const names = Object.fromEntries(store.data.people.map((p) => [p.id, p.isSelf ? 'the user' : p.name]));
    sections.push([`COMPUTED CONTACT INTERVALS for ${names[pid]} (computed by code from the record's cut/reopen tags; check them against the original text)`,
      `${describeIntervals(stats, names)}\nCuts recorded by actor: ${JSON.stringify(Object.fromEntries(Object.entries(stats.cutsBy).map(([k, v]) => [names[k] || k, v])))}`]);
    add(`intervals:${pid}`, 'analysis', 'computed contact intervals');
  }

  const questions = store.data.questions.filter((q) => q.status === 'open' && (touches(q.personIds) || touches(q.evidenceEventIds) || lexHit(q.text)));
  for (const q of questions) add(q.id, 'question', 'open question in focus');
  if (questions.length) sections.push(['OPEN QUESTIONS', questions.map(renderQuestion).join('\n\n')]);

  const beliefs = store.data.beliefs.filter((b) => others.includes(b.subject) || ['self', 'relationships'].includes(b.subject) || touches(b.evidenceEventIds))
    .sort((a, b) => (a.asOf || '9999').localeCompare(b.asOf || '9999'));
  for (const b of beliefs) add(b.id, 'belief', 'your stated beliefs over time');
  if (beliefs.length) sections.push(['THE USER\'S INTELLECTUAL HISTORY (what she said she believed, when; ordered by date)', beliefs.map(renderBelief).join('\n\n')]);

  const interps = store.data.interpretations.filter((i) => touches(i.personIds) || touches(i.evidenceIds) || lexHit(i.text))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).slice(-12);
  for (const i of interps) add(i.id, 'interpretation', 'earlier interpretation on this topic');
  if (interps.length) sections.push(['ORACLE\'S EARLIER INTERPRETATIONS (do not re-present these as new; build on, revise or retire them)', interps.map(renderInterp).join('\n\n')]);

  const context = sections.map(([h, body]) => `## ${h}\n${body}`).join('\n\n');
  return { context, trace, focusPersonIds: others };
}
