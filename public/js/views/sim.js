// Simulated chat with a person, reconstructed from the record. Messages are in French.
import { get, post, del } from '../api.js';
import { esc, toast, ask, fmtDate, md } from '../ui.js';
import { navigate } from '../router.js';

export async function render(el, id) {
  if (!id) return renderList(el);
  if (id.startsWith('p_')) {
    const s = await post('/simulations', { personId: id });
    navigate(`#/sim/${s.id}`, { replace: true });
    return;
  }
  const [sim, status] = await Promise.all([get(`/simulations/${id}`), get('/status')]);
  const person = await get(`/people/${sim.personIds[0]}`);
  renderChat(el, sim, person, status);
}

async function renderList(el) {
  const [sims, people] = await Promise.all([get('/simulations'), get('/people')]);
  const others = people.filter((p) => !p.isSelf);
  el.innerHTML = `
    <h1>Talk to them.</h1>
    <p class="sub">A simulated chat with someone from your record, rebuilt from what you have told Oracle: their reported words, how they behaved, the patterns around them. It isn’t them, and it can’t know what they really think.</p>
    <div class="row">${others.map((p) => `<a class="btn primary" href="#/sim/${p.id}">New chat with ${esc(p.name)}</a>`).join('') || '<span class="empty">Add a person first.</span>'}</div>
    <div class="section-head"><h2>Previous chats</h2></div>
    ${sims.length ? sims.map((s) => `<a class="card" href="#/sim/${s.id}"><p>${esc(s.title)}</p><div class="meta">${esc(fmtDate(s.updatedAt.slice(0, 10)))} · ${s.messageCount} messages${s.last ? ` · ${esc(s.last.slice(0, 60))}` : ''}</div></a>`).join('') : '<div class="empty">None yet.</div>'}`;
}

function bubbles(m) {
  if (m.role === 'feedback') return feedbackCard(m);
  if (m.role === 'user') return `<div class="bubble me">${esc(m.text)}</div>`;
  return m.text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (l.toLowerCase().startsWith('[oracle]')
    ? `<div class="banner">${esc(l.replace(/^\[oracle\]\s*/i, ''))}</div>`
    : `<div class="bubble them">${esc(l)}</div>`)).join('');
}

function feedbackCard(m) {
  return `<div class="feedback"><div class="head"><div class="orb"></div><span class="small">Oracle · retour sur la conversation</span></div><div class="body">${md(m.text)}</div></div>`;
}

function renderChat(el, sim, person, status) {
  el.innerHTML = `
    <a class="back" href="#/sim">← Simulations</a>
    <div class="spread"><h1 style="font-size:26px;margin:0">${esc(person.name)}</h1><span class="chip">simulation</span></div>
    <p class="small" style="margin:6px 0 16px">Rebuilt from your record. It isn’t ${esc(person.name)}, and it only knows what you have recorded. Nothing here is added to your record.</p>
    ${status.ai.configured ? '' : '<div class="banner">Claude isn’t connected here, so the simulation can’t answer. See Memory &amp; privacy.</div>'}
    <div class="chat" id="chat">${sim.messages.map(bubbles).join('') || `<div class="empty">Écris-lui quelque chose.</div>`}</div>
    <div class="composer">
      <div class="box">
        <textarea id="input" rows="1" placeholder="Message…"></textarea>
        <button class="send" id="send" aria-label="Send">↑</button>
      </div>
      <div class="row" style="margin-top:8px;justify-content:space-between"><button class="btn sm" id="feedback">Feedback : l’effet de tes messages</button><button class="btn ghost sm" id="delSim">Delete chat</button></div>
    </div>`;
  const input = el.querySelector('#input');
  const chat = el.querySelector('#chat');
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 720px)').matches) { e.preventDefault(); el.querySelector('#send').click(); } });
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 0);
  el.querySelector('#send').addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    if (!sim.messages.length) chat.innerHTML = '';
    chat.insertAdjacentHTML('beforeend', `<div class="bubble me">${esc(text)}</div><div class="typing" id="typing">${esc(person.name.toLowerCase())} est en train d’écrire…</div>`);
    window.scrollTo(0, document.body.scrollHeight);
    el.querySelector('#send').disabled = true;
    try {
      const out = await post(`/simulations/${sim.id}/messages`, { text });
      sim.messages.push(out.user, out.sim);
      el.querySelector('#typing')?.remove();
      chat.insertAdjacentHTML('beforeend', bubbles(out.sim));
    } catch (e) {
      el.querySelector('#typing')?.remove();
      chat.lastElementChild?.remove();
      input.value = text;
      toast(e.message);
    } finally {
      el.querySelector('#send').disabled = false;
      window.scrollTo(0, document.body.scrollHeight);
    }
  });
  el.querySelector('#feedback').addEventListener('click', async (e) => {
    if (!sim.messages.some((m) => m.role === 'user')) { toast('Écris-lui au moins un message d’abord'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    chat.insertAdjacentHTML('beforeend', '<div class="thinking" id="fbThinking"><div class="orb"></div>Oracle relit la conversation…</div>');
    window.scrollTo(0, document.body.scrollHeight);
    try {
      const out = await post(`/simulations/${sim.id}/feedback`);
      sim.messages.push(out.feedback);
      el.querySelector('#fbThinking')?.remove();
      chat.insertAdjacentHTML('beforeend', feedbackCard(out.feedback));
      chat.lastElementChild.scrollIntoView({ block: 'start' });
    } catch (err) {
      el.querySelector('#fbThinking')?.remove();
      toast(err.message);
    } finally { btn.disabled = false; }
  });
  el.querySelector('#delSim').addEventListener('click', async () => {
    if (!await ask({ title: 'Delete this chat?', body: 'Only the simulated chat is deleted. Your record is unchanged.', confirmLabel: 'Delete chat', danger: true })) return;
    await del(`/simulations/${sim.id}`);
    navigate('#/sim');
  });
}
