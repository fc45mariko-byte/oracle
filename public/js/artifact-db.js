// Storage backend for Oracle published on claude.ai: the record is kept in the artifact's database,
// in the viewer's private area (`data/users/<id>/…`), which no one else can read, not even the
// artifact's owner viewing as someone else. A document holds at most 256 KiB, so the record (one JSON
// document that grows with conversations) is split into chunks, and a small manifest names the
// current set. A save writes new chunks first and switches the manifest last, so a save that fails
// half-way leaves the previous version intact.

const CHUNK = 180_000; // characters per chunk, safely under the 256 KiB document limit

export class ArtifactDbBackend {
  constructor(db, uid) {
    this.db = db;
    this.base = `data/users/${uid}`;
    this.manifest = db.doc(`${this.base}/oracle`);
    this.chunks = this.manifest.collection('chunks');
    this.current = null;
  }

  async load() {
    const m = await this.manifest.get();
    if (!m.exists) return null;
    const { version, count } = m.data();
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => this.chunks.doc(`${version}-${i}`).get()));
    if (parts.some((p) => !p.exists)) throw new Error('The saved record is incomplete. Restore from an export.');
    this.current = { version, count };
    return JSON.parse(parts.map((p) => p.data().s).join(''));
  }

  async save(data) {
    const text = JSON.stringify(data);
    const version = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const count = Math.max(1, Math.ceil(text.length / CHUNK));
    for (let i = 0; i < count; i++) {
      await this.chunks.doc(`${version}-${i}`).set({ s: text.slice(i * CHUNK, (i + 1) * CHUNK) });
    }
    await this.manifest.set({ version, count, savedAt: new Date().toISOString(), chars: text.length });
    const old = this.current;
    this.current = { version, count };
    if (old) {
      for (let i = 0; i < old.count; i++) await this.chunks.doc(`${old.version}-${i}`).delete().catch(() => {});
    }
  }

  describe() {
    return {
      kind: 'claude-artifact-db',
      location: 'Your private area of this page’s database on claude.ai. Only you can read it.',
      encrypted: false,
      persistent: true,
    };
  }
}
