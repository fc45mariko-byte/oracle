// Router. Each view module exports `render(el, ...args)`.

import { esc } from './ui.js';
import * as home from './views/home.js';
import * as talk from './views/talk.js';
import * as people from './views/people.js';
import * as timeline from './views/timeline.js';
import * as patterns from './views/patterns.js';
import * as questions from './views/questions.js';
import * as mind from './views/mind.js';
import * as memory from './views/memory.js';

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
};

async function route() {
  const [name = '', ...args] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [render, nav] = routes[name] || routes[''];
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  const el = document.getElementById('view');
  el.innerHTML = '<div class="empty">…</div>';
  try {
    await render(el, ...args.filter(Boolean));
  } catch (e) {
    if (e.status === 401) {
      el.innerHTML = `<h1>Locked.</h1><p class="sub">This Oracle server requires a passcode.</p><a class="btn primary" href="#/memory">Enter passcode</a>`;
      if (name !== 'memory') return;
      await memory.render(el);
      return;
    }
    el.innerHTML = `<h1>Something went wrong.</h1><p class="sub">${esc(e.message)}</p>`;
    console.error(e);
  }
  if (!args.length || name !== 'talk') window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
