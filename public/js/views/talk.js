import { get, post, del } from '../api.js';
import { esc, md, label, toast, hrefFor, fmtDate } from '../ui.js';

const REQUEST_NAMES = {
  new_event: 'New event', ask_about_person: 'About a person', develop_hypothesis: 'Hypothesis', revisit_interpretation: 'Revisiting',
  philosophical: 'Philosophical', practical: 'Practical', correction: 'Correction', expressing_feeling: 'A feeling',
};
const COMPARISON = {
  supports: 'supports an existing hypothesis', contradicts: 'contradicts an existing hypothesis', refines: 'refines an existing hypothesis',
  new_possibility: 'a new possibility', no_material_change: 'no material change', not_applicable: '',
};
const KIND_NAMES = {
  add_event: 'Add event', correct_event: 'Correct event', annotate_event: 'Annotate event', add_question: 'Open a question',
  update_question: 'Update question', add_pattern: 'New pattern', update_pattern: 'Update pattern', add_belief: 'Record a belief',
  add_person: 'Add person', update_person: 'Update person', respond_to_interpretation: 'Your response to an interpretation',
};

export async function render(el, cid, sub, personId) {
  const status = await get('/status');
  if (cid === 'new' && sub === 'review' && personId) {
    const c = await post('/conversations', { personIds: [personId], title: 'Review' });
    location.replace(`#/talk/${c.id}/review/${personId}`);
    return;
  }
  if (!cid) return renderList(el, status);
  const conv = await get(`/conversations/${cid}`);
  renderThread(el, conv, status);
  if (sub === 'review' && personId && !conv.messages.length) {
    history.replaceState(null, '', `#/talk/${cid}`);
    send(el, conv, status, null, personId);
  }
}

async function renderList(el, status) {
  const convs = await get('/conversations');
  el.innerHTML = `
    <h1>Let’s look<br>closely.</h1>
    <p class="sub">A person, a conversation, a recurring dynamic, a theory you want to test, or just something you felt.</p>
    ${status.ai.configured ? '' : aiOffBanner()}
    <button class="btn primary" id="newConv">New conversation</button>
    <div class="section-head"><h2>Conversations</h2></div>
    ${convs.length ? convs.map((c) => `<a class="card" href="#/talk/${c.id}"><p>${esc(c.title || 'Untitled')}</p><div class="meta">${esc(fmtDate(c.updatedAt.slice(0, 10)))} · ${c.messageCount} messages</div></a>`).join('') : '<div class="empty">Nothing yet.</div>'}
  `;
  el.querySelector('#newConv').addEventListener('click', async () => {
    const c = await post('/conversations', {});
    location.hash = `#/talk/${c.id}`;
  });
}

const aiOffBanner = () => `<div class="banner">Oracle can’t answer yet: add your Anthropic API key in <a href="#/memory" style="text-decoration:underline">Memory &amp; privacy</a>. You can still use <strong>Preview recall</strong> to see exactly what Oracle would retrieve from memory for a message.</div>`;

