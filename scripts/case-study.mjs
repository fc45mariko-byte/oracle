// Writes the Yosef case study as an Oracle import file: case-study/yosef.oracle.json.
// Import it in the app under Memory → Import → Merge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, MemoryBackend } from '../core/store.js';
import { importYosefCase } from '../seed/import.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Store(new MemoryBackend());
importYosefCase(store);
const data = store.exportAll();
data.log = []; // the import's own audit entries are not meaningful on another device
const file = path.join(root, 'case-study', 'yosef.oracle.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Wrote ${path.relative(root, file)}: ${data.events.length} events, ${data.patterns.length} patterns, ${data.questions.length} questions`);
