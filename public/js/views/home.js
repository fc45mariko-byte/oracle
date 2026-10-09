import { get } from '../api.js';
import { esc, tile, label } from '../ui.js';

const TAB_KEY = 'oracle.homeTab';

export async function render(el) {
  const [status, people, pats, qs, convs] = await Promise.all([
    get('/status'), get('/people'), get('/patterns'), get('/questions'), get('/conversations'),
  ]);
  const others = people.filter((p) => !p.isSelf);
  const openQs = qs.filter((q) => q.status === 'open');
  const activePats = pats.filter((p) => p.status !== 'obsolete');
  let tab = 'for-you';
  try { tab = sessionStorage.getItem(TAB_KEY) || tab; } catch { /* ignore */ }

  const tabs = [['for-you', 'For You'], ['people', 'People', others.length], ['patterns', 'Patterns', activePats.length], ['questions', 'Open questions', openQs.length]];

  const grids = {
    'for-you': `<div class="tiles">
      ${tile({ href: '#/talk', name: 'Make sense of it', hint: 'Think it through', color: 't-blue', artKind: 'orb' })}
      ${tile({ href: '#/people', name: 'People', hint: 'Histories & dynamics', color: 't-pink', artKind: 'rings', count: others.length || null })}
      ${tile({ href: '#/timeline', name: 'Timeline', hint: 'What actually happened', color: 't-lilac', artKind: 'ribbon', count: status.counts.events || null })}
      ${tile({ href: '#/patterns', name: 'Patterns', hint: 'Hypotheses, not verdicts', color: 't-mint', artKind: 'knot', count: activePats.length || null })}
      ${tile({ href: '#/questions', name: 'Open questions', hint: 'What we don’t know', color: 't-rose', artKind: 'void', count: openQs.length || null })}
      ${tile({ href: '#/add', name: 'Add a moment', hint: 'Keep the original record', color: 't-dusk', artKind: 'plus' })}
    </div>`,
    people: others.length ? `<div class="tiles">${others.map((p, i) => tile({ href: `#/people/${p.id}`, name: p.name, hint: p.context.split('.')[0], color: ['t-pink', 't-lilac', 't-blue', 't-mint'][i % 4], artKind: ['rings', 'pebble', 'orb', 'prism'][i % 4], small: true })).join('')}</div>`
      : `<div class="empty">No one yet. <a href="#/people" style="color:var(--blue)">Add a person</a>.</div>`,
    patterns: activePats.length ? `<div class="tiles">${activePats.map((p, i) => tile({ href: `#/patterns/${p.id}`, name: p.title, hint: `${p.label} · ${p.confidence}`, color: ['t-mint', 't-blue', 't-lilac'][i % 3], artKind: ['knot', 'prism', 'ribbon'][i % 3], small: true })).join('')}</div>`
      : '<div class="empty">Patterns appear when several events point the same way.</div>',
    questions: openQs.length ? `<div class="tiles">${openQs.map((q, i) => tile({ href: `#/questions/${q.id}`, name: q.text, color: ['t-rose', 't-dusk', 't-pink'][i % 3], artKind: ['void', 'pebble', 'orb'][i % 3], small: true })).join('')}</div>`
      : '<div class="empty">No open questions.</div>',
  };

  // In-app prompts (spec §9): user-triggered, selective. These are computed from the record, not generated.
  const prompts = [];
  if (!status.ai.configured) prompts.push(`<div class="banner">Conversation is off: no AI model is configured on the server. The record, timeline and patterns all work. <a href="#/memory" style="text-decoration:underline">How to turn it on</a>.</div>`);
  if (!status.counts.events) prompts.push(`<div class="card"><p>The record is empty. Start with a moment, or load the Yosef case study from <a href="#/memory" style="color:var(--blue)">Memory</a>.</p></div>`);
  for (const p of others) {
    const pc = await get(`/people/${p.id}/overview`).catch(() => null);
    if (!pc) continue;
    const reviewed = pc.interpretations.filter((i) => i.source === 'oracle').map((i) => i.createdAt).sort().at(-1);
    const newer = pc.events.filter((e) => !reviewed || e.createdAt > reviewed).length;
    const latest = pc.events.filter((e) => e.date).at(-1);
    if (newer >= 3 && status.ai.configured) {
      prompts.push(`<a class="card" href="#/talk/new/review/${p.id}"><div class="meta">Review</div><p><strong>${esc(p.name)}</strong>: ${newer} events haven’t been looked at together yet. Review this relationship?</p></a>`);
    } else if (latest) {
      prompts.push(`<a class="card" href="#/people/${p.id}"><div class="meta">Latest in the record · ${esc(p.name)}</div><p>${esc(latest.current.title)}</p></a>`);
    }
  }
  const pending = [];
  for (const c of convs.slice(0, 5)) {
    const full = await get(`/conversations/${c.id}`).catch(() => null);
    const n = full ? full.messages.reduce((s, m) => s + (m.proposals || []).filter((p) => p.status === 'pending').length, 0) : 0;
    if (n) pending.push(`<a class="card" href="#/talk/${c.id}"><div class="meta">Waiting for you</div><p>${n} suggested memory change${n > 1 ? 's' : ''} in “${esc(c.title || 'conversation')}”. Nothing is saved until you accept.</p></a>`);
  }

  el.innerHTML = `
    <a class="prompt" href="#/talk"><div class="orb"></div><div class="prompt-text">Talk to me… <em>What happened?</em></div><span class="arrow">↗</span></a>
    <h1>People are<br>never just a story.</h1>
    <p class="sub">Your relationships, the patterns in them, and meanings that change over time.</p>
    <div class="tabs" role="tablist">${tabs.map(([id, t, n]) => `<button class="tab${id === tab ? ' active' : ''}" data-tab="${id}" role="tab">${esc(t)}${n ? `<sup>${n}</sup>` : ''}</button>`).join('')}</div>
    <div id="grid">${grids[tab]}</div>
    ${prompts.length || pending.length ? `<div class="section-head"><h2>For you</h2></div>${pending.join('')}${prompts.join('')}` : ''}
    <div class="section-head"><h2>One principle</h2></div>
    <div class="card"><p>A coherent story is not necessarily a true story. Keep the evidence, the interpretation and the unknowns separate.</p><div class="meta">${label('recorded')} what happened ${label('inferred')} what it might mean ${label('unknown')} what we can’t know</div></div>
  `;
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    try { sessionStorage.setItem(TAB_KEY, tab); } catch { /* ignore */ }
    el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    el.querySelector('#grid').innerHTML = grids[tab];
  }));
}