function renderThread(el, conv, status) {
  el.innerHTML = `
    <a class="back" href="#/talk">← Conversations</a>
    ${status.ai.configured ? '' : aiOffBanner()}
    <div class="thread" id="thread">${conv.messages.length ? conv.messages.map((m) => renderMessage(conv, m)).join('') : `<div class="empty">Tell it as it happened, or start with the theory you have. Oracle will draw on the record and show you what it used.</div>`}</div>
    <div class="composer">
      <div class="box">
        <textarea id="input" rows="1" placeholder="${status.ai.configured ? 'What happened?' : 'Type a message to preview recall'}"></textarea>
        <button class="send" id="send" aria-label="Send">↑</button>
      </div>
      <div class="row" style="margin-top:8px;justify-content:space-between">
        <button class="btn ghost sm" id="preview">Preview recall</button>
        <span class="row"><select class="btn sm" id="reviewWho" aria-label="Review a person"><option value="">Review…</option></select><button class="btn ghost sm" id="delConv">Delete</button></span>
      </div>
      <div id="previewOut"></div>
    </div>`;
  const input = el.querySelector('#input');
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) el.querySelector('#send').click(); });
  el.querySelector('#send').addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    if (!status.ai.configured) { el.querySelector('#preview').click(); return; }
    input.value = '';
    send(el, conv, status, text);
  });
  el.querySelector('#preview').addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) { toast('Type a message first'); return; }
    const r = await post('/retrieve', { text, personIds: conv.personIds || [] });
    el.querySelector('#previewOut').innerHTML = `<div class="card" style="margin-top:10px"><div class="meta">What Oracle would recall for this message · ${r.trace.length} items · ${Math.round(r.chars / 4)} tokens approx.</div>${traceList(r.trace)}<details><summary>Exact text that would be sent</summary><pre class="mono" style="white-space:pre-wrap;max-height:320px;overflow:auto">${esc(r.context)}</pre></details></div>`;
  });
  el.querySelector('#delConv').addEventListener('click', async () => {
    if (!confirm('Delete this conversation? Events, patterns and questions you accepted from it stay in the record.')) return;
    await del(`/conversations/${conv.id}`);
    location.hash = '#/talk';
  });
  get('/people').then((ps) => {
    const sel = el.querySelector('#reviewWho');
    sel.innerHTML += ps.filter((p) => !p.isSelf).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      if (!status.ai.configured) { toast('A review needs the AI model'); sel.value = ''; return; }
      send(el, conv, status, null, sel.value);
      sel.value = '';
    });
  });
  bindProposals(el, conv);
  if (conv.messages.length) setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 0);
}

async function send(el, conv, status, text, reviewPersonId = null) {
  const thread = el.querySelector('#thread');
  if (!conv.messages.length) thread.innerHTML = '';
  if (text) thread.insertAdjacentHTML('beforeend', `<div class="msg-user">${esc(text)}</div>`);
  else thread.insertAdjacentHTML('beforeend', '<div class="msg-user review">Review requested</div>');
  thread.insertAdjacentHTML('beforeend', '<div class="thinking" id="thinking"><div class="orb"></div>Recalling the record and thinking…</div>');
  window.scrollTo(0, document.body.scrollHeight);
  el.querySelector('#send').disabled = true;
  try {
    const out = reviewPersonId
      ? await post(`/conversations/${conv.id}/review`, { personId: reviewPersonId })
      : await post(`/conversations/${conv.id}/messages`, { text });
    conv.messages.push(out.user, out.assistant);
    renderThread(el, conv, status);
  } catch (e) {
    el.querySelector('#thinking')?.remove();
    thread.insertAdjacentHTML('beforeend', `<div class="banner">${esc(e.message)}${text ? ' Your message was not stored.' : ''}</div>`);
    if (text) el.querySelector('#input').value = text;
  } finally {
    const b = el.querySelector('#send');
    if (b) b.disabled = false;
  }
}

function traceList(trace) {
  const groups = {};
  for (const t of trace) (groups[t.type] ||= []).push(t);
  const names = { person: 'People', index: 'Chronology', analysis: 'Computed', event: 'Events', pattern: 'Patterns', question: 'Questions', belief: 'Your beliefs over time', interpretation: 'Earlier interpretations' };
  return Object.entries(groups).map(([type, items]) => `<div style="margin-top:8px"><div class="small">${esc(names[type] || type)}</div>${items.map((t) => {
    const link = /^(e|pat|q|p|b|oi)_/.test(t.id) ? `<a href="${hrefFor(t.id)}" style="color:var(--blue)">${esc(t.id)}</a>` : esc(t.id);
    return `<div class="small" style="color:var(--text-2)">${link} · ${esc(t.reason)}</div>`;
  }).join('')}</div>`).join('');
}

