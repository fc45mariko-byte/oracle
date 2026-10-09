import { get, post, patch } from '../api.js';
import { esc, toast, field, formData } from '../ui.js';

const MODELS = [['', 'Default (Claude Opus 5.5)'], ['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (faster, cheaper)'], ['claude-fable-5-1', 'Claude Fable 5.1 (most capable, most expensive)']];
const EFFORTS = [['', 'Default (high)'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high']];

export async function render(el) {
  const [status, settings] = await Promise.all([get('/status'), get('/settings')]);
  const c = status.counts;
  const persistent = status.storage.persistent;
  el.innerHTML = `
    <h1>Memory &amp;<br>privacy.</h1>
    <p class="sub">What Oracle stores, where, and what leaves this device.</p>

    <div class="section-head"><h2>Where your data is</h2></div>
    <div class="card">
      <p>Everything Oracle remembers is stored <strong>in this browser, on this device</strong>. There is no Oracle server and no account; the site only delivers the app’s code. Other browsers and devices don’t see this record. It is not encrypted beyond what your device itself provides.</p>
      <p class="small">${persistent === true ? 'The browser has agreed to keep this storage and not clear it to save space.' : 'The browser has not promised to keep this storage: it may clear it if the device is low on space, and clearing site data or browsing privately removes it. Export regularly.'}</p>
      <div class="meta">${c.events} events · ${c.people} people · ${c.patterns} patterns · ${c.questions} questions · ${c.beliefs} beliefs · ${c.interpretations} interpretations · ${c.conversations} conversations</div>
    </div>

    <div class="section-head"><h2>AI model</h2></div>
    <form class="card" id="ai">
      <p>${status.ai.configured ? `<strong>On.</strong> Conversations use <span class="mono">${esc(status.ai.model)}</span>.` : '<strong>Off.</strong> Add an Anthropic API key to talk to Oracle. Everything else works without one.'}</p>
      <p class="small">${esc(status.ai.transmits)} The key is kept in this browser’s local storage, is sent only to api.anthropic.com, and is never included in exports. Usage is billed to your Anthropic account. Anthropic’s handling of API data follows your account’s terms.</p>
      ${field('apiKey', settings.hasApiKey ? 'API key (saved; type a new one to replace it)' : 'Anthropic API key', { type: 'password', placeholder: settings.hasApiKey ? '••••••••' : 'sk-ant-…' })}
      <div class="grid2">${field('model', 'Model', { options: MODELS, value: settings.model })}${field('effort', 'Thinking effort', { options: EFFORTS, value: settings.effort })}</div>
      <div class="row"><button class="btn primary">Save</button>${settings.hasApiKey ? '<button class="btn danger" type="button" id="forget">Remove key</button>' : ''}</div>
    </form>

    <div class="section-head"><h2>Inspect and correct</h2></div>
    <div class="card"><p>Every event, person, pattern, question, belief and interpretation can be opened and edited from its page. Event originals are never overwritten: corrections and later readings are added beside them, and edits to everything else keep the previous version in a history.</p>
      <details><summary>Recent changes to memory</summary><div id="log" class="small" style="margin-top:8px">Loading…</div></details></div>

    <div class="section-head"><h2>Export</h2></div>
    <div class="card"><p>Download everything as one JSON file: events, people, patterns, questions, beliefs, interpretations, conversations and the change log. This is your backup, and the way to move Oracle to another device.</p>
      <button class="btn" id="export">Export JSON</button></div>

    <div class="section-head"><h2>Import</h2></div>
    <div class="card"><p>Load an Oracle file: an export, or the Yosef case study (<span class="mono">case-study/yosef.oracle.json</span> in the repository). “Merge” adds what isn’t already here. “Replace” discards the current record first.</p>
      <input type="file" id="file" accept="application/json,.json" class="field">
      <div class="row"><button class="btn" id="merge">Merge</button><button class="btn danger" id="replace">Replace</button></div></div>

    <div class="section-head"><h2>Delete</h2></div>
    <div class="card"><p>Delete everything Oracle stores in this browser. This cannot be undone. Export first if you might want it back. Your API key is removed separately, above.</p>
      <button class="btn danger" id="wipe">Delete all data</button></div>
  `;
  const $ = (s) => el.querySelector(s);
  get('/log').then((log) => { $('#log').innerHTML = log.length ? log.slice(0, 60).map((l) => `<div>${esc(l.at.slice(0, 16).replace('T', ' '))} · ${esc(l.action)} · ${esc(l.collection)}${l.id ? ` · ${esc(l.id)}` : ''}${l.by ? ` · by ${esc(l.by)}` : ''}</div>`).join('') : 'No changes yet.'; });
  $('#ai').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const body = { model: d.model, effort: d.effort };
    if (d.apiKey.trim()) body.apiKey = d.apiKey.trim();
    await patch('/settings', body);
    toast('Saved on this device');
    render(el);
  });
  $('#forget')?.addEventListener('click', async () => {
    await patch('/settings', { apiKey: '' });
    toast('Key removed from this browser');
    render(el);
  });
  $('#export').addEventListener('click', async () => {
    const data = await get('/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `oracle-export-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const doImport = async (mode) => {
    const f = $('#file').files[0];
    if (!f) { toast('Choose a file first'); return; }
    if (mode === 'replace' && !confirm('Replace the entire current record with this file?')) return;
    try {
      const data = JSON.parse(await f.text());
      const counts = await post('/import', { data, mode });
      toast(`Imported. ${counts.events} events now in the record.`);
      render(el);
    } catch (e) { toast(e.message); }
  };
  $('#merge').addEventListener('click', () => doImport('merge'));
  $('#replace').addEventListener('click', () => doImport('replace'));
  $('#wipe').addEventListener('click', async () => {
    const typed = prompt('Type DELETE to erase everything Oracle stores in this browser.');
    if (typed !== 'DELETE') return;
    await post('/delete-all', { confirm: 'DELETE' });
    toast('All data deleted');
    render(el);
  });
}
