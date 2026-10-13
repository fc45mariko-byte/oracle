// Rendering helpers shared by all views.

export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fmtDate(d, precision) {
  if (!d) return 'Undated';
  const [y, m, day] = d.split('-');
  const approx = precision === 'approximate' ? '~' : '';
  if (day) return `${approx}${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (m) return `${approx}${MONTHS_LONG[Number(m) - 1]} ${y}`;
  return `${approx}${y}`;
}
export const monthKey = (d) => (d ? d.slice(0, 7) : 'undated');
export function fmtMonth(k) {
  if (k === 'undated') return 'Undated';
  const [y, m] = k.split('-');
  return m ? `${MONTHS_LONG[Number(m) - 1]} ${y}` : y;
}
export const shortDay = (d) => { if (!d) return '—'; const [, m, day] = d.split('-'); return day ? `${Number(day)} ${MONTHS[Number(m) - 1]}` : m ? MONTHS[Number(m) - 1] : '—'; };

export const label = (l) => (l ? `<span class="label l-${esc(l)}">${esc(l)}</span>` : '');

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

// Minimal, safe markdown: escape first, then apply a small set of block and inline rules.
export function md(src = '') {
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const line of lines) {
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^#{1,4}\s+(.*)/))) { flushPara(); flushList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^>\s?(.*)/))) { flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if (list) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('');
}

// Links for memory ids (e_…, pat_…, q_…, p_…, b_…, oi_…).
export function hrefFor(id) {
  if (!id) return '#/';
  if (id.startsWith('e_')) return `#/event/${id}`;
  if (id.startsWith('pat_')) return `#/patterns/${id}`;
  if (id.startsWith('q_')) return `#/questions/${id}`;
  if (id.startsWith('p_')) return `#/people/${id}`;
  if (id.startsWith('b_') || id.startsWith('oi_')) return `#/mind/${id}`;
  return '#/';
}

// ---- Sculptural tile art --------------------------------------------------------
// Abstract translucent forms drawn with layered gradients. Each call gets unique gradient ids.
let artSeq = 0;
export function art(kind) {
  const n = ++artSeq;
  const g = (id) => `${id}${n}`;
  const defs = `
    <radialGradient id="${g('glass')}" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></radialGradient>
    <radialGradient id="${g('deep')}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".55" stop-color="#e9e4ff" stop-opacity=".35"/><stop offset="1" stop-color="#3b3f7a" stop-opacity=".35"/></radialGradient>
    <linearGradient id="${g('rib')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
    <filter id="${g('soft')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>`;
  const shadow = `<ellipse cx="54" cy="92" rx="30" ry="5" fill="#000" opacity=".16" filter="url(#${g('soft')})"/>`;
  const shapes = {
    orb: `${shadow}<circle cx="54" cy="50" r="34" fill="url(#${g('deep')})"/><circle cx="54" cy="50" r="34" fill="none" stroke="#fff" stroke-opacity=".5"/><ellipse cx="44" cy="36" rx="12" ry="7" fill="#fff" opacity=".7" filter="url(#${g('soft')})"/><circle cx="66" cy="62" r="9" fill="url(#${g('glass')})" opacity=".8"/>`,
    rings: `${shadow}<ellipse cx="42" cy="52" rx="26" ry="30" fill="none" stroke="url(#${g('rib')})" stroke-width="11" opacity=".9"/><ellipse cx="66" cy="48" rx="26" ry="30" fill="none" stroke="url(#${g('rib')})" stroke-width="11" opacity=".7"/><ellipse cx="54" cy="50" rx="6" ry="20" fill="#fff" opacity=".35" filter="url(#${g('soft')})"/>`,
    ribbon: `${shadow}<path d="M10 66 C 28 18, 44 18, 54 50 S 82 84, 98 34" fill="none" stroke="url(#${g('rib')})" stroke-width="14" stroke-linecap="round" opacity=".92"/><path d="M10 66 C 28 18, 44 18, 54 50 S 82 84, 98 34" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".7"/><circle cx="98" cy="34" r="6" fill="#fff" opacity=".9"/>`,
    knot: `${shadow}<path d="M54 18 C 90 18, 90 70, 54 70 C 18 70, 18 30, 54 46 C 86 60, 70 90, 44 84" fill="none" stroke="url(#${g('rib')})" stroke-width="12" stroke-linecap="round" opacity=".9"/><path d="M54 18 C 90 18, 90 70, 54 70" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`,
    void: `${shadow}<circle cx="54" cy="50" r="34" fill="url(#${g('glass')})" opacity=".85"/><circle cx="58" cy="54" r="15" fill="#2c2550" opacity=".35"/><circle cx="58" cy="54" r="15" fill="none" stroke="#fff" stroke-opacity=".6"/><ellipse cx="42" cy="34" rx="10" ry="6" fill="#fff" opacity=".8" filter="url(#${g('soft')})"/>`,
    plus: `${shadow}<rect x="44" y="14" width="20" height="72" rx="10" fill="url(#${g('rib')})" opacity=".92"/><rect x="18" y="40" width="72" height="20" rx="10" fill="url(#${g('rib')})" opacity=".75"/><circle cx="54" cy="50" r="7" fill="#fff" opacity=".8" filter="url(#${g('soft')})"/>`,
    prism: `${shadow}<path d="M54 12 L88 78 L20 78 Z" fill="url(#${g('glass')})" opacity=".9"/><path d="M54 12 L62 78 L20 78 Z" fill="#fff" opacity=".22"/><path d="M54 12 L88 78 L20 78 Z" fill="none" stroke="#fff" stroke-opacity=".6"/>`,
    pebble: `${shadow}<path d="M22 58 C 18 32, 46 18, 70 26 C 94 34, 92 66, 70 76 C 50 85, 26 80, 22 58 Z" fill="url(#${g('deep')})"/><ellipse cx="46" cy="38" rx="14" ry="6" fill="#fff" opacity=".7" filter="url(#${g('soft')})"/>`,
  };
  return `<svg viewBox="0 0 108 100" aria-hidden="true"><defs>${defs}</defs>${shapes[kind] || shapes.orb}</svg>`;
}

