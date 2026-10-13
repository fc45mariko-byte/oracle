import { Store, MemoryBackend } from '../core/store.js';
import { importYosefCase } from '../seed/import.js';

export function freshStore({ seeded = true } = {}) {
  const s = new Store(new MemoryBackend());
  if (seeded) importYosefCase(s);
  return s;
}

// A stand-in for the Anthropic client: returns whatever `respond(params)` gives as parsed output.
export function fakeClient(respond, { stop_reason = 'end_turn' } = {}) {
  const calls = [];
  return {
    calls,
    beta: { messages: { parse: async (params) => { calls.push(params); return { stop_reason, model: params.model, usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: respond(params) }; } } },
  };
}

export const turn = (over = {}) => ({
  request_type: 'ask_about_person', reply: 'A reply.', cited_ids: [], comparison_with_previous: 'not_applicable',
  gaps: [], memory_proposals: [], interpretations_offered: [], ...over,
});
