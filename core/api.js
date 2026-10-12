// Oracle's API, as an in-process request handler. The web app calls `request(method, path, body)`
// exactly as it would call an HTTP API, but nothing leaves the browser: every route runs here,
// against the local store. Only conversation turns call out, to the Anthropic API.

import { COLLECTIONS, currentEvent } from './model.js';
import { NotFound } from './store.js';
import { runTurn, createClient, aiStatus, reviewPrompt, AIUnavailable } from './intelligence.js';
import { applyProposal, validateProposal } from './proposals.js';
import { personSummaryStats } from './analysis.js';
import { retrieve } from './retrieval.js';
import { runSimTurn } from './simulation.js';

export class BadRequest extends Error {}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * @param {{ store: import('./store.js').Store,
 *           settings: { get(): object, set(patch: object): void },
 *           client?: object }} deps  `client` overrides the Anthropic client (tests).
 */
export function createApi({ store, settings, client: clientOverride, getClient, aiInfo }) {
  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler });
  };
  // Where conversation goes: an explicit client (tests), a provided one (claude.ai's sample), or the
  // Anthropic SDK with the API key from settings.
  const client = () => (clientOverride !== undefined ? clientOverride : (getClient?.() || createClient(settings.get())));

  // ---- status and settings ---------------------------------------------------
  route('GET', '/status', () => ({
    ai: { ...aiStatus(settings.get()), ...(aiInfo?.() || {}), configured: Boolean(client()) },
    storage: store.backend.describe(),
    counts: store.stats(),
  }));
  route('GET', '/settings', () => {
    const s = settings.get();
    return { model: s.model || '', effort: s.effort || '', tier: s.tier || '', hasApiKey: Boolean(s.apiKey) };
  });
  route('PATCH', '/settings', (_, body) => {
    const patch = {};
    for (const k of ['apiKey', 'model', 'effort', 'tier']) if (k in body) patch[k] = String(body[k] || '').trim();
    settings.set(patch);
    return { ok: true };
  });

  // ---- generic collections ----------------------------------------------------
  for (const col of Object.keys(COLLECTIONS)) {
    route('GET', `/${col}`, () => store.list(col).map((x) => (col === 'events' ? { ...x, current: currentEvent(x) } : x)));
    route('GET', `/${col}/:id`, ({ id }) => {
      const x = store.get(col, id);
      return col === 'events' ? { ...x, current: currentEvent(x) } : x;
    });
    route('POST', `/${col}`, (_, body) => store.create(col, body));
    route('PATCH', `/${col}/:id`, ({ id }, body) => {
      const { _reason, ...patch } = body;
      return store.update(col, id, patch, { reason: _reason || '' });
    });
    route('DELETE', `/${col}/:id`, ({ id }) => { store.remove(col, id); return { ok: true }; });
  }

  route('POST', '/events/:id/annotations', ({ id }, body) => store.annotateEvent(id, body));
  route('PATCH', '/events/:id/annotations/:aid', ({ id, aid }, body) => store.setAnnotationStatus(id, aid, body.status));
  route('POST', '/events/:id/link', ({ id }, body) => { store.linkEvents(id, body.otherId); return { ok: true }; });

  route('GET', '/people/:id/overview', ({ id }) => {
    const person = store.get('people', id);
    const events = store.list('events').filter((e) => e.personIds.includes(id)).map((e) => ({ ...e, current: currentEvent(e) }));
    const has = (ids = []) => ids.includes(id);
    return {
      person,
      stats: personSummaryStats(store, id),
      events,
      patterns: store.data.patterns.filter((p) => has(p.personIds)),
      questions: store.data.questions.filter((q) => has(q.personIds)),
      beliefs: store.data.beliefs.filter((b) => b.subject === id),
      interpretations: store.data.interpretations.filter((i) => has(i.personIds)),
    };
  });

  // What retrieval would send for a given message (transparency; needs no API key).
  route('POST', '/retrieve', (_, body) => {
    const r = retrieve(store, { text: body.text || '', focusPersonIds: body.personIds || [] });
    return { trace: r.trace, context: r.context, chars: r.context.length };
  });

  // ---- conversations --------------------------------------------------------
  route('GET', '/conversations', () => store.data.conversations
    .filter((c) => c.kind !== 'simulation')
    .map(({ messages, ...c }) => ({ ...c, messageCount: messages.length }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  route('POST', '/conversations', (_, body) => store.createConversation({ title: body?.title, personIds: body?.personIds }));

  // ---- simulations: a chat with a person reconstructed from the record ------------
  route('GET', '/simulations', () => store.data.conversations
    .filter((c) => c.kind === 'simulation')
    .map(({ messages, ...c }) => ({ ...c, messageCount: messages.length, last: messages.at(-1)?.text || '' }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  route('POST', '/simulations', (_, body) => {
    const p = store.get('people', body.personId);
    if (p.isSelf) throw new BadRequest('Choose someone other than yourself');
    return store.createConversation({ kind: 'simulation', personIds: [p.id], title: `Simulation · ${p.name}` });
  });
  route('GET', '/simulations/:id', ({ id }) => store.getConversation(id));
  route('DELETE', '/simulations/:id', ({ id }) => { store.deleteConversation(id); return { ok: true }; });
  route('POST', '/simulations/:id/messages', async ({ id }, body) => {
    if (!body.text?.trim()) throw new BadRequest('Empty message');
    const s = settings.get();
    return runSimTurn(store, client(), id, body.text.trim(), { model: s.model || undefined, effort: s.effort || undefined });
  });
  route('GET', '/conversations/:id', ({ id }) => store.getConversation(id));
  route('DELETE', '/conversations/:id', ({ id }) => { store.deleteConversation(id); return { ok: true }; });
  route('POST', '/conversations/:id/messages', async ({ id }, body) => {
    if (!body.text?.trim()) throw new BadRequest('Empty message');
    const s = settings.get();
    return runTurn(store, client(), id, body.text.trim(), { model: s.model || undefined, effort: s.effort || undefined });
  });
  route('POST', '/conversations/:id/review', async ({ id }, body) => {
    const s = settings.get();
    return runTurn(store, client(), id, reviewPrompt(store, body.personId), { mode: 'review', model: s.model || undefined, effort: s.effort || undefined });
  });
  route('POST', '/conversations/:id/messages/:mid/proposals/:idx', ({ id, mid, idx }, body) => {
    const c = store.getConversation(id);
    const m = c.messages.find((x) => x.id === mid);
    const p = m?.proposals?.[Number(idx)];
    if (!p) throw new NotFound('proposal not found');
    if (p.status !== 'pending') throw new BadRequest(`This proposal is already ${p.status}`);
    if (body.action === 'accept') {
      if (body.data) { // the user may edit before accepting; re-validate the edited version
        const v = validateProposal(store, { ...p, data_json: { ...p.data, ...body.data } });
        if (v.status === 'invalid') throw new BadRequest(v.error);
        p.data = v.data;
      }
      p.result = applyProposal(store, p);
      p.status = 'accepted';
    } else if (body.action === 'reject') {
      p.status = 'rejected';
    } else throw new BadRequest('action must be accept or reject');
    p.decidedAt = new Date().toISOString();
    store.persist();
    return p;
  });

  // ---- whole-store ----------------------------------------------------------
  route('GET', '/export', () => store.exportAll());
  route('POST', '/import', (_, body) => { store.importAll(body.data, { mode: body.mode || 'replace' }); return store.stats(); });
  route('POST', '/delete-all', (_, body) => {
    if (body.confirm !== 'DELETE') throw new BadRequest('Confirmation required');
    store.deleteAll();
    return { ok: true };
  });
  route('GET', '/log', () => store.data.log.slice(-200).reverse());

  // Returns a deep copy, so callers can never mutate the store by accident.
  return async function request(method, path, body = {}) {
    const r = routes.find((x) => x.method === method && x.re.test(path));
    if (!r) throw new ApiError(404, `No route ${method} ${path}`);
    const m = path.match(r.re);
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const out = await r.handler(params, body ?? {});
      await store.flush();
      return out === undefined ? null : structuredClone(out);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      const status = e instanceof NotFound ? 404 : e instanceof AIUnavailable ? 503
        : e instanceof BadRequest || e?.issues ? 400
        : /immutable|cannot be corrected|Duplicate|needs a field|schema/.test(e?.message || '') ? 400
        : typeof e?.status === 'number' ? 502 : 500;
      const message = e?.issues ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : (e?.message || String(e));
      if (status === 500) console.error(e);
      throw new ApiError(status, status === 502 ? `The Anthropic API returned an error: ${message}` : message);
    }
  };
}
