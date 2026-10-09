import { get, post, getPasscode, setPasscode } from '../api.js';
import { esc, toast } from '../ui.js';

export async function render(el) {
  let status = null;
  try { status = await get('/status'); } catch (e) { if (e.status !== 401) throw e; }
  if (!status) {
    el.innerHTML = `<h1>Passcode.</h1><p class="sub">This server was started with a passcode. It is stored only in this browser.</p>
      <input class="field" id="pc" type="password" value="${esc(getPasscode())}"><button class="btn primary" id="save">Unlock</button>`;
    el.querySelector('#save').addEventListener('click', () => { setPasscode(el.querySelector('#pc').value); location.hash = '#/'; location.reload(); });
    return;
  }
  const c = status.counts;
  el.innerHTML = `
    <h1>Memory &amp;<br>privacy.</h1>
    <p class="sub">What Oracle stores, where, and what leaves this machine.</p>

    <div class="section-head"><h2>Where your data is</h2></div>
    <div class="card">
      <p>${esc(status.storage.note)}</p>
      <p class="mono" style="word-break:break-all">${esc(status.storage.path || 'in memory')}</p>
      <div class="meta">${c.events} events · ${c.people} people · ${c.patterns} patterns · ${c.questions} questions · ${c.beliefs} beliefs · ${c.interpretations} interpretations · ${c.conversations} conversations</div>
    </div>

    <div class="section-head"><h2>What is sent to an AI service</h2></div>
    <div class="card">
      <p>${status.ai.configured ? `<strong>On.</strong> ${esc(status.ai.provider)}, model <span class="mono">${esc(status.ai.model)}</span>.` : '<strong>Off.</strong> No AI model is configured, so nothing is sent anywhere.'}</p>
      <p>${esc(status.ai.transmits)}</p>
      <p class="small">Anthropic’s handling of API data is governed by your API account’s terms and retention settings, not by this app. You can see exactly what would be sent for any message with “Preview recall” in a conversation.</p>
      ${status.ai.configured ? '' : '<p class="small">To turn it on: stop the server, put <span class="mono">ANTHROPIC_API_KEY=…</span> in a <span class="mono">.env</span> file next to package.json (or export it), then <span class="mono">npm start</span>.</p>'}
    </div>

    <div class="section-head"><h2>Inspect and correct</h2></div>
    <div class="card"><p>Every event, person, pattern, question, belief and interpretation can be opened and edited from its page. Event originals are never overwritten: corrections and later readings are added beside them, and edits to everything else keep the previous version in a history.</p>
      <details><summary>Recent changes to memory</summary><div id="log" class="small" style="margin-top:8px">Loading…</div></details></div>

    <div class="section-head"><h2>Export</h2></div>
    <div class="card"><p>Download everything as one JSON file: events, people, patterns, questions, beliefs, interpretations, conversations and the change log.</p>
      <button class="btn" id="export">Export JSON</button></div>

    <div class="section-head"><h2>Import</h2></div>
    <div class="card"><p>Load an Oracle export. “Merge” adds items that aren’t already present. “Replace” discards the current record first.</p>
      <input type="file" id="file" accept="application/json" class="field">
      <div class="row"><button class="btn" id="merge">Merge</button><button class="btn danger" id="replace">Replace</button></div></div>

    <div class="section-head"><h2>Case study</h2></div>
    <div class="card"><p>Load the documented Yosef timeline (53 dated events, imported as you wrote them) together with the narrative document’s content, patterns, open questions and earlier interpretations. Gaps and ambiguities are marked, not filled. Loading again never overwrites your corrections.</p>
      <button class="btn" id="seed">Load the Yosef case study</button></div>

    <div class="section-head"><h2>Delete</h2></div>
    <div class="card"><p>Delete everything Oracle stores on this machine. This cannot be undone. Export first if you might want it back.</p>
      <button class="btn danger" id="wipe">Delete all data</button></div>

    <div class="section-head"><h2>Passcode</h2></div>
    <div class="card"><p class="small">${status.passcodeRequired ? 'This server requires a passcode. It is saved in this browser only.' : 'This server is only reachable from this machine and does not use a passcode.'}</p>
      ${status.passcodeRequired ? `<input class="field" id="pc" type="password" value="${esc(getPasscode())}"><button class="btn" id="savePc">Save passcode</button>` : ''}</div>
  `;
  const $ = (s) => el.querySelector(s);
  get('/log').then((log) => { $('#log').innerHTML = log.length ? log.slice(0, 60).map((l) => `<div>${esc(l.at.slice(0, 16).replace('T', ' '))} · ${esc(l.action)} · ${esc(l.collection)}${l.id ? ` · ${esc(l.id)}` : ''}${l.by ? ` · by ${esc(l.by)}` : ''}</div>`).join('') : 'No changes yet.'; });
  $('#export').addEventListener('click', async () => {
    const data = await get('/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `oracle-export-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
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
  $('#seed').addEventListener('click', async () => {
    const added = await post('/case-study/yosef');
    toast(`Added ${added.events} events, ${added.patterns} patterns, ${added.questions} questions`);
    render(el);
  });
  $('#wipe').addEventListener('click', async () => {
    const typed = prompt('Type DELETE to erase everything Oracle stores.');
    if (typed !== 'DELETE') return;
    await post('/delete-all', { confirm: 'DELETE' });
    toast('All data deleted');
    render(el);
  });
  $('#savePc')?.addEventListener('click', () => { setPasscode($('#pc').value); toast('Saved in this browser'); });
}
