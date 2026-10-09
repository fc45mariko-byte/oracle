// What the page can use where it runs.
// - Inside claude.ai (published as an artifact): `window.claude.use(name)` gives the platform's
//   capabilities: `db` (storage), `sample` (Claude, on the viewer's own account), `user`, `downloads`.
// - Anywhere else (a static host, localhost): none of those; the app uses IndexedDB and an API key.

const hasRuntime = typeof window !== 'undefined' && typeof window.claude?.use === 'function';

const cache = new Map();
export function capability(name) {
  if (!hasRuntime) return Promise.resolve(null);
  if (!cache.has(name)) cache.set(name, window.claude.use(name).catch(() => null));
  return cache.get(name);
}

export const inClaude = hasRuntime;

export async function viewerId() {
  const user = await capability('user');
  if (!user) return null;
  try { return await user.id(); } catch { return null; }
}
