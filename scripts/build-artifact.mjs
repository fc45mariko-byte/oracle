// Builds the claude.ai version of Oracle into dist-artifact/: a page fragment (claude.ai wraps it in
// its own document), one script, and the Yosef case study as a separate file the page loads only
// when you press "Load the Yosef case study".

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-artifact');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'public/js/app.js')],
  bundle: true,
  format: 'iife',
  target: ['es2022', 'safari16'],
  minify: true,
  legalComments: 'none',
  outfile: path.join(out, 'app.js'),
  logLevel: 'warning',
});
const bundle = fs.readFileSync(path.join(out, 'app.js'), 'utf8');
for (const marker of ['nemeparlesplusjamais', 'e_2025_07_06_rain', 'fruitz matching']) {
  if (bundle.includes(marker)) throw new Error(`Case-study content leaked into the bundle (${marker})`);
}

const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const body = html.slice(html.indexOf('<main'), html.indexOf('<script'));
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
fs.writeFileSync(path.join(out, 'oracle.html'), `<title>Oracle</title>\n<style>\n${css}</style>\n${body}<script src="app.js"></script>\n`);

const caseFile = path.join(root, 'case-study', 'yosef.oracle.json');
fs.copyFileSync(caseFile, path.join(out, 'case-study.json'));
console.log(`Built dist-artifact/ (app.js ${(bundle.length / 1024).toFixed(0)} KB)`);
