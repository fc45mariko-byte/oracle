// Oracle HTTP server: serves the web app (public/) and a JSON API (/api/*).
// No framework; node:http only.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { Store, FileBackend, NotFound } from './store.js';
import { COLLECTIONS, currentEvent } from './model.js';
import { importYosefCase } from './seed.js';
import { runTurn, createClient, aiStatus, reviewPrompt, AIUnavailable } from './intelligence.js';
import { applyProposal, validateProposal } from './proposals.js';
import { personSummaryStats } from './analysis.js';
import { retrieve } from './retrieval.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

export function createApp({ store, client, passcode = process.env.ORACLE_PASSCODE || '' }) {
  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler });
  };

  // ---- status ---------------------------------------------------------------
  route('GET', '/api/status', () => ({
    ai: aiStatus(),
    storage: { ...store.backend.describe(), note: 'Stored as a plain JSON file on the machine running this server. Not encrypted. Not synced anywhere.' },
    counts: store.stats(),
    passcodeRequired: Boolean(passcode),
  }));

  // ---- generic collections ----------------------------------------------------
  for (const col of Object.keys(COLLECTIONS)) {
    route('GET', `/api/${col}`, () => store.list(col).map((x) => (col === 'events' ? { ...x, current: currentEvent(x) } : x)));
    route('GET', `/api/${col}/:id`, ({ id }) => {
      const x = store.get(col, id);
      return col === 'events' ? { ...x, current: currentEvent(x) } : x;
    });
    route('POST', `/api/${col}`, (_, body) => store.create(col, body));
    route('PATCH', `/api/${col}/:id`, ({ id }, body) => {
      const { _reason, ...patch } = body;
      return store.update(col, id, patch, { reason: _reason || '' });
    });
    route('DELETE', `/api/${col}/:id`, ({ id }) => { store.remove(col, id); return { ok: true }; });
  }

  route('POST', '/api/events/:id/annotations', ({ id }, body) => store.annotateEvent(id, body));
  route('PATCH', '/api/events/:id/annotations/:aid', ({ id, aid }, body) => store.setAnnotationStatus(id, aid, body.status));
  route('POST', '/api/events/:id/link', ({ id }, body) => { store.linkEvents(id, body.otherId); return { ok: true }; });

  route('GET', '/api/people/:id/overview', ({ id }) => {
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

  // What retrieval would send for a given message (transparency / debugging).
  route('POST', '/api/retrieve', (_, body) => {
    const r = retrieve(store, { text: body.text || '', focusPersonIds: body.personIds || [] });
    return { trace: r.trace, context: r.context, chars: r.context.length };
  });

  // ---- conversations --------------------------------------------------------
  route('GET', '/api/conversations', () => store.data.conversations
    .map(({ messages, ...c }) => ({ ...c, messageCount: messages.length }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  route('POST', '/api/conversations', (_, body) => store.createConversation(body || {}));
  route('GET', '/api/conversations/:id', ({ id }) => store.getConversation(id));
  route('DELETE', '/api/conversations/:id', ({ id }) => { store.deleteConversation(id); return { ok: true }; });
  route('POST', '/api/conversations/:id/messages', async ({ id }, body) => {
    if (!body.text?.trim()) throw new BadRequest('Empty message');
    return runTurn(store, client, id, body.text.trim());
  });
  route('POST', '/api/conversations/:id/review', async ({ id }, body) => {
    return runTurn(store, client, id, reviewPrompt(store, body.personId), { mode: 'review' });
  });
  route('POST', '/api/conversations/:id/messages/:mid/proposals/:idx', ({ id, mid, idx }, body) => {
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
  route('GET', '/api/export', () => store.exportAll());
  route('POST', '/api/import', (_, body) => { store.importAll(body.data, { mode: body.mode || 'replace' }); return store.stats(); });
  route('POST', '/api/delete-all', (_, body) => {
    if (body.confirm !== 'DELETE') throw new BadRequest('Send {"confirm":"DELETE"}');
    store.deleteAll();
    return { ok: true };
  });
  route('POST', '/api/case-study/yosef', () => importYosefCase(store));
  route('GET', '/api/log', () => store.data.log.slice(-200).reverse());

  const checkPasscode = (req) => {
    if (!passcode) return true;
    const got = Buffer.from(String(req.headers['x-oracle-passcode'] || ''));
    const want = Buffer.from(passcode);
    return got.length === want.length && timingSafeEqual(got, want);
  };

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://local');
    if (url.pathname.startsWith('/api/')) {
      if (!checkPasscode(req)) return send(res, 401, { error: 'Passcode required' });
      const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
      if (!r) return send(res, 404, { error: 'Not found' });
      const m = url.pathname.match(r.re);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      try {
        const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readJson(req) : {};
        const out = await r.handler(params, body);
        return send(res, 200, out);
      } catch (e) {
        const status = e instanceof NotFound ? 404 : e instanceof AIUnavailable ? 503
          : e instanceof BadRequest || e?.name === 'ZodError' || e?.issues ? 400
          : e instanceof Error && /immutable|cannot be corrected|Duplicate|needs a field/.test(e.message) ? 400
          : e?.status && e.status >= 400 && e.status < 600 ? 502 : 500;
        const message = e?.issues ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : e.message;
        if (status >= 500) console.error(e);
        return send(res, status, { error: message });
      }
    }
    return serveStatic(url.pathname, res);
  };
}

class BadRequest extends Error {}

function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 50e6) reject(new BadRequest('Body too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new BadRequest('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // Single-page app: unknown paths get the shell.
    const index = path.join(PUBLIC, 'index.html');
    res.writeHead(200, { 'content-type': MIME['.html'] });
    return fs.createReadStream(index).pipe(res);
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dataFile = process.env.ORACLE_DATA || path.join(here, '..', 'data', 'oracle.json');
  const store = new Store(new FileBackend(dataFile));
  const client = createClient();
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 4321);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !process.env.ORACLE_PASSCODE) {
    console.error(`Refusing to listen on ${host} without ORACLE_PASSCODE set: your record would be readable by anyone on the network.`);
    process.exit(1);
  }
  http.createServer(createApp({ store, client })).listen(port, host, () => {
    const ai = aiStatus();
    console.log(`Oracle on http://${host}:${port}`);
    console.log(`Data file: ${path.resolve(dataFile)} (plain JSON, not encrypted)`);
    console.log(ai.configured ? `AI: ${ai.provider}, ${ai.model}` : 'AI: not configured (set ANTHROPIC_API_KEY). The record works; conversation is disabled.');
  });
}
