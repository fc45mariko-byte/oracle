import { get, post, patch } from '../api.js';
import { esc, label, tile, eventRow, groupByMonth, fmtMonth, fmtDate, field, formData, lines, toast, hrefFor } from '../ui.js';

export async function render(el, id, tab = 'overview') {
  if (id) return renderPerson(el, id, tab);
  const people = await get('/people');
  const others = people.filter((p) => !p.isSelf);
  el.innerHTML = `
    <h1>The people<br>in the story.</h1>
    <p class="sub">Each person’s history, kept separate from your theories about them.</p>
    <div class="tiles">${others.map((p, i) => tile({ href: `#/people/${p.id}`, name: p.name, hint: p.context.split('.')[0], color: ['t-pink', 't-lilac', 't-blue', 't-mint'][i % 4], artKind: ['rings', 'pebble', 'orb', 'prism'][i % 4] })).join('')}
      ${tile({ href: '#/people/_self', name: 'You', hint: 'Your own record', color: 't-dusk', artKind: 'void' })}</div>
    <div class="section-head"><h2>Add a person</h2></div>
    <form id="newPerson" class="card">
      ${field('name', 'Name or label')}
      ${field('context', 'How you know each other')}
      ${field('howMet', 'How and when you met')}
      <button class="btn primary">Add person</button>
    </form>`;
  el.querySelector('#newPerson').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    if (!d.name.trim()) return;
    const p = await post('/people', d);
    location.hash = `#/people/${p.id}`;
  });
}

async function renderPerson(el, id, tab) {
  if (id === '_self') {
    const self = (await get('/people')).find((p) => p.isSelf);
    if (!self) { el.innerHTML = '<div class="empty">No self profile yet. Load the case study or add one in Memory.</div>'; return; }
    id = self.id;
  }
  const o = await get(`/people/${id}/overview`);
  const p = o.person;
  const tabs = [['overview', 'Overview'], ['chronology', 'Chronology'], ['dynamics', 'Patterns & questions'], ['mind', 'How views changed'], ['profile', 'Profile']];
  const body = { overview, chronology, dynamics, mind, profile }[tab] || overview;
  el.innerHTML = `
    <a class="back" href="#/people">← People</a>
    <h1>${esc(p.name)}</h1>
    <p class="sub">${esc(p.context)}</p>
    <div class="pill-tabs">${tabs.map(([k, t]) => `<button class="${k === tab ? 'active' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>
    <div id="body">${body(o)}</div>`;
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/people/${p.id}/${b.dataset.tab}`; }));
  if (tab === 'profile') bindProfile(el, p);
  if (tab === 'mind') bindInterpretations(el);
}

function overview(o) {
  const p = o.person, s = o.stats;
  const latest = o.events.filter((e) => e.current.date).slice(-4).reverse();
  const openQs = o.questions.filter((q) => q.status === 'open');
  const pats = o.patterns.filter((x) => x.status !== 'obsolete');
  const cutsBy = Object.entries(s.cutsBy || {}).map(([k, v]) => `${k === p.id ? esc(p.name) : k === 'p_self' ? 'you' : esc(k)}: ${v}`).join(' · ');
  return `
    ${p.isSelf ? '' : `<div class="card">
      <div class="kv"><dt>How you met</dt><dd>${esc(p.howMet || '—')}</dd>
      <dt>Span</dt><dd>${esc(fmtDate(s.firstDate))} → ${esc(fmtDate(s.lastDate))}</dd>
      <dt>Events</dt><dd>${s.eventCount} in the record</dd>
      ${cutsBy ? `<dt>Contact cut by</dt><dd>${cutsBy}</dd>` : ''}</div>
      <div class="small" style="margin-top:8px">Counts are computed from the record, not interpreted. They are only as accurate as the events’ tags.</div>
    </div>`}
    <div class="section-head"><h2>Recently</h2><a href="#/people/${p.id}/chronology">Full chronology</a></div>
    ${latest.map(eventRow).join('') || '<div class="empty">No events yet.</div>'}
    <div class="section-head"><h2>Patterns</h2><a href="#/people/${p.id}/dynamics">All</a></div>
    ${pats.slice(0, 4).map((x) => `<a class="card" href="#/patterns/${x.id}"><div class="spread"><h3>${esc(x.title)}</h3>${label(x.label)}</div><div class="meta">confidence ${esc(x.confidence)} · ${x.supportingEventIds.length} supporting · ${x.counterEventIds.length} counter</div></a>`).join('') || '<div class="empty">None yet.</div>'}
    <div class="section-head"><h2>Open questions</h2></div>
    ${openQs.slice(0, 4).map((q) => `<a class="card" href="#/questions/${q.id}"><p>${esc(q.text)}</p></a>`).join('') || '<div class="empty">None.</div>'}
    ${p.unknowns?.length ? `<div class="section-head"><h2>Unknown</h2></div><div class="card">${p.unknowns.map((u) => `<p>${label('unknown')} ${esc(u)}</p>`).join('')}</div>` : ''}
    ${p.isSelf ? '' : `<a class="btn primary" style="display:inline-block;margin-top:14px" href="#/talk/new/review/${p.id}">Review this relationship</a>`}`;
}

