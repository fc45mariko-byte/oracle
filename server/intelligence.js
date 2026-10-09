// The intelligence layer: retrieval → prompt → Claude → validated proposals → stored turn.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { retrieve } from './retrieval.js';
import { validateProposal, PROPOSAL_KINDS } from './proposals.js';
import { REQUEST_TYPES, LABELS } from './model.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, 'prompts', f), 'utf8');

export const DEFAULT_MODEL = process.env.ORACLE_MODEL || 'claude-opus-5-5';
export const DEFAULT_EFFORT = process.env.ORACLE_EFFORT || 'high';
const HISTORY_TURNS = 16;

// Stable across requests so that it can be cached.
export const SYSTEM_PROMPT = `${read('protocol.md')}\n\n${read('oracle.md')}`;

export const OracleTurn = z.object({
  request_type: z.enum(REQUEST_TYPES),
  reply: z.string().describe('What Oracle says to the user. Markdown allowed.'),
  cited_ids: z.array(z.string()).describe('Ids of memory items the reply relies on.'),
  comparison_with_previous: z.enum(['supports', 'contradicts', 'refines', 'new_possibility', 'no_material_change', 'not_applicable'])
    .describe('How this turn relates to existing hypotheses and interpretations (protocol step 5).'),
  gaps: z.array(z.string()).describe('Information that is missing or unknown and matters for this turn.'),
  memory_proposals: z.array(z.object({
    kind: z.enum(PROPOSAL_KINDS),
    target_id: z.string().nullable(),
    summary: z.string().describe('One line the user reads to decide whether to accept.'),
    rationale: z.string(),
    label: z.enum(LABELS),
    data_json: z.string().describe('JSON object with the fields for this kind, as described in the instructions.'),
  })),
  interpretations_offered: z.array(z.object({
    text: z.string(),
    evidence_ids: z.array(z.string()),
    label: z.enum(LABELS),
  })),
});

export function aiStatus() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return {
    configured,
    provider: 'Anthropic Claude API',
    model: DEFAULT_MODEL,
    effort: DEFAULT_EFFORT,
    transmits: 'For each message, the retrieved memory context, recent conversation turns and your message are sent to the Anthropic API. Nothing is sent when you browse or edit the record.',
  };
}

export function createClient() {
  if (!aiStatus().configured) return null;
  return new Anthropic();
}

export class AIUnavailable extends Error {}

function historyMessages(conversation) {
  const msgs = conversation.messages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-HISTORY_TURNS);
  // The API needs the first message to be from the user.
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs.map((m) => ({ role: m.role, content: m.role === 'user' ? m.text : (m.reply || m.text) }));
}

export function buildRequest(store, conversation, text, { today = new Date().toISOString().slice(0, 10), model = DEFAULT_MODEL, effort = DEFAULT_EFFORT } = {}) {
  const recentText = conversation.messages.slice(-4).map((m) => m.text || m.reply || '').join('\n');
  const r = retrieve(store, { text, focusPersonIds: conversation.personIds || [], recentText });
  const content = `<memory_context today="${today}">\n${r.context || '(The record is empty.)'}\n</memory_context>\n\n<user_message>\n${text}\n</user_message>`;
  const params = {
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system: SYSTEM_PROMPT,
    output_config: { effort, format: betaZodOutputFormat(OracleTurn) },
    messages: [...historyMessages(conversation), { role: 'user', content }],
  };
  return { params, retrieval: r };
}

/**
 * Runs one conversational turn. Stores the user message, the assistant turn, the proposals
 * (pending) and Oracle's offered interpretations (logged as "proposed").
 */
export async function runTurn(store, client, conversationId, text, opts = {}) {
  if (!client) throw new AIUnavailable('No AI model is configured. Set ANTHROPIC_API_KEY and restart the server.');
  const conversation = store.getConversation(conversationId);
  const { params, retrieval } = buildRequest(store, conversation, text, opts);

  const response = await client.beta.messages.parse(params);

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to answer this message. Nothing was stored.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The response was cut off (max_tokens). Nothing was stored; try a narrower question.');
  }
  const out = response.parsed_output;
  if (!out) throw new Error('The model returned output that did not match the expected format. Nothing was stored.');

  // Only now, with a valid response, store the user message.
  const userMsg = store.appendMessage(conversationId, { role: 'user', text, mode: opts.mode || 'chat', trace: retrieval.trace });
  if (retrieval.focusPersonIds.length) {
    const c = store.getConversation(conversationId);
    c.personIds = [...new Set([...(c.personIds || []), ...retrieval.focusPersonIds])];
  }

  const known = (id) => Boolean(store.find(id));
  const proposals = out.memory_proposals.map((p) => validateProposal(store, p));
  const interpretationIds = [];
  for (const i of out.interpretations_offered) {
    const created = store.create('interpretations', {
      text: i.text, evidenceIds: i.evidence_ids.filter(known), label: i.label,
      personIds: retrieval.focusPersonIds, source: 'oracle', conversationId, status: 'proposed',
    }, { by: 'oracle' });
    interpretationIds.push(created.id);
  }

  const assistant = store.appendMessage(conversationId, {
    role: 'assistant',
    reply: out.reply,
    requestType: out.request_type,
    comparison: out.comparison_with_previous,
    gaps: out.gaps,
    citedIds: out.cited_ids.filter(known),
    uncitableIds: out.cited_ids.filter((id) => !known(id)), // shown to the user: the model cited something that does not exist
    proposals,
    interpretationIds,
    model: response.model,
    usage: response.usage ? { input: response.usage.input_tokens, output: response.usage.output_tokens, cacheRead: response.usage.cache_read_input_tokens } : null,
    inReplyTo: userMsg.id,
  });
  return { user: userMsg, assistant };
}

// A user-triggered review of a relationship (spec §9). It is an ordinary turn with a fixed request,
// so the review and its proposals sit in the conversation record like everything else.
export function reviewPrompt(store, personId) {
  const p = store.get('people', personId);
  return `Review the record for ${p.name}. Bring to my attention only what is genuinely useful: new events that strengthen or weaken an existing pattern; a hypothesis whose evidence has changed; an open question that now has new evidence; places where my interpretation has changed over time; recent changes in the dynamic (not just repetition); and anything in the record that looks wrong, ambiguous or missing. If there is nothing significant, say so. Propose pattern or question updates where warranted.`;
}
