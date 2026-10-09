import { get, post, patch, saveFile, fetchCaseStudy, inClaude } from '../api.js';
import { esc, toast, field, formData, ask } from '../ui.js';
import { rerender } from '../router.js';

const MODELS = [['', 'Default (Claude Opus 5.5)'], ['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (faster, cheaper)'], ['claude-fable-5-1', 'Claude Fable 5.1 (most capable, most expensive)']];
const EFFORTS = [['', 'Default (high)'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high']];
const TIERS = [['', 'Most capable (default)'], ['default', 'Balanced, faster'], ['quick', 'Quickest, lightest']];
const SAMPLE_EFFORTS = [['', 'Platform default'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];

export async function render(el) {
  const [status, settings] = await Promise.all([get('/status'), get('/settings')]);
  const c = status.counts;
  const st = status.storage;
  const viaClaude = Boolean(status.ai.viaClaudeAi);

  const whereText = st.kind === 'claude-artifact-db'
    ? 'Everything Oracle remembers is saved in <strong>your private area of this page on claude.ai</strong>. It follows your claude.ai account, so it is there on your phone and your computer. No one else who opens this page can read it, and Claude, outside this page, cannot read it either.'
    : 'Everything Oracle remembers is stored <strong>in this browser, on this device</strong>. Other browsers and devices don’t see this record. It is not encrypted beyond what your device itself provides.';
  const keepText = st.kind === 'claude-artifact-db'
    ? 'It is kept for as long as this page exists. Deleting the page deletes it, so export now and then.'
    : st.persistent === true ? 'The browser has agreed to keep this storage and not clear it to save space.'
      : 'The browser has not promised to keep this storage: it may clear it if the device is low on space, and clearing site data or browsing privately removes it. Export regularly.';

  const aiForm = viaClaude ? `
    <form class="card" id="ai">
      <p>${status.ai.configured ? '<strong>On.</strong> Oracle answers with Claude, through your claude.ai account. No API key is needed; it uses your own Claude usage.' : '<strong>Off.</strong> Claude isn’t available on this page right now.'}</p>
      <p class="small">${esc(status.ai.transmits)} The first time, claude.ai asks whether this page may use Claude.</p>
      <div class="grid2">${field('tier', 'Model', { options: TIERS, value: settings.tier })}${field('effort', 'Thinking', { options: SAMPLE_EFFORTS, value: settings.effort })}</div>
      <button class="btn primary">Save</button>
    </form>` : `
    <form class="card" id="ai">
      <p>${status.ai.configured ? `<strong>On.</strong> Conversations use <span class="mono">${esc(status.ai.model)}</span>.` : '<strong>Off.</strong> Add an Anthropic API key to talk to Oracle. Everything else works without one.'}</p>
      <p class="small">${esc(status.ai.transmits)} The key is kept in this browser’s local storage, is sent only to api.anthropic.com, and is never included in exports. Usage is billed to your Anthropic account.</p>
      ${field('apiKey', settings.hasApiKey ? 'API key (saved; type a new one to replace it)' : 'Anthropic API key', { type: 'password', placeholder: settings.hasApiKey ? '••••••••' : 'sk-ant-…' })}
      <div class="grid2">${field('model', 'Model', { options: MODELS, value: settings.model })}${field('effort', 'Thinking effort', { options: EFFORTS, value: settings.effort })}</div>
      <div class="row"><button class="btn primary">Save</button>${settings.hasApiKey ? '<button class="btn danger" type="button" id="forget">Remove key</button>' : ''}</div>
    </form>`;

  el.innerHTML = `
    <h1>Memory &amp;<br>privacy.</h1>
    <p class="sub">What Oracle stores, where, and what leaves it.</p>

    <div class="section-head"><h2>Where your data is</h2></div>
    <div class="card">
      <p>${whereText}</p>
      <p class="small">${esc(keepText)}</p>
      <div class="meta">${c.events} events · ${c.people} people · ${c.patterns} patterns · ${c.questions} questions · ${c.beliefs} beliefs · ${c.interpretations} interpretations · ${c.conversations} conversations</div>
    </div>

    <div class="section-head"><h2>AI</h2></div>
    ${aiForm}

    ${inClaude ? `<div class="section-head"><h2>Case study</h2></div>
    <div class="card"><p>Load the documented Yosef timeline (53 dated events, as you wrote them) with the narrative document’s content, patterns, open questions and earlier interpretations. Gaps and ambiguities are marked, not filled. Loading again never overwrites your corrections.</p>
      <button class="btn" id="seed">Load the Yosef case study</button></div>` : ''}

    <div class="section-head"><h2>Inspect and correct</h2></div>
    <div class="card"><p>Every event, person, pattern, question, belief and interpretation can be opened and edited from its page. Event originals are never overwritten: corrections and later readings are added beside them, and edits to everything else keep the previous version in a history.</p>
      <details><summary>Recent changes to memory</summary><div id="log" class="small" style="margin-top:8px">Loading…</div></details></div>

    <div class="section-head"><h2>Export</h2></div>
    <div class="card"><p>Download everything as one JSON file: events, people, patterns, questions, beliefs, interpretations, conversations and the change log. This is your backup.</p>
      <button class="btn" id="export">Export JSON</button></div>

    <div class="section-head"><h2>Import</h2></div>
    <div class="card"><p>Load an Oracle file: an export${inClaude ? '' : ', or the Yosef case study (<span class="mono">case-study/yosef.oracle.json</span> in the repository)'}. “Merge” adds what isn’t already here. “Replace” discards the current record first.</p>
      <input type="file" id="file" accept="application/json,.json" class="field">
      <div class="row"><button class="btn" id="merge">Merge</button><button class="btn danger" id="replace">Replace</button></div></div>

    <div class="section-head"><h2>Delete</h2></div>
    <div class="card"><p>Delete everything Oracle has stored for you. This cannot be undone. Export first if you might want it back.</p>
      <button class="btn danger" id="wipe">Delete all data</button></div>
  `;
  const $ = (s) => el.querySelector(s);
  get('/log').then((log) => { $('#log').innerHTML = log.length ? log.slice(0, 60).map((l) => `<div>${esc(l.at.slice(0, 16).replace('T', ' '))} · ${esc(l.action)} · ${esc(l.collection)}${l.id ? ` · ${esc(l.id)}` : ''}${l.by ? ` · by ${esc(l.by)}` : ''}</div>`).join('') : 'No changes yet.'; });
  $('#ai').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const body = viaClaude ? { tier: d.tier, effort: d.effort } : { model: d.model, effort: d.effort };
    if (!viaClaude && d.apiKey.trim()) body.apiKey = d.apiKey.trim();
    await patch('/settings', body);
    toast('Saved');
    rerender();
  });
  $('#forget')?.addEventListener('click', async () => {
    await patch('/settings', { apiKey: '' });
    toast('Key removed from this browser');
    rerender();
  });
  $('#seed')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const data = await fetchCaseStudy();
      const counts = await post('/import', { data, mode: 'merge' });
      toast(`Case study loaded. ${counts.events} events in the record.`);
      rerender();
    } catch (err) { toast(err.message); e.target.disabled = false; }
  });
  $('#export').addEventListener('click', async () => {
    try {
      const data = await get('/export');
      const status = await saveFile(`oracle-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      if (status === 'saved') toast('Export saved');
    } catch (err) { toast(err?.code === 'declined' ? 'Export cancelled' : (err.message || 'Export failed')); }
  });
  const doImport = async (mode) => {
    const f = $('#file').files[0];
    if (!f) { toast('Choose a file first'); return; }
    if (mode === 'replace' && !await ask({ title: 'Replace your whole record?', body: 'The current record is discarded and replaced by this file.', confirmLabel: 'Replace', danger: true })) return;
    try {
      const data = JSON.parse(await f.text());
      const counts = await post('/import', { data, mode });
      toast(`Imported. ${counts.events} events now in the record.`);
      rerender();
    } catch (e) { toast(e.message); }
  };
  $('#merge').addEventListener('click', () => doImport('merge'));
  $('#replace').addEventListener('click', () => doImport('replace'));
  $('#wipe').addEventListener('click', async () => {
    const ok = await ask({ title: 'Delete all data?', body: 'Type DELETE to erase everything Oracle has stored for you.', confirmLabel: 'Delete everything', danger: true, input: { placeholder: 'DELETE' }, requireText: 'DELETE' });
    if (ok !== 'DELETE') return;
    await post('/delete-all', { confirm: 'DELETE' });
    toast('All data deleted');
    rerender();
  });
}
