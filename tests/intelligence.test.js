import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore, fakeClient, turn } from './helpers.js';
import { runTurn, buildRequest, SYSTEM_PROMPT } from '../server/intelligence.js';
import { applyProposal } from '../server/proposals.js';

test('the system prompt contains the full reasoning protocol and is stable across requests', () => {
  assert.match(SYSTEM_PROMPT, /Step 8 — Preserve uncertainty/);
  const s = freshStore();
  const c = s.createConversation();
  const a = buildRequest(s, c, 'hello', { today: '2026-10-09' }).params;
  const b = buildRequest(s, c, 'something else entirely', { today: '2026-10-09' }).params;
  assert.equal(a.system, b.system);
  assert.equal(a.model, 'claude-opus-5-5');
  assert.equal(a.output_config.effort, 'high');
});

test('memory context goes in the user message, with today’s date', () => {
  const s = freshStore();
  const c = s.createConversation();
  const { params } = buildRequest(s, c, 'What happened on june 18 with Yosef?', { today: '2026-10-09' });
  const last = params.messages.at(-1);
  assert.equal(last.role, 'user');
  assert.match(last.content, /<memory_context today="2026-10-09">/);
  assert.match(last.content, /e_2026_06_18_witch/);
});

test('a turn stores messages, logs interpretations, and leaves proposals pending', async () => {
  const s = freshStore();
  const c = s.createConversation();
  const client = fakeClient(() => turn({
    reply: 'Something.',
    cited_ids: ['e_2026_10_08_bac', 'e_made_up'],
    memory_proposals: [
      { kind: 'add_event', target_id: null, summary: 'Add the call', rationale: 'new event', label: 'recorded',
        data_json: JSON.stringify({ date: '2026-10-09', title: 'He called back', original: 'he called back today', personIds: ['p_self', 'p_yosef'], category: 'contact', contactEffect: 'reopen', contactActorId: 'p_yosef' }) },
      { kind: 'add_event', target_id: null, summary: 'Bad ref', rationale: '', label: 'recorded',
        data_json: JSON.stringify({ title: 'x', original: 'x', personIds: ['p_nobody'] }) },
      { kind: 'update_pattern', target_id: 'pat_three_weeks', summary: 'Weaken', rationale: '', label: 'contested', data_json: JSON.stringify({ confidence: 'low' }) },
    ],
    interpretations_offered: [{ text: 'A new reading', evidence_ids: ['e_2026_10_08_bac'], label: 'inferred' }],
  }));
  const before = s.data.events.length;
  const { assistant } = await runTurn(s, client, c.id, 'He called me back today, Yosef I mean.');
  assert.equal(s.data.events.length, before, 'nothing added to the record without acceptance');
  assert.deepEqual(assistant.citedIds, ['e_2026_10_08_bac']);
  assert.deepEqual(assistant.uncitableIds, ['e_made_up']);
  assert.deepEqual(assistant.proposals.map((p) => p.status), ['pending', 'invalid', 'pending']);
  assert.match(assistant.proposals[1].error, /unknown reference/);
  assert.deepEqual(Object.keys(assistant.proposals[2].data), ['confidence'], 'update proposals carry only the fields sent');
  assert.equal(s.get('interpretations', assistant.interpretationIds[0]).status, 'proposed');
  assert.equal(s.getConversation(c.id).messages.length, 2);

  const res = applyProposal(s, assistant.proposals[0]);
  assert.equal(s.get('events', res.id).original, 'he called back today');
  applyProposal(s, assistant.proposals[2]);
  const pat = s.get('patterns', 'pat_three_weeks');
  assert.equal(pat.confidence, 'low');
  assert.ok(pat.supportingEventIds.length > 0, 'other fields untouched');
});

test('nothing is stored when the model refuses or the output is malformed', async () => {
  const s = freshStore();
  const c = s.createConversation();
  await assert.rejects(runTurn(s, fakeClient(() => turn(), { stop_reason: 'refusal' }), c.id, 'hi'), /declined/);
  await assert.rejects(runTurn(s, fakeClient(() => null), c.id, 'hi'), /format/);
  assert.equal(s.getConversation(c.id).messages.length, 0);
});

test('without a configured model, a turn fails clearly', async () => {
  const s = freshStore();
  const c = s.createConversation();
  await assert.rejects(runTurn(s, null, c.id, 'hi'), /No AI model is configured/);
});

test('conversation history is replayed as plain text turns', async () => {
  const s = freshStore();
  const c = s.createConversation();
  const client = fakeClient(() => turn({ reply: 'First answer.' }));
  await runTurn(s, client, c.id, 'first');
  await runTurn(s, client, c.id, 'second');
  const msgs = client.calls[1].messages;
  assert.equal(msgs.length, 3);
  assert.deepEqual(msgs[0], { role: 'user', content: 'first' });
  assert.deepEqual(msgs[1], { role: 'assistant', content: 'First answer.' });
});

test('belief proposals can supersede an earlier belief without deleting it', () => {
  const s = freshStore();
  const p = { kind: 'add_belief', status: 'pending', data: { subject: 'p_yosef', text: 'He is just a person now', asOf: '2026-10-09', supersedes: 'b_in_love', label: 'recorded', datePrecision: 'day', evidenceEventIds: [], source: 'conversation', supersededBy: null } };
  const r = applyProposal(s, p);
  assert.equal(s.get('beliefs', 'b_in_love').supersededBy, r.id);
});
