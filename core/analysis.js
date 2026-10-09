// Deterministic analyses over the record. These compute facts (counts, intervals) so that the model
// does not have to estimate them, and so that the user can check them.

import { currentEvent, byChronology } from './model.js';

const DAY = 86400000;

function toDate(ev) {
  const v = currentEvent(ev);
  if (!v.date || v.datePrecision !== 'day') return null;
  return new Date(`${v.date}T00:00:00Z`);
}

const cuts = (e) => ['cut', 'reopen_then_cut'].includes(currentEvent(e).contactEffect);
const reopens = (e) => ['reopen', 'reopen_then_cut'].includes(currentEvent(e).contactEffect);

// For every event that cut contact, find the next event that reopened it and measure the gap.
// Days are only computed when both dates are known to the day.
export function returnIntervals(events, personId) {
  const evs = events.filter((e) => e.personIds.includes(personId) && e.date).sort(byChronology);
  const out = [];
  evs.forEach((e, i) => {
    if (!cuts(e)) return;
    const next = evs.slice(i + 1).find(reopens);
    const a = toDate(e), b = next && toDate(next);
    out.push({
      cutId: e.id, cutDate: currentEvent(e).date, cutBy: e.contactActorId,
      returnId: next?.id || null, returnDate: next ? currentEvent(next).date : null, returnedBy: next?.contactActorId || null,
      days: a && b ? Math.round((b - a) / DAY) : null,
    });
  });
  return out;
}

export function cutsBy(events) {
  const out = {};
  for (const e of events) {
    if (!cuts(e)) continue;
    const k = e.contactActorId || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function personSummaryStats(store, personId) {
  const events = store.data.events.filter((e) => e.personIds.includes(personId));
  const dated = events.filter((e) => e.date).sort(byChronology);
  const intervals = returnIntervals(store.data.events, personId);
  const known = intervals.filter((x) => x.days != null).map((x) => x.days);
  return {
    eventCount: events.length,
    firstDate: dated[0]?.date || null,
    lastDate: dated.at(-1)?.date || null,
    cutsBy: cutsBy(events),
    intervals,
    intervalRange: known.length ? [Math.min(...known), Math.max(...known)] : null,
  };
}

// Plain-text rendering used in prompts and the UI.
export function describeIntervals(stats, names = {}) {
  const n = (id) => names[id] || id || 'unknown';
  const lines = stats.intervals.map((x) =>
    `${x.cutDate} cut by ${n(x.cutBy)} → ${x.returnDate ? `${x.returnDate} reopened by ${n(x.returnedBy)}` : 'no reopening recorded yet'}${x.days != null ? ` (${x.days} days)` : ''}`);
  return lines.join('\n');
}
