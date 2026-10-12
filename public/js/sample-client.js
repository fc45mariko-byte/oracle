// Lets the intelligence layer call Claude through claude.ai's `sample` capability (the viewer's own
// Claude account, no API key) with the same interface it uses for the Anthropic SDK:
// `beta.messages.parse(params)`. The system prompt becomes a leading instruction turn, the output
// schema is described in that turn, and the reply is parsed and validated against the same schema.

import { z } from 'zod';
import { OracleTurn } from '../../core/intelligence.js';

const SCHEMA = JSON.stringify(z.toJSONSchema(OracleTurn), null, 1);

export class SampleUnavailable extends Error {}

const MESSAGES = {
  not_granted: 'Oracle isn’t allowed to use Claude on this page. Allow it when asked, or reload and try again.',
  sampling_disabled: 'Claude isn’t available for this account.',
  rate_limited: 'Too many requests, or your Claude usage limit was reached. Try again later.',
  session_expired: 'Your claude.ai session expired. Sign in again.',
  prompt_too_large: 'This conversation has grown too large to send. Start a new conversation.',
  refused: 'Claude declined to answer this message.',
};

export function createSampleClient(sample, getSettings) {
  return {
    // Plain-text completion (used by the chat simulation). Quicker tier unless the user chose one.
    async completeText({ system, messages, tier }) {
      const s = getSettings();
      try {
        const { text } = await sample([{ role: 'user', content: system }, ...messages], { modelTier: tier || s.tier || 'default', cache: false });
        return text;
      } catch (e) {
        throw new Error(MESSAGES[e?.code] || `Claude could not answer (${e?.code || 'error'}). Try again.`);
      }
    },
    beta: {
      messages: {
        async parse(params) {
          const s = getSettings();
          const instructions = `${params.system}\n\n# Output format\n\nReply with ONLY one JSON object, no other text, that conforms to this JSON Schema. \`reply\` holds what you say to the user (Markdown allowed). \`data_json\` in each memory proposal is a JSON object encoded as a string.\n\n${SCHEMA}`;
          const turns = [{ role: 'user', content: instructions }, ...params.messages];
          let raw;
          try {
            raw = await sample.json(turns, { modelTier: s.tier || 'complex', ...(s.effort ? { effort: s.effort } : {}), cache: false });
          } catch (e) {
            if (e?.code === 'refused') return { stop_reason: 'refusal', parsed_output: null, model: 'claude.ai' };
            if (e?.code === 'invalid_json') return { stop_reason: 'end_turn', parsed_output: null, model: 'claude.ai' };
            throw new Error(MESSAGES[e?.code] || `Claude could not answer (${e?.code || 'error'}). Try again.`);
          }
          // Be lenient about one common slip: data_json given as an object instead of a string.
          for (const p of raw?.memory_proposals || []) {
            if (p && typeof p.data_json === 'object' && p.data_json !== null) p.data_json = JSON.stringify(p.data_json);
          }
          const parsed = OracleTurn.safeParse(raw);
          return { stop_reason: 'end_turn', parsed_output: parsed.success ? parsed.data : null, model: `claude.ai (${s.tier || 'complex'})`, usage: null };
        },
      },
    },
  };
}
