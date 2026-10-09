import { get, post, patch } from '../api.js';
import { esc, label, eventRow, field, formData, lines, toast } from '../ui.js';

export async function render(el, id) {
  if (id) return renderOne(el, id);
  const [qs, people] = await Promise.all([get('/questions'), get('/people')]);
  const group = (s) => qs.filter((q) => q.status === s);
  const card = (q) => `<a class="card" href="#/questions/${q.id}"><p style="font-size:15px;color:var(--text)">${esc(q.text)}</p>${q.whyItMatters ? `<div class="small">${esc(q.whyItMatters)}</div>` : ''}<div class="meta" style="margin-top:6px">${q.possibleAnswers.length} possible answers · ${q.evidenceEventIds.length} events</div></a>`;
  el.innerHTML = `
    <h1>What remains<br>unknown.</h1>
    <p class="sub">You do not have to fill every gap with a theory. These stay open until you decide otherwise, however long that takes.</p>
    ${group('open').map(card).join('') || '<div class="empty">No open questions.</div>'}
    ${group('paused').length ? `<div class="section-head"><h2>Paused</h2></div>${group('paused').map(card).join('')}` : ''}
    ${group('resolved').length || group('dropped').length ? `<div class="section-head"><h2>Resolved or set aside</h2></div>${[...group('resolved'), ...group('dropped')].map(card).join('')}` : ''}
    <details class="card" style="margin-top:20px"><summary>Keep a new question open</summary>
      <form id="newQ" style="margin-top:12px">
        ${field('text', 'The question', { type: 'textarea', rows: 2 })}
        ${field('whyItMatters', 'Why it matters', { type: 'textarea', rows: 2 })}
        ${field('possibleAnswers', 'Possible answers (one per line)', { type: 'textarea', rows: 3 })}
        ${field('personId', 'About', { options: [['', '—'], ...people.map((p) => [p.id, p.isSelf ? 'Me' : p.name])] })}
        <button class="btn primary">Keep this question open</button>
      </form></details>`;
  el.querySelector('#newQ').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    if (!d.text.trim()) return;
    const q = await post('/questions', { text: d.text, whyItMatters: d.whyItMatters, possibleAnswers: lines(d.possibleAnswers), personIds: d.personId ? [d.personId] : [] });
    location.hash = `#/questions/${q.id}`;
  });
}

async function renderOne(el, id) {
  const [q, events] = await Promise.all([get(`/questions/${id}`), get('/events')]);
  const evs = q.evidenceEventIds.map((e) => events.find((x) => x.id === e)).filter(Boolean);
  el.innerHTML = `
    <a class="back" href="#/questions">← Open questions</a>
    <div class="row"><span class="chip">${esc(q.status)}</span>${q.stillInvestigating ? '' : '<span class="chip">not investigating</span>'}</div>
    <h1 style="font-size:26px;margin-top:10px">${esc(q.text)}</h1>
    ${q.whyItMatters ? `<p style="color:var(--text-2)">${esc(q.whyItMatters)}</p>` : ''}
    ${q.possibleAnswers.length ? `<div class="section-head"><h2>Possible answers</h2></div><div class="card">${q.possibleAnswers.map((a) => `<p>${label('contested')} ${esc(a)}</p>`).join('')}</div>` : ''}
    ${q.discriminatingEvidence ? `<div class="section-head"><h2>What would help decide</h2></div><div class="card"><p>${esc(q.discriminatingEvidence)}</p></div>` : ''}
    <div class="section-head"><h2>Evidence so far</h2></div>${evs.map(eventRow).join('') || '<div class="empty">No events linked.</div>'}
    <details class="card" style="margin-top:16px"><summary>Update</summary>
      <form id="upd" style="margin-top:12px">
        ${field('status', 'Status', { options: ['open', 'paused', 'resolved', 'dropped'], value: q.status })}
        ${field('stillInvestigating', 'Do you still want to investigate it?', { options: [['true', 'Yes'], ['false', 'Not now']], value: String(q.stillInvestigating) })}
        ${field('possibleAnswers', 'Possible answers (one per line)', { type: 'textarea', rows: 4, value: q.possibleAnswers.join('\n') })}
        ${field('discriminatingEvidence', 'What would help decide', { type: 'textarea', rows: 2, value: q.discriminatingEvidence })}
        ${field('addEvent', 'Link an event as evidence', { options: [['', '—'], ...events.filter((e) => !q.evidenceEventIds.includes(e.id)).map((e) => [e.id, `${e.current.date || 'undated'} · ${e.current.title}`])] })}
        ${field('_reason', 'What changed? (kept in the history)')}
        <button class="btn primary">Save</button>
      </form></details>
    ${q.history?.length ? `<details style="margin-top:12px"><summary>History (${q.history.length})</summary>${q.history.slice().reverse().map((h) => `<div class="small" style="margin:8px 0">${esc(h.at.slice(0, 10))} · ${esc(h.by)}${h.reason ? ` · ${esc(h.reason)}` : ''}</div>`).join('')}</details>` : ''}`;
  el.querySelector('#upd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const body = { status: d.status, stillInvestigating: d.stillInvestigating === 'true', possibleAnswers: lines(d.possibleAnswers), discriminatingEvidence: d.discriminatingEvidence, _reason: d._reason };
    if (d.addEvent) body.evidenceEventIds = [...q.evidenceEventIds, d.addEvent];
    await patch(`/questions/${id}`, body);
    toast('Saved');
    renderOne(el, id);
  });
}
