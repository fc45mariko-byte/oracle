import { navigate } from '../router.js';
import { get, post, patch, del } from '../api.js';
import { esc, label, eventRow, field, formData, lines, toast, ask } from '../ui.js';

export async function render(el, id) {
  if (id) return renderOne(el, id);
  const [patterns, people] = await Promise.all([get('/patterns'), get('/people')]);
  const byStatus = (s) => patterns.filter((p) => p.status === s);
  const card = (p) => `<a class="card" href="#/patterns/${p.id}"><div class="spread"><h3>${esc(p.title)}</h3>${label(p.label)}</div><p>${esc(p.description)}</p>
    <div class="meta">confidence ${esc(p.confidence)} · ${p.supportingEventIds.length} supporting · ${p.counterEventIds.length} counter · ${esc(p.origin)}</div>
    <div class="bar" style="margin-top:8px"><i style="width:${Math.round(100 * p.supportingEventIds.length / Math.max(1, p.supportingEventIds.length + p.counterEventIds.length))}%"></i></div></a>`;
  el.innerHTML = `
    <h1>What repeats?<br>What changes?</h1>
    <p class="sub">Patterns are hypotheses with evidence and counterexamples. That something recurs is not an explanation of why. Patterns can weaken, split or become obsolete.</p>
    ${byStatus('active').map(card).join('') || '<div class="empty">No active patterns.</div>'}
    ${byStatus('weakened').length ? `<div class="section-head"><h2>Weakened</h2></div>${byStatus('weakened').map(card).join('')}` : ''}
    ${byStatus('split').length || byStatus('obsolete').length ? `<div class="section-head"><h2>Split or obsolete</h2></div>${[...byStatus('split'), ...byStatus('obsolete')].map(card).join('')}` : ''}
    <details class="card" style="margin-top:20px"><summary>Propose a pattern yourself</summary>
      <form id="newPat" style="margin-top:12px">
        ${field('title', 'Name it')}
        ${field('description', 'What recurs?', { type: 'textarea', rows: 3 })}
        ${field('alternatives', 'Possible explanations (one per line)', { type: 'textarea', rows: 3 })}
        ${field('personId', 'About', { options: [['', '—'], ...people.map((p) => [p.id, p.isSelf ? 'Me' : p.name])] })}
        <button class="btn primary">Add as a hypothesis</button>
        <div class="small" style="margin-top:8px">Link supporting events and counterexamples from the pattern’s page.</div>
      </form></details>`;
  el.querySelector('#newPat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    if (!d.title.trim() || !d.description.trim()) return;
    const p = await post('/patterns', { title: d.title, description: d.description, alternatives: lines(d.alternatives), personIds: d.personId ? [d.personId] : [], origin: 'user', label: 'inferred' });
    navigate(`#/patterns/${p.id}`);
  });
}

async function renderOne(el, id) {
  const [p, events] = await Promise.all([get(`/patterns/${id}`), get('/events')]);
  const ev = (eid) => events.find((e) => e.id === eid);
  const sup = p.supportingEventIds.map(ev).filter(Boolean);
  const cnt = p.counterEventIds.map(ev).filter(Boolean);
  el.innerHTML = `
    <a class="back" href="#/patterns">← Patterns</a>
    <div class="row">${label(p.label)}<span class="chip">${esc(p.status)}</span><span class="chip">confidence ${esc(p.confidence)}</span><span class="chip">${esc(p.origin)}</span></div>
    <h1 style="font-size:26px;margin-top:10px">${esc(p.title)}</h1>
    <p style="color:var(--text-2)">${esc(p.description)}</p>
    ${p.evidenceNotes ? `<div class="card"><div class="meta">Evidence notes</div><p style="margin-top:6px">${esc(p.evidenceNotes)}</p></div>` : ''}
    ${p.alternatives.length ? `<div class="section-head"><h2>Possible explanations</h2></div><div class="card">${p.alternatives.map((a) => `<p>${label('contested')} ${esc(a)}</p>`).join('')}</div>` : ''}
    <div class="section-head"><h2>Supporting (${sup.length})</h2></div>${sup.map(eventRow).join('') || '<div class="empty">None linked.</div>'}
    <div class="section-head"><h2>Counterexamples (${cnt.length})</h2></div>${cnt.map(eventRow).join('') || '<div class="empty">None linked. Looking for them is part of testing the pattern.</div>'}
    ${p.revisionConditions ? `<div class="section-head"><h2>Revise if</h2></div><div class="card"><p>${esc(p.revisionConditions)}</p></div>` : ''}
    <details class="card" style="margin-top:16px"><summary>Update this pattern</summary>
      <form id="upd" style="margin-top:12px">
        <div class="grid2">${field('status', 'Status', { options: ['active', 'weakened', 'split', 'obsolete'], value: p.status })}${field('confidence', 'Confidence', { options: ['low', 'moderate', 'high'], value: p.confidence })}</div>
        ${field('label', 'Epistemic label', { options: ['observed', 'inferred', 'contested', 'unknown', 'superseded'], value: p.label })}
        ${field('addSupport', 'Add a supporting event', { options: [['', '—'], ...events.filter((e) => !p.supportingEventIds.includes(e.id)).map((e) => [e.id, `${e.current.date || 'undated'} · ${e.current.title}`])] })}
        ${field('addCounter', 'Add a counterexample', { options: [['', '—'], ...events.filter((e) => !p.counterEventIds.includes(e.id)).map((e) => [e.id, `${e.current.date || 'undated'} · ${e.current.title}`])] })}
        ${field('evidenceNotes', 'Evidence notes', { type: 'textarea', rows: 3, value: p.evidenceNotes })}
        ${field('_reason', 'What changed? (kept in the history)')}
        <button class="btn primary">Save</button>
      </form></details>
    ${p.history?.length ? `<details style="margin-top:12px"><summary>Revision history (${p.history.length})</summary>${p.history.slice().reverse().map((h) => `<div class="small" style="margin:8px 0">${esc(h.at.slice(0, 10))} · ${esc(h.by)}${h.reason ? ` · ${esc(h.reason)}` : ''}<br><span class="mono">${esc(JSON.stringify(h.before).slice(0, 400))}</span></div>`).join('')}</details>` : ''}
    <div class="small" style="margin-top:12px">First identified ${esc(p.createdAt.slice(0, 10))} · last reviewed ${esc(p.updatedAt.slice(0, 10))}</div>
    <hr class="soft"><button class="btn danger sm" id="delete">Delete pattern</button>`;
  el.querySelector('#upd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const body = { status: d.status, confidence: d.confidence, label: d.label, evidenceNotes: d.evidenceNotes, _reason: d._reason };
    if (d.addSupport) body.supportingEventIds = [...p.supportingEventIds, d.addSupport];
    if (d.addCounter) body.counterEventIds = [...p.counterEventIds, d.addCounter];
    await patch(`/patterns/${id}`, body);
    toast('Saved. The previous version is in the history.');
    renderOne(el, id);
  });
  el.querySelector('#delete').addEventListener('click', async () => {
    if (!await ask({ title: 'Delete this pattern?', body: 'Marking it obsolete instead keeps its history.', confirmLabel: 'Delete pattern', danger: true })) return;
    await del(`/patterns/${id}`);
    navigate('#/patterns');
  });
}
