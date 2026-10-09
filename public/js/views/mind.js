// A single belief (intellectual history) or Oracle interpretation.
import { get, patch } from '../api.js';
import { esc, label, fmtDate, hrefFor } from '../ui.js';
import { interpCard, bindInterpretations } from './people.js';

export async function render(el, id) {
  if (id?.startsWith('oi_')) {
    const i = await get(`/interpretations/${id}`);
    el.innerHTML = `<a class="back" href="javascript:history.back()">← Back</a><h1>An interpretation.</h1>
      <p class="sub">Oracle’s interpretive history keeps what was proposed, the evidence used and how you responded, so the same theory isn’t rediscovered as new.</p>${interpCard(i)}
      ${i.conversationId ? `<a class="small" style="color:var(--blue)" href="#/talk/${i.conversationId}">Open the conversation</a>` : ''}`;
    bindInterpretations(el);
    return;
  }
  const b = await get(`/beliefs/${id}`);
  const later = b.supersededBy ? await get(`/beliefs/${b.supersededBy}`).catch(() => null) : null;
  el.innerHTML = `<a class="back" href="javascript:history.back()">← Back</a>
    <h1>What you believed.</h1>
    <div class="card"><div class="meta">${esc(fmtDate(b.asOf, b.datePrecision))} · about ${esc(b.subject)} ${label(b.supersededBy ? 'superseded' : b.label)}</div>
      <p style="margin-top:8px;font-size:16px">${esc(b.text)}</p><div class="small">Source: ${esc(b.source)}</div>
      ${b.evidenceEventIds.length ? `<div class="small">Events: ${b.evidenceEventIds.map((e) => `<a href="${hrefFor(e)}" style="color:var(--blue)">${esc(e)}</a>`).join(', ')}</div>` : ''}</div>
    ${later ? `<div class="card"><div class="meta">Later view · ${esc(fmtDate(later.asOf, later.datePrecision))}</div><p>${esc(later.text)}</p><a class="small" style="color:var(--blue)" href="#/mind/${later.id}">Open</a></div>` : ''}
    <button class="btn" id="sup">${b.supersededBy ? 'Mark as current again' : 'Mark as no longer current'}</button>`;
  el.querySelector('#sup').addEventListener('click', async () => {
    await patch(`/beliefs/${b.id}`, { supersededBy: b.supersededBy ? null : 'manual', _reason: 'user changed status' });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
