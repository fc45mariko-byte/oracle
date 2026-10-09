import { navigate } from '../router.js';
import { get, post, patch, del } from '../api.js';
import { esc, label, eventRow, groupByMonth, fmtMonth, fmtDate, field, formData, lines, toast, ask } from '../ui.js';

const CATEGORIES = ['meeting', 'contact', 'conversation', 'intimacy', 'conflict', 'rupture', 'return', 'plan', 'disclosure', 'statement', 'reflection', 'other'];
const EFFECTS = [['none', 'No change'], ['cut', 'Contact cut (block, deletion, ending)'], ['reopen', 'Contact reopened'], ['reopen_then_cut', 'Reopened, then cut']];

export async function render(el) {
  const [events, people] = await Promise.all([get('/events'), get('/people')]);
  let filter = { person: '', q: '', cat: '' };
  try { filter = { ...filter, ...JSON.parse(sessionStorage.getItem('oracle.tlFilter') || '{}') }; } catch { /* ignore */ }

  el.innerHTML = `
    <h1>The record.</h1>
    <p class="sub">Events first. Interpretation second. Neither has to stay fixed.</p>
    <div class="row" style="margin-bottom:6px">
      <select class="btn sm" id="fPerson"><option value="">Everyone</option>${people.filter((p) => !p.isSelf).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
      <select class="btn sm" id="fCat"><option value="">All kinds</option>${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select>
      <a class="btn sm primary" href="#/add">＋ Add a moment</a>
    </div>
    <input class="field" id="fQ" placeholder="Search words, themes, quotes…" style="margin-top:8px">
    <div id="list"></div>`;
  const $ = (s) => el.querySelector(s);
  $('#fPerson').value = filter.person; $('#fCat').value = filter.cat; $('#fQ').value = filter.q;
  const draw = () => {
    filter = { person: $('#fPerson').value, cat: $('#fCat').value, q: $('#fQ').value.trim().toLowerCase() };
    try { sessionStorage.setItem('oracle.tlFilter', JSON.stringify(filter)); } catch { /* ignore */ }
    const shown = events.filter((e) => (!filter.person || e.personIds.includes(filter.person))
      && (!filter.cat || e.current.category === filter.cat)
      && (!filter.q || JSON.stringify([e.current.title, e.original, e.current.summary, e.themes, e.quotes, e.annotations.map((a) => a.text)]).toLowerCase().includes(filter.q)));
    const groups = groupByMonth(shown);
    $('#list').innerHTML = shown.length
      ? `<div class="small">${shown.length} of ${events.length} events</div>${[...groups].map(([k, evs]) => `<div class="month">${esc(fmtMonth(k))}</div>${evs.map(eventRow).join('')}`).join('')}`
      : `<div class="empty">${events.length ? 'Nothing matches.' : 'Start with a moment, not a theory.'}</div>`;
  };
  ['#fPerson', '#fCat'].forEach((s) => $(s).addEventListener('change', draw));
  $('#fQ').addEventListener('input', draw);
  draw();
}