function chronology(o) {
  const groups = groupByMonth(o.events);
  const s = o.stats;
  const name = (id) => (id === o.person.id ? o.person.name : id === 'p_self' ? 'you' : id || 'unknown');
  const intervals = s.intervals?.length ? `<details class="card"><summary>Contact intervals (computed)</summary>
    <table class="intervals"><tbody>${s.intervals.map((x) => `<tr><td><a href="#/event/${x.cutId}">${esc(fmtDate(x.cutDate))}</a><br><span class="small">cut by ${esc(name(x.cutBy))}</span></td><td>${x.returnId ? `<a href="#/event/${x.returnId}">${esc(fmtDate(x.returnDate))}</a><br><span class="small">reopened by ${esc(name(x.returnedBy))}</span>` : '<span class="small">no reopening yet</span>'}</td><td class="n">${x.days != null ? `${x.days} d` : '—'}</td></tr>`).join('')}</tbody></table>
    <div class="small" style="margin-top:8px">Calculated from each event’s “effect on contact” tag. Correct a tag on the event if it is wrong.</div></details>` : '';
  return `${intervals}${[...groups].map(([k, evs]) => `<div class="month">${esc(fmtMonth(k))}</div>${evs.map(eventRow).join('')}`).join('')}
    <a class="btn" style="display:inline-block;margin-top:16px" href="#/add/${o.person.id}">Add a moment</a>`;
}

function dynamics(o) {
  return `<div class="section-head"><h2>Patterns</h2><a href="#/patterns">Library</a></div>
    ${o.patterns.map((x) => `<a class="card" href="#/patterns/${x.id}"><div class="spread"><h3>${esc(x.title)}</h3>${label(x.label)}</div><p>${esc(x.description)}</p><div class="meta">${esc(x.status)} · confidence ${esc(x.confidence)}</div></a>`).join('') || '<div class="empty">None.</div>'}
    <div class="section-head"><h2>Questions</h2><a href="#/questions">All</a></div>
    ${o.questions.map((q) => `<a class="card" href="#/questions/${q.id}"><p>${esc(q.text)}</p><div class="meta">${esc(q.status)}</div></a>`).join('') || '<div class="empty">None.</div>'}`;
}

function mind(o) {
  const beliefs = [...o.beliefs].sort((a, b) => (a.asOf || '').localeCompare(b.asOf || ''));
  return `<p class="sub">What you said you believed about ${esc(o.person.name)}, in order. Earlier views are kept, not overwritten.</p>
    ${beliefs.map((b) => `<a class="card" href="#/mind/${b.id}"><div class="meta">${esc(fmtDate(b.asOf, b.datePrecision))} ${label(b.supersededBy ? 'superseded' : b.label)} <span>${esc(b.source.split(' (')[0])}</span></div><p style="margin-top:6px">${esc(b.text)}</p></a>`).join('') || '<div class="empty">No recorded beliefs yet.</div>'}
    <div class="section-head"><h2>Oracle’s interpretations</h2></div>
    <p class="sub">What Oracle (or an earlier conversation) has proposed, and what you made of it.</p>
    ${o.interpretations.map(interpCard).join('') || '<div class="empty">None yet.</div>'}`;
}

