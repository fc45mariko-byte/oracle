// Entry point: routes in-page paths ("/people/p_yosef") to views. Each view exports `render(el, ...args)`.

import { esc } from './ui.js';
import { startRouter } from './router.js';
import * as home from './views/home.js';
import * as talk from './views/talk.js';
import * as people from './views/people.js';
import * as timeline from './views/timeline.js';
import * as patterns from './views/patterns.js';
import * as questions from './views/questions.js';
import * as mind from './views/mind.js';
import * as memory from './views/memory.js';
import * as sim from './views/sim.js';

const routes = {
  '': [home.render, 'home'],
  talk: [talk.render, 'talk'],
  people: [people.render, 'people'],
  timeline: [timeline.render, 'timeline'],
  event: [timeline.renderEvent, 'timeline'],
  add: [timeline.renderAdd, 'timeline'],
  patterns: [patterns.render, 'home'],
  questions: [questions.render, 'home'],
  mind: [mind.render, 'home'],
  memory: [memory.render, 'memory'],
  sim: [sim.render, 'talk'],
};

let first = true;
async function show(path, { fresh }) {
  const [name = '', ...args] = path.replace(/^\/?/, '').split('/').map(decodeURIComponent);
  const [render, nav] = routes[name] || routes[''];
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  const el = document.getElementById('view');
  if (fresh) el.innerHTML = `<div class="empty">${first ? 'Opening your record…' : '…'}</div>`;
  try {
    await render(el, ...args.filter(Boolean));
  } catch (e) {
    el.innerHTML = `<h1>Something went wrong.</h1><p class="sub">${esc(e.message)}</p>`;
    console.error(e);
  }
  first = false;
  if (fresh && name !== 'talk') window.scrollTo(0, 0);
}

document.addEventListener('oracle:save-error', () => {
  const t = document.getElementById('toast');
  t.textContent = 'Your last change could not be saved. Export your record from Memory now.';
  t.classList.add('show');
});
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
}
startRouter(show);