function renderMessage(conv, m) {
  if (m.role === 'user') return `<div class="msg-user${m.mode === 'review' ? ' review' : ''}">${esc(m.mode === 'review' ? 'Review requested' : m.text)}</div>`;
  const userMsg = conv.messages.find((x) => x.id === m.inReplyTo);
  const comparison = COMPARISON[m.comparison];
  return `<div class="msg-oracle">
    <div class="head"><div class="orb"></div><span class="small">${esc(REQUEST_NAMES[m.requestType] || '')}${comparison ? ` · ${esc(comparison)}` : ''}</span></div>
    <div class="body">${md(m.reply)}</div>
    ${m.gaps?.length ? `<details><summary>Not in the record (${m.gaps.length})</summary><ul class="small">${m.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></details>` : ''}
    ${userMsg?.trace ? `<details><summary>Context used (${userMsg.trace.length})${m.citedIds?.length ? ` · relied on ${m.citedIds.length}` : ''}</summary>
      ${m.citedIds?.length ? `<div class="small" style="margin-top:6px">Relied on: ${m.citedIds.map((id) => `<a href="${hrefFor(id)}" style="color:var(--blue)">${esc(id)}</a>`).join(', ')}</div>` : ''}
      ${m.uncitableIds?.length ? `<div class="small" style="color:var(--red)">Cited but not in the record: ${m.uncitableIds.map(esc).join(', ')}</div>` : ''}
      ${traceList(userMsg.trace)}</details>` : ''}
    ${m.interpretationIds?.length ? `<details><summary>Logged as Oracle’s interpretations (${m.interpretationIds.length})</summary><div class="small">These are stored in Oracle’s interpretive history as “proposed”, so later conversations can see what was said. You can retain, revise or reject them: ${m.interpretationIds.map((id) => `<a href="#/mind/${id}" style="color:var(--blue)">${id}</a>`).join(', ')}</div></details>` : ''}
    ${(m.proposals || []).map((p, i) => renderProposal(m, p, i)).join('')}
  </div>`;
}

function renderProposal(m, p, i) {
  const statusText = { pending: 'Suggested. Not saved.', accepted: 'Saved to memory', rejected: 'Rejected', invalid: `Can’t be applied: ${p.error}` }[p.status];
  const target = p.target_id ? ` · <a href="${hrefFor(p.target_id)}" style="color:var(--blue)">${esc(p.target_id)}</a>` : '';
  const saved = p.result?.id ? ` · <a href="${hrefFor(p.result.id)}" style="color:var(--blue)">open</a>` : '';
  return `<div class="proposal ${p.status}" data-msg="${m.id}" data-idx="${i}">
    <div class="spread"><div class="small">${esc(KIND_NAMES[p.kind] || p.kind)}${target}</div>${label(p.label)}</div>
    <p style="margin:6px 0;font-size:14px">${esc(p.summary)}</p>
    ${p.rationale ? `<div class="small">${esc(p.rationale)}</div>` : ''}
    <details><summary>Exact data</summary><pre class="mono" style="white-space:pre-wrap">${esc(JSON.stringify(p.data, null, 2))}</pre></details>
    <div class="spread" style="margin-top:8px"><span class="small">${esc(statusText)}${saved}</span>
      ${p.status === 'pending' ? '<span class="row"><button class="btn sm" data-act="reject">Reject</button><button class="btn sm primary" data-act="accept">Accept</button></span>' : ''}</div>
  </div>`;
}

// One delegated listener on the thread, so re-rendering a proposal never duplicates handlers.
function bindProposals(el, conv) {
  el.querySelector('#thread').addEventListener('click', async (ev) => {
    const b = ev.target.closest('.proposal [data-act]');
    if (!b) return;
    const box = b.closest('.proposal');
    const { msg, idx } = box.dataset;
    box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    try {
      const p = await post(`/conversations/${conv.id}/messages/${msg}/proposals/${idx}`, { action: b.dataset.act });
      const m = conv.messages.find((x) => x.id === msg);
      m.proposals[Number(idx)] = p;
      box.outerHTML = renderProposal(m, p, Number(idx));
      toast(p.status === 'accepted' ? 'Saved to memory' : 'Rejected. Nothing saved.');
    } catch (e) {
      box.querySelectorAll('button').forEach((x) => { x.disabled = false; });
      toast(e.message);
    }
  });
}