export function interpCard(i) {
  return `<div class="card" data-interp="${i.id}"><div class="meta">${esc(i.source.split(' (')[0])} · ${esc((i.createdAt || '').slice(0, 10))} ${label(i.label)} <span class="chip">${esc(i.status)}</span></div>
    <p style="margin-top:6px">${esc(i.text)}</p>
    ${i.evidenceIds?.length ? `<div class="small">Evidence: ${i.evidenceIds.map((id) => `<a href="${hrefFor(id)}" style="color:var(--blue)">${esc(id)}</a>`).join(', ')}</div>` : ''}
    ${i.userResponse ? `<div class="small">Your response: ${esc(i.userResponse)}</div>` : ''}
    <div class="row" style="margin-top:8px">${['retained', 'revised', 'rejected'].map((s) => `<button class="btn sm${i.status === s ? ' primary' : ''}" data-status="${s}">${s === 'retained' ? 'Keep' : s === 'revised' ? 'Revise' : 'Reject'}</button>`).join('')}</div></div>`;
}

export function bindInterpretations(el) {
  el.querySelectorAll('[data-interp] [data-status]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.closest('[data-interp]').dataset.interp;
    const status = b.dataset.status;
    const userResponse = prompt(status === 'revised' ? 'How would you revise it?' : 'Anything to note? (optional)') ?? null;
    if (userResponse === null) return;
    await patch(`/interpretations/${id}`, { status, userResponse, _reason: 'user response' });
    toast('Saved');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }));
}

function profile(o) {
  const p = o.person;
  return `<form id="profile">
    ${field('name', 'Name', { value: p.name })}
    ${field('aliases', 'Other names (comma separated)', { value: (p.aliases || []).join(', ') })}
    ${field('context', 'Context', { type: 'textarea', value: p.context, rows: 2 })}
    ${field('howMet', 'How you met', { type: 'textarea', value: p.howMet, rows: 2 })}
    ${field('explicitStatements', 'What they have explicitly said (one per line)', { type: 'textarea', value: (p.explicitStatements || []).join('\n'), rows: 6 })}
    ${field('observations', 'What you have directly observed (one per line)', { type: 'textarea', value: (p.observations || []).join('\n'), rows: 4 })}
    ${field('unknowns', 'What remains unknown (one per line)', { type: 'textarea', value: (p.unknowns || []).join('\n'), rows: 4 })}
    ${field('notes', 'Notes', { type: 'textarea', value: p.notes, rows: 2 })}
    ${field('_reason', 'Why are you changing this? (kept in the history)', { value: '' })}
    <button class="btn primary">Save</button>
  </form>
  ${p.history?.length ? `<details style="margin-top:16px"><summary>Edit history (${p.history.length})</summary>${p.history.slice().reverse().map((h) => `<div class="small" style="margin:8px 0">${esc(h.at.slice(0, 16).replace('T', ' '))} · ${esc(h.by)}${h.reason ? ` · ${esc(h.reason)}` : ''}<br><span class="mono">${esc(JSON.stringify(h.before).slice(0, 300))}</span></div>`).join('')}</details>` : ''}`;
}

function bindProfile(el, p) {
  el.querySelector('#profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    await patch(`/people/${p.id}`, {
      name: d.name, aliases: d.aliases.split(',').map((x) => x.trim()).filter(Boolean), context: d.context, howMet: d.howMet,
      explicitStatements: lines(d.explicitStatements), observations: lines(d.observations), unknowns: lines(d.unknowns), notes: d.notes, _reason: d._reason,
    });
    toast('Saved. The previous version is kept in the history.');
    location.hash = `#/people/${p.id}`;
  });
}