export async function renderEvent(el, id) {
  const [e, people, patterns, questions] = await Promise.all([get(`/events/${id}`), get('/people'), get('/patterns'), get('/questions')]);
  const v = e.current;
  const name = (pid) => (pid === 'mutual' ? 'both' : people.find((p) => p.id === pid)?.name || pid || 'unknown');
  const supporting = patterns.filter((p) => p.supportingEventIds.includes(id));
  const counter = patterns.filter((p) => p.counterEventIds.includes(id));
  const qs = questions.filter((q) => q.evidenceEventIds.includes(id));
  const corrections = e.annotations.filter((a) => a.kind === 'correction');
  const others = e.annotations.filter((a) => a.kind !== 'correction');

  el.innerHTML = `
    <a class="back" href="#back">← Back</a>
    <div class="small">${esc(fmtDate(v.date, v.datePrecision))} · ${esc(v.category)}</div>
    <h1 style="font-size:26px;margin-top:6px">${esc(v.title)}</h1>
    <div class="row" style="margin:10px 0 16px">${label(v.label)}${v.contactEffect !== 'none' ? `<span class="chip ${v.contactEffect === 'reopen' ? 'reopen' : 'cut'}">${esc(EFFECTS.find((x) => x[0] === v.contactEffect)[1])}${v.contactActorId ? ` · ${esc(name(v.contactActorId))}` : ''}</span>` : ''}</div>

    <div class="original-head"><span class="small">Original record. Never edited.</span><span class="small">${esc(v.source)}</span></div>
    <div class="original">${esc(e.original)}</div>

    ${v.summary ? `<div class="section-head"><h2>Neutral summary</h2></div><div class="card"><p>${esc(v.summary)}</p><div class="small">Added at import or entry; not your words. If it misreads the original, correct it below.</div></div>` : ''}

    <div class="card" style="margin-top:10px"><dl class="kv">
      <dt>People</dt><dd>${v.personIds.map((p) => `<a href="#/people/${p}" style="color:var(--blue)">${esc(name(p))}</a>`).join(', ') || '—'}</dd>
      <dt>Initiated by</dt><dd>${esc(v.initiatorId ? name(v.initiatorId) : 'not recorded')}</dd>
      ${v.dateNote ? `<dt>About the date</dt><dd>${esc(v.dateNote)}</dd>` : ''}
      ${v.feelingAtTime ? `<dt>Felt then</dt><dd>${esc(v.feelingAtTime)}</dd>` : ''}
      ${v.interpretationAtTime ? `<dt>Meant then</dt><dd>${esc(v.interpretationAtTime)}</dd>` : ''}
      ${v.themes?.length ? `<dt>Themes</dt><dd>${v.themes.map(esc).join(', ')}</dd>` : ''}
    </dl></div>

    ${v.quotes?.length ? `<div class="section-head"><h2>Words</h2></div><div class="card">${v.quotes.map((q) => `<p><span class="small">${esc(q.speaker)}</span><br>“${esc(q.text)}”</p>`).join('')}</div>` : ''}
    ${v.ambiguities?.length ? `<div class="section-head"><h2>Unclear in the record</h2></div><div class="card">${v.ambiguities.map((a) => `<p>${label('unknown')} ${esc(a)}</p>`).join('')}</div>` : ''}

    ${corrections.length ? `<div class="section-head"><h2>Corrections</h2></div>${corrections.map((a) => annotationHtml(a)).join('')}` : ''}

    <div class="section-head"><h2>Later readings</h2></div>
    ${others.length ? others.map((a) => annotationHtml(a)).join('') : '<div class="empty">No later interpretations yet.</div>'}

    <details class="card"><summary>Add an interpretation, note or correction</summary>
      <form id="annot" style="margin-top:12px">
        ${field('kind', 'Kind', { options: [['interpretation', 'Interpretation: what I think it means now'], ['note', 'Note'], ['correction', 'Correction to a fact']] })}
        <div id="corrFields" style="display:none">
          ${field('field', 'Which fact', { options: [['date', 'Date (YYYY-MM-DD)'], ['title', 'Title'], ['summary', 'Neutral summary'], ['category', 'Kind of event'], ['initiatorId', 'Who initiated (person id)'], ['contactEffect', 'Effect on contact'], ['contactActorId', 'Who cut / reopened (person id)'], ['datePrecision', 'Date precision']] })}
          ${field('value', 'Correct value')}
        </div>
        ${field('text', 'Text (for a correction: why)', { type: 'textarea', rows: 3 })}
        <button class="btn primary">Add</button>
      </form></details>

    ${supporting.length || counter.length || qs.length ? `<div class="section-head"><h2>Connected</h2></div>
      ${supporting.map((p) => `<a class="card" href="#/patterns/${p.id}"><div class="meta">Supports pattern</div><p>${esc(p.title)}</p></a>`).join('')}
      ${counter.map((p) => `<a class="card" href="#/patterns/${p.id}"><div class="meta">Counterexample to</div><p>${esc(p.title)}</p></a>`).join('')}
      ${qs.map((q) => `<a class="card" href="#/questions/${q.id}"><div class="meta">Evidence for question</div><p>${esc(q.text)}</p></a>`).join('')}` : ''}
    ${v.relatedEventIds?.length ? `<div class="section-head"><h2>Related events</h2></div>${(await Promise.all(v.relatedEventIds.map((r) => get(`/events/${r}`).catch(() => null)))).filter(Boolean).map(eventRow).join('')}` : ''}

    <hr class="soft">
    <div class="row"><button class="btn danger sm" id="delete">Delete this event</button></div>`;

  const form = el.querySelector('#annot');
  const kindSel = form.querySelector('[name=kind]');
  kindSel.addEventListener('change', () => { el.querySelector('#corrFields').style.display = kindSel.value === 'correction' ? '' : 'none'; });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = formData(form);
    if (!d.text.trim()) { toast('Add some text'); return; }
    const body = { kind: d.kind, text: d.text, author: 'user', label: d.kind === 'correction' ? 'recorded' : 'inferred' };
    if (d.kind === 'correction') { body.field = d.field; body.value = d.value; }
    try { await post(`/events/${id}/annotations`, body); toast('Added. The original record is unchanged.'); renderEvent(el, id); } catch (err) { toast(err.message); }
  });
  el.querySelectorAll('[data-ann] [data-status]').forEach((b) => b.addEventListener('click', async () => {
    await patch(`/events/${id}/annotations/${b.closest('[data-ann]').dataset.ann}`, { status: b.dataset.status });
    renderEvent(el, id);
  }));
  el.querySelector('#delete').addEventListener('click', async () => {
    if (!await ask({ title: 'Delete this event?', body: 'It will be removed permanently, along with references to it in patterns and questions. Export first if you might want it back.', confirmLabel: 'Delete event', danger: true })) return;
    await del(`/events/${id}`);
    navigate('#/timeline');
  });
}

