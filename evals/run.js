// Runs the Yosef evaluation.
//   node evals/run.js            → offline retrieval checks only (free, deterministic)
//   node evals/run.js --live     → also runs each case through the real model and an LLM judge (costs API credits)
//   node evals/run.js --live --only sequence,gender

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { Store, MemoryBackend } from '../core/store.js';
import { importYosefCase } from '../seed/import.js';
import { retrieve } from '../core/retrieval.js';
import { runTurn, createClient, DEFAULT_MODEL } from '../core/intelligence.js';
import { CASES, COMMON } from './yosef-cases.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const live = args.includes('--live');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const JUDGE_MODEL = process.env.ORACLE_JUDGE_MODEL || 'claude-opus-5-5';
const TODAY = '2026-10-09';
const MODEL = process.env.ORACLE_MODEL || DEFAULT_MODEL;

const fresh = () => { const s = new Store(new MemoryBackend()); importYosefCase(s); return s; };
const cases = CASES.filter((c) => !only || only.includes(c.id));

const Verdict = z.object({ criteria: z.array(z.object({ id: z.string(), pass: z.boolean(), reason: z.string() })) });

async function judge(client, c, contextText, out) {
  const criteria = [...c.rubric, ...COMMON];
  const res = await client.beta.messages.parse({
    model: JUDGE_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: betaZodOutputFormat(Verdict) },
    system: 'You grade replies from a relationship-intelligence assistant against explicit criteria. Judge only what is on the page. A criterion passes only if the reply clearly meets it. "no_invention" fails if any concrete detail in the reply is absent from the provided memory context and user message.',
    messages: [{ role: 'user', content: `<memory_context>\n${contextText}\n</memory_context>\n<user_message>${c.message}</user_message>\n<reply>\n${out.reply}\n</reply>\n<memory_proposals>${JSON.stringify(out.proposals.map((p) => ({ kind: p.kind, summary: p.summary, data: p.data })))}</memory_proposals>\n\nCriteria (grade each, using these ids):\n${criteria.map(([id, t]) => `- ${id}: ${t}`).join('\n')}` }],
  });
  return res.parsed_output?.criteria || [];
}

const results = [];
let retrievalPass = 0;
for (const c of cases) {
  const store = fresh();
  const r = retrieve(store, { text: c.message });
  const got = new Set(r.trace.map((t) => t.id));
  const missing = c.mustRetrieve.filter((id) => !got.has(id));
  if (!missing.length) retrievalPass++;
  const row = { id: c.id, capability: c.capability, retrieval: { pass: !missing.length, missing, items: r.trace.length, chars: r.context.length } };
  console.log(`${missing.length ? '✗' : '✓'} retrieval  ${c.id.padEnd(24)} ${missing.length ? `missing ${missing.join(', ')}` : `${r.trace.length} items`}`);

  if (live) {
    const client = createClient({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (!client) { console.error('--live needs ANTHROPIC_API_KEY'); process.exit(1); }
    const conv = store.createConversation();
    try {
      const { assistant } = await runTurn(store, client, conv.id, c.message, { today: TODAY, model: MODEL });
      const verdicts = await judge(client, c, r.context, assistant);
      const passed = verdicts.filter((v) => v.pass).length;
      row.live = { reply: assistant.reply, proposals: assistant.proposals, verdicts, score: `${passed}/${verdicts.length}`, usage: assistant.usage };
      console.log(`  judge    ${c.id.padEnd(24)} ${passed}/${verdicts.length}${verdicts.filter((v) => !v.pass).map((v) => `\n    ✗ ${v.id}: ${v.reason}`).join('')}`);
    } catch (e) {
      row.live = { error: e.message };
      console.log(`  error    ${c.id}: ${e.message}`);
    }
  }
  results.push(row);
}

console.log(`\nRetrieval: ${retrievalPass}/${cases.length} cases surfaced every required item.`);
if (live) {
  const all = results.flatMap((r) => r.live?.verdicts || []);
  console.log(`Judge: ${all.filter((v) => v.pass).length}/${all.length} criteria passed (model ${MODEL}, judge ${JUDGE_MODEL}).`);
  const dir = path.join(here, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `yosef-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(`Saved ${file}`);
}
if (retrievalPass < cases.length) process.exitCode = 1;