export function tile({ href, name, hint = '', color = 't-blue', artKind = 'orb', count = null, small = false }) {
  return `<a class="tile ${color}${small ? ' small' : ''}" href="${href}">
    ${count != null ? `<span class="count">${esc(count)}</span>` : ''}
    <div><div class="name">${esc(name)}</div>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>
    <div class="art">${art(artKind)}</div>
  </a>`;
}

export function eventRow(e) {
  const v = e.current || e;
  const eff = v.contactEffect && v.contactEffect !== 'none'
    ? `<span class="chip ${v.contactEffect === 'reopen' ? 'reopen' : 'cut'}">${v.contactEffect === 'cut' ? 'contact cut' : v.contactEffect === 'reopen' ? 'contact reopened' : 'reopened, then cut'}</span>` : '';
  const corrected = (e.annotations || []).some((a) => a.kind === 'correction' && a.status === 'active');
  return `<a class="event-row" href="#/event/${esc(e.id)}">
    <div class="d">${esc(shortDay(v.date))}</div>
    <div><div class="t">${esc(v.title)}</div>
      <div class="s">${esc((v.summary || v.original).slice(0, 140))}${(v.summary || v.original).length > 140 ? '…' : ''}</div>
      <div class="row" style="margin-top:6px">${eff}${corrected ? '<span class="chip">corrected</span>' : ''}${v.source && !v.source.startsWith('user timeline') ? `<span class="chip">${esc(v.source.split(' (')[0])}</span>` : ''}</div>
    </div></a>`;
}

export function groupByMonth(events) {
  const groups = new Map();
  for (const e of events) {
    const k = monthKey((e.current || e).date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  return groups;
}

export function field(name, labelText, { type = 'text', value = '', rows = 3, placeholder = '', options = null } = {}) {
  const id = `f_${name}`;
  let input;
  if (options) input = `<select class="field" id="${id}" name="${name}">${options.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
  else if (type === 'textarea') input = `<textarea class="field" id="${id}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  else input = `<input class="field" id="${id}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  return `<label class="f" for="${id}">${esc(labelText)}</label>${input}`;
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
export const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

// In-page confirmation dialog (claude.ai pages block the browser's own confirm/prompt).
// Resolves true (or the typed text, when `input` is set) on confirm, null on cancel.
export function ask({ title, body = '', confirmLabel = 'Confirm', danger = false, input = null, requireText = null }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
      <h2 id="dlgTitle">${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ''}
      ${input ? `<textarea class="field" id="dlgInput" rows="3" placeholder="${esc(input.placeholder || '')}"></textarea>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn" data-a="cancel" type="button">Cancel</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok" type="button"${requireText ? ' disabled' : ''}>${esc(confirmLabel)}</button></div></div>`;
    document.body.append(wrap);
    const field = wrap.querySelector('#dlgInput');
    const ok = wrap.querySelector('[data-a=ok]');
    if (field && requireText) field.addEventListener('input', () => { ok.disabled = field.value.trim() !== requireText; });
    (field || ok).focus();
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.dataset.a === 'cancel') done(null);
      else if (e.target.dataset.a === 'ok') done(input ? field.value : true);
    });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(null); });
  });
}