function annotationHtml(a) {
  const head = a.kind === 'correction'
    ? `Correction · ${esc(a.field)}: <span class="mono">${esc(JSON.stringify(a.from))}</span> → <span class="mono">${esc(JSON.stringify(a.value))}</span>`
    : `${esc(a.kind)} · ${a.author === 'oracle' ? 'Oracle' : 'you'}`;
  return `<div class="annotation ${a.author} ${a.kind} ${a.status}" data-ann="${a.id}">
    <div class="small">${head} · ${esc(a.at.slice(0, 10))} ${label(a.status === 'active' ? a.label : 'superseded')}</div>
    <p style="margin:4px 0;font-size:14px;color:var(--text-2)">${esc(a.text)}</p>
    <div class="row">${a.status === 'active'
      ? `<button class="btn sm ghost" data-status="superseded">Mark superseded</button>${a.kind === 'correction' ? '<button class="btn sm ghost" data-status="withdrawn">Withdraw correction</button>' : ''}`
      : '<button class="btn sm ghost" data-status="active">Restore</button>'}</div></div>`;
}

export async function renderAdd(el, personId = '') {
  const people = await get('/people');
  const self = people.find((p) => p.isSelf);
  el.innerHTML = `
    <a class="back" href="#back">← Back</a>
    <h1>Add a<br>moment.</h1>
    <p class="sub">Write it as it happened, in your own words. That text is kept exactly as written; later readings sit beside it, never over it.</p>
    <form id="add">
      ${field('title', 'A short title')}
      <div class="grid2">${field('date', 'When', { type: 'date' })}${field('datePrecision', 'How sure of the date', { options: [['day', 'Exact day'], ['month', 'Month only'], ['approximate', 'Approximate'], ['unknown', 'Unknown']] })}</div>
      <label class="f">Who was involved</label>
      <div class="row" style="margin-bottom:14px">${people.map((p) => `<label class="chip"><input type="checkbox" name="p_${p.id}" ${p.id === personId || p.isSelf ? 'checked' : ''}> ${esc(p.isSelf ? 'Me' : p.name)}</label>`).join('')}</div>
      ${field('original', 'What happened', { type: 'textarea', rows: 5, placeholder: 'Describe it as you know it happened…' })}
      ${field('feelingAtTime', 'What you felt', { type: 'textarea', rows: 2 })}
      ${field('interpretationAtTime', 'What you think it means now (allowed to change)', { type: 'textarea', rows: 2 })}
      <details style="margin-bottom:14px"><summary>More detail</summary><div style="margin-top:12px">
        ${field('category', 'Kind of event', { options: CATEGORIES, value: 'other' })}
        ${field('initiatorId', 'Who initiated', { options: [['', 'Not sure / not recorded'], ['mutual', 'Both'], ...people.map((p) => [p.id, p.isSelf ? 'Me' : p.name])] })}
        ${field('contactEffect', 'Effect on contact', { options: EFFECTS })}
        ${field('contactActorId', 'Whose action cut or reopened contact', { options: [['', '—'], ...people.map((p) => [p.id, p.isSelf ? 'Me' : p.name])] })}
        ${field('quotes', 'Exact words, one per line, as "Speaker: words"', { type: 'textarea', rows: 3 })}
        ${field('themes', 'Themes (comma separated)')}
      </div></details>
      <button class="btn primary">Keep in the record</button>
    </form>`;
  el.querySelector('#add').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    if (!d.title.trim() || !d.original.trim()) { toast('A title and what happened are needed'); return; }
    let date = d.date || null;
    if (date && d.datePrecision === 'month') date = date.slice(0, 7);
    const personIds = people.filter((p) => d[`p_${p.id}`]).map((p) => p.id);
    const body = {
      title: d.title.trim(), original: d.original.trim(), date, datePrecision: date ? d.datePrecision : 'unknown',
      personIds: personIds.length ? personIds : (self ? [self.id] : []), feelingAtTime: d.feelingAtTime, interpretationAtTime: d.interpretationAtTime,
      category: d.category, initiatorId: d.initiatorId || null, contactEffect: d.contactEffect, contactActorId: d.contactActorId || null,
      quotes: lines(d.quotes).map((l) => { const i = l.indexOf(':'); return i > 0 ? { speaker: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { speaker: 'unknown', text: l }; }),
      themes: (d.themes || '').split(',').map((x) => x.trim()).filter(Boolean), source: 'user (entered in app)', label: 'recorded',
    };
    try {
      const e = await post('/events', body);
      toast('Kept in the record');
      navigate(`#/event/${e.id}`);
    } catch (err) { toast(err.message); }
  });
}
