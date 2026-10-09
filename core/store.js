// The Oracle store: one JSON document holding every memory layer.
//
// Storage-agnostic: it takes a `backend` with load() and save(data). In the browser the backend is
// IndexedDB (public/js/idb.js); tests and evals use the in-memory backend below. save() may return a
// promise; saves are chained so they land in order, and `flush()` waits for the last one.

import {
  COLLECTIONS, AnnotationInput, emptyStore, newId, now, SCHEMA_VERSION, byChronology,
} from './model.js';

export class MemoryBackend {
  constructor(initial = null) { this.data = initial; }
  load() { return this.data ? structuredClone(this.data) : null; }
  save(data) { this.data = structuredClone(data); }
  describe() { return { kind: 'memory', location: 'in memory (tests)', encrypted: false }; }
}

export class NotFound extends Error {}

export class Store {
  // For synchronous backends. Use Store.open() for backends whose load() is async.
  constructor(backend, data = undefined) {
    this.backend = backend;
    this.saving = Promise.resolve();
    this.onSaveError = (e) => console.error('Oracle: saving failed', e);
    this.data = (data === undefined ? backend.load() : data) || emptyStore();
    if (this.data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported store schema version ${this.data.schemaVersion}`);
    }
    this.#ensureSelf();
  }

  // There is always a profile for the user herself, so events can name her.
  #ensureSelf() {
    if (this.data.people.some((p) => p.isSelf)) return;
    this.data.people.unshift({
      id: 'p_self', name: 'Me', aliases: ['self', 'me'], context: 'The person Oracle works with.', howMet: '',
      explicitStatements: [], observations: [], unknowns: [], notes: '', isSelf: true,
      createdAt: now(), updatedAt: now(), createdBy: 'system', history: [],
    });
  }

  static async open(backend) {
    return new Store(backend, (await backend.load()) || null);
  }

  persist() {
    const snapshot = structuredClone(this.data);
    this.saving = this.saving.then(() => this.backend.save(snapshot)).catch((e) => this.onSaveError(e));
  }

  flush() { return this.saving; }

  audit(action, collection, id, detail = {}) {
    this.data.log.push({ at: now(), action, collection, id, ...detail });
  }

  // ---- generic collections -------------------------------------------------

  list(collection) {
    this.#check(collection);
    const items = this.data[collection];
    return collection === 'events' ? [...items].sort(byChronology) : [...items];
  }

  get(collection, id) {
    this.#check(collection);
    const item = this.data[collection].find((x) => x.id === id);
    if (!item) throw new NotFound(`${collection}/${id} not found`);
    return item;
  }

  find(id) {
    for (const c of Object.keys(COLLECTIONS)) {
      const item = this.data[c].find((x) => x.id === id);
      if (item) return { collection: c, item };
    }
    return null;
  }

  create(collection, input, { id, by = 'user' } = {}) {
    const { schema, prefix } = this.#check(collection);
    const parsed = schema.parse(input);
    const item = {
      id: id || newId(prefix),
      ...parsed,
      createdAt: now(),
      updatedAt: now(),
      createdBy: by,
      history: [],
      ...(collection === 'events' ? { annotations: [] } : {}),
    };
    if (this.data[collection].some((x) => x.id === item.id)) throw new Error(`Duplicate id ${item.id}`);
    this.data[collection].push(item);
    this.audit('create', collection, item.id, { by });
    this.persist();
    return item;
  }

  // Updates keep a history of previous values (spec: corrections must not erase the record).
  // Events' `original` field can never be updated; use a correction annotation instead.
  update(collection, id, patch, { by = 'user', reason = '' } = {}) {
    const { schema } = this.#check(collection);
    const item = this.get(collection, id);
    if (collection === 'events' && 'original' in patch) {
      throw new Error('The original record of an event is immutable. Add a correction instead.');
    }
    // zod applies defaults even in partial mode, so keep only the keys the caller actually sent.
    const parsed = schema.partial().parse(patch);
    const partial = Object.fromEntries(Object.entries(parsed).filter(([k]) => k in patch));
    const before = {};
    for (const k of Object.keys(partial)) before[k] = item[k];
    Object.assign(item, partial, { updatedAt: now() });
    item.history.push({ at: now(), by, reason, before });
    this.audit('update', collection, id, { by, fields: Object.keys(partial) });
    this.persist();
    return item;
  }

  remove(collection, id) {
    this.#check(collection);
    const idx = this.data[collection].findIndex((x) => x.id === id);
    if (idx < 0) throw new NotFound(`${collection}/${id} not found`);
    this.data[collection].splice(idx, 1);
    // Remove dangling references so the graph stays consistent.
    for (const c of Object.keys(COLLECTIONS)) {
      for (const x of this.data[c]) {
        for (const key of ['personIds', 'relatedEventIds', 'supportingEventIds', 'counterEventIds', 'evidenceEventIds', 'evidenceIds']) {
          if (Array.isArray(x[key])) x[key] = x[key].filter((r) => r !== id);
        }
      }
    }
    this.audit('delete', collection, id);
    this.persist();
  }

  // ---- events: annotations and corrections ----------------------------------

  annotateEvent(eventId, input) {
    const ev = this.get('events', eventId);
    const a = AnnotationInput.parse(input);
    if (a.kind === 'correction') {
      if (!a.field) throw new Error('A correction needs a field');
      if (a.field === 'original') throw new Error('The original record cannot be corrected in place; add a note instead.');
    }
    const annotation = {
      id: newId('an'), at: now(), status: 'active', ...a,
      ...(a.kind === 'correction' ? { from: ev[a.field] } : {}),
    };
    ev.annotations.push(annotation);
    ev.updatedAt = now();
    this.audit('annotate', 'events', eventId, { kind: a.kind, by: a.author });
    this.persist();
    return annotation;
  }

  // Annotations are never deleted, only marked superseded/withdrawn, so the record of past
  // interpretations remains available.
  setAnnotationStatus(eventId, annotationId, status) {
    const ev = this.get('events', eventId);
    const a = ev.annotations.find((x) => x.id === annotationId);
    if (!a) throw new NotFound('annotation not found');
    if (!['active', 'superseded', 'withdrawn'].includes(status)) throw new Error('bad status');
    a.status = status;
    a.statusChangedAt = now();
    this.audit('annotation-status', 'events', eventId, { annotationId, status });
    this.persist();
    return a;
  }

  linkEvents(a, b) {
    const ea = this.get('events', a), eb = this.get('events', b);
    if (!ea.relatedEventIds.includes(b)) ea.relatedEventIds.push(b);
    if (!eb.relatedEventIds.includes(a)) eb.relatedEventIds.push(a);
    this.audit('link', 'events', a, { to: b });
    this.persist();
  }

  // ---- conversations --------------------------------------------------------

  createConversation({ title = '', personIds = [] } = {}) {
    const c = { id: newId('c'), title, personIds, createdAt: now(), updatedAt: now(), messages: [] };
    this.data.conversations.push(c);
    this.persist();
    return c;
  }

  getConversation(id) {
    const c = this.data.conversations.find((x) => x.id === id);
    if (!c) throw new NotFound(`conversation ${id} not found`);
    return c;
  }

  appendMessage(conversationId, message) {
    const c = this.getConversation(conversationId);
    const m = { id: newId('m'), at: now(), ...message };
    c.messages.push(m);
    c.updatedAt = now();
    if (!c.title && message.role === 'user') c.title = message.text.slice(0, 80);
    this.persist();
    return m;
  }

  deleteConversation(id) {
    const i = this.data.conversations.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFound('conversation not found');
    this.data.conversations.splice(i, 1);
    this.audit('delete', 'conversations', id);
    this.persist();
  }

  // ---- whole-store operations ----------------------------------------------

  exportAll() { return structuredClone(this.data); }

  importAll(data, { mode = 'replace' } = {}) {
    if (!data || data.schemaVersion !== SCHEMA_VERSION) throw new Error('Not an Oracle export (schema version mismatch)');
    if (mode === 'replace') {
      this.data = { ...emptyStore(), ...structuredClone(data) };
      this.#ensureSelf();
    } else {
      // merge: add items whose ids are not present yet
      for (const c of [...Object.keys(COLLECTIONS), 'conversations']) {
        const have = new Set(this.data[c].map((x) => x.id));
        for (const x of data[c] || []) if (!have.has(x.id)) this.data[c].push(structuredClone(x));
      }
      // The device always starts with a blank self profile; take the imported one if it has content.
      const incomingSelf = (data.people || []).find((p) => p.isSelf);
      const mine = this.data.people.find((p) => p.isSelf);
      if (incomingSelf && mine && mine.id === incomingSelf.id && !mine.explicitStatements.length && !mine.notes) {
        Object.assign(mine, structuredClone(incomingSelf));
      }
    }
    this.audit('import', '*', null, { mode });
    this.persist();
  }

  deleteAll() {
    this.data = emptyStore();
    this.#ensureSelf();
    this.persist();
  }

  stats() {
    const s = {};
    for (const c of [...Object.keys(COLLECTIONS), 'conversations']) s[c] = this.data[c].length;
    return s;
  }

  #check(collection) {
    const def = COLLECTIONS[collection];
    if (!def) throw new Error(`Unknown collection ${collection}`);
    return def;
  }
}
