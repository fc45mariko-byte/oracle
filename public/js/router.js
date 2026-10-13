// In-page navigation. Links use href="#/path" and are intercepted here, so the app never depends on
// the address bar (claude.ai pages don't pass in-page addresses through). Outside claude.ai the path is
// mirrored into the URL hash so reloads and the browser's back button work.

import { inClaude } from './platform.js';

const stack = [];
let render = () => {};

export function current() { return stack.at(-1) || '/'; }

function mirror(path, replace) {
  if (inClaude) return;
  try { history[replace ? 'replaceState' : 'pushState'](null, '', `#${path}`); } catch { /* sandboxed */ }
}

export function navigate(path, { replace = false, silent = false } = {}) {
  path = path.replace(/^#/, '') || '/';
  if (replace && stack.length) stack[stack.length - 1] = path; else stack.push(path);
  mirror(path, replace);
  if (!silent) render(path, { fresh: true });
}

export function back() {
  if (stack.length > 1) stack.pop();
  mirror(current(), true);
  render(current(), { fresh: true });
}

export function rerender() { render(current(), { fresh: false }); }

export function startRouter(onRender) {
  render = onRender;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (href === '#back') back(); else navigate(href);
  });
  if (!inClaude) {
    window.addEventListener('popstate', () => {
      const path = location.hash.replace(/^#/, '') || '/';
      stack.push(path);
      render(path, { fresh: true });
    });
  }
  const initial = !inClaude && location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  stack.push(initial);
  render(initial, { fresh: true });
}
