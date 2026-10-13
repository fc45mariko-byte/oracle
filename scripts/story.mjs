// Writes the Yosef case study as a readable document: case-study/yosef-story.md.
// Generated from seed/ so it always matches what Oracle holds. Run: npm run story
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, MemoryBackend } from '../core/store.js';
import { importYosefCase } from '../seed/import.js';
import { personSummaryStats } from '../core/analysis.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const s = new Store(new MemoryBackend());
importYosefCase(s);

const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmt = (d, prec) => {
  if (!d) return 'Date unknown';
  const [y, m, day] = d.split('-');
  const t = day ? `${Number(day)} ${M[m - 1]} ${y}` : m ? `${M[m - 1]} ${y}` : y;
  return prec === 'approximate' ? `around ${t}` : t;
};
const title = (e) => s.get('events', e).title;
const name = (id) => ({ p_self: 'you', p_yosef: 'Yosef', mutual: 'both' }[id] || id);
const quote = (t) => t.split('\n').map((l) => `> ${l}`).join('\n');

const out = [];
out.push('# The story with Yosef', '');
out.push('The record Oracle holds about you and Yosef, from November 2024 to October 2026. Your own words are quoted exactly as you wrote them. Everything else is labelled: what was recorded, what is inferred, and what remains unknown.', '');
out.push(`Generated ${new Date().toISOString().slice(0, 10)}.`, '');

out.push('## Where things stand', '');
const narr = s.get('beliefs', 'b_narrative_runs');
out.push(quote(narr.text.replace(/[“”]/g, '')), '');
out.push(s.get('beliefs', 'b_aim').text, '');

out.push('## The timeline', '');
out.push('Each entry gives a short title and a plain summary, then your original words. Where a year was not written, it is inferred from the order of your timeline.', '');
const events = s.list('events').filter((e) => e.date && e.source.startsWith('user timeline'));
let month = '';
for (const e of events) {
  const mk = e.date.slice(0, 7);
  if (mk !== month) { month = mk; const [y, m] = mk.split('-'); out.push(`### ${M[m - 1]} ${y}`, ''); }
  out.push(`**${fmt(e.date, e.datePrecision)}: ${e.title}**`, '');
  if (e.summary) out.push(e.summary, '');
  out.push(quote(e.original.trim()), '');
  for (const a of e.ambiguities || []) out.push(`- *Unclear:* ${a}`);
  for (const a of e.annotations || []) if (a.kind !== 'correction') out.push(`- *Later note (${a.author === 'oracle' ? 'Oracle' : 'you'}, ${a.label}):* ${a.text}`);
  if ((e.ambiguities || []).length || (e.annotations || []).length) out.push('');
}

out.push('## Undated moments', '', 'From the narrative document. They have no recorded date, so they are kept apart from the timeline.', '');
for (const e of s.list('events').filter((x) => !x.source.startsWith('user timeline'))) {
  out.push(`**${e.title}** (${fmt(e.date, e.datePrecision)})`, '', quote(e.original), '');
  if (e.dateNote) out.push(`*About the date:* ${e.dateNote}`, '');
}

out.push('## Contact cut and reopened', '');
out.push('Computed from the timeline: each time contact was cut (a block, a deletion, a declared ending), and how long until it reopened.', '');
const st = personSummaryStats(s, 'p_yosef');
out.push('| Cut | By | Reopened | By | Days |', '|---|---|---|---|---|');
for (const x of st.intervals) out.push(`| ${fmt(x.cutDate)} | ${name(x.cutBy) || 'unclear'} | ${x.returnDate ? fmt(x.returnDate) : 'not yet'} | ${x.returnedBy ? name(x.returnedBy) : 'unclear'} | ${x.days ?? '–'} |`);
out.push('', `Contact cut by Yosef: ${st.cutsBy.p_yosef || 0} times. By you: ${st.cutsBy.p_self || 0}. Unclear: ${st.cutsBy.unknown || 0}.`, '');

out.push('## Patterns', '', 'These are hypotheses, not verdicts. Each lists what supports it, what speaks against it, and other explanations.', '');
for (const p of s.data.patterns) {
  out.push(`### ${p.title}`, '', `*${p.label}, confidence ${p.confidence}*`, '', p.description, '');
  if (p.evidenceNotes) out.push(p.evidenceNotes, '');
  if (p.supportingEventIds.length) out.push(`**Supports it:** ${p.supportingEventIds.map((id) => { const e = s.get('events', id); return `${fmt(e.date, e.datePrecision)} (${e.title})`; }).join('; ')}.`, '');
  if (p.counterEventIds.length) out.push(`**Speaks against it:** ${p.counterEventIds.map((id) => { const e = s.get('events', id); return `${fmt(e.date, e.datePrecision)} (${e.title})`; }).join('; ')}.`, '');
  if (p.alternatives.length) out.push(`**Other explanations:** ${p.alternatives.join('; ')}.`, '');
  if (p.revisionConditions) out.push(`**Would change if:** ${p.revisionConditions}`, '');
}

out.push('## Open questions', '');
for (const q of s.data.questions) {
  out.push(`### ${q.text}`, '');
  if (q.whyItMatters) out.push(q.whyItMatters, '');
  if (q.possibleAnswers.length) out.push(`**Possible answers:** ${q.possibleAnswers.join('; ')}.`, '');
  if (q.discriminatingEvidence) out.push(`**What would help decide:** ${q.discriminatingEvidence}`, '');
}

out.push('## How your view has changed', '', 'What you said you believed, in order. Earlier views are kept, not erased.', '');
for (const b of [...s.data.beliefs].sort((a, c) => (a.asOf || '').localeCompare(c.asOf || ''))) {
  out.push(`- **${fmt(b.asOf, b.datePrecision)}**: ${b.text}${b.supersededBy ? ' *(later superseded)*' : ''}`);
}
out.push('');

out.push('## Earlier interpretations', '', 'Readings offered in your earlier conversations (recorded in the narrative document). They are proposals, not conclusions.', '');
for (const i of s.data.interpretations) out.push(`- ${i.text}`);
out.push('');

out.push('## What remains unknown', '');
for (const u of s.get('people', 'p_yosef').unknowns) out.push(`- ${u}`);
out.push('');

const file = path.join(root, 'case-study', 'yosef-story.md');
fs.writeFileSync(file, out.join('\n'));
console.log(`Wrote ${path.relative(root, file)} (${out.length} lines)`);
