# Oracle architecture

This document turns the product brief into a technical design and records what is built, what is not, and why.

## 1. Layers

| Layer | Where | What it does |
|---|---|---|
| Interface | `public/` | Mobile-first web app: home tiles, conversation, people, timeline, patterns, questions, memory and privacy. Plain ES modules, no build step. |
| Data | `server/model.js`, `server/store.js` | Typed entities (zod schemas), a single JSON document on disk, written atomically. Change history and an audit log. |
| Memory retrieval | `server/retrieval.js`, `server/analysis.js` | Picks the context for each message and records why each item was picked. |
| Intelligence | `server/intelligence.js`, `server/prompts/` | Builds the request, calls Claude, validates structured output, stores the turn. |
| Memory updates | `server/proposals.js` | The model proposes changes; nothing is written until you accept. |
| Evaluation | `tests/`, `evals/` | Deterministic tests of memory integrity and retrieval; an LLM-judged evaluation set built from the Yosef case. |

## 2. Entities: the six memory layers

All entities share `id`, `createdAt`, `updatedAt`, `createdBy` and `history[]`. Each edit appends the previous values and a reason to `history`.

1. **Events: the archive** (`events`)
   - `original` is your wording as first recorded. It cannot be updated: the store and the API both refuse.
   - Facts you correct are stored as **correction annotations** (`field`, `from`, `value`, reason). The current view applies them, and the original value stays readable. A correction can be withdrawn and is never deleted.
   - Later readings are **interpretation/note annotations**, labelled and authored (you or Oracle), and can be marked superseded.
   - Other fields: partial date with precision (`day`, `month`, `approximate`, `unknown`) and a `dateNote` for inferred years; people; category; `initiatorId`; `contactEffect` (cut, reopen, reopen-then-cut) and `contactActorId`; feeling and interpretation *at the time*; quotes; themes; related events; source; label; and **ambiguities**, which are places where the record itself is unclear.
2. **Graph** (`people` plus id references everywhere). People profiles separate *explicit statements*, *observations* and *unknowns*. Events, patterns, questions, beliefs and interpretations point at people and events by id. Deleting an item removes references to it.
3. **Pattern library** (`patterns`): description, supporting events, counterexamples, evidence notes, alternative explanations, confidence, label, status (`active`, `weakened`, `split`, `obsolete`), revision conditions, origin, plus first-identified and last-reviewed dates from the timestamps.
4. **Intellectual history** (`beliefs`): dated statements of what you believed, each with a subject (a person, `self`, `relationships`, a theme). A newer belief can supersede an older one; the older one stays.
5. **Unresolved questions** (`questions`): formulation, why it matters, evidence, possible answers, what would help decide, status, and whether you still want to pursue it. Nothing closes a question automatically.
6. **Oracle's interpretive history** (`interpretations`): every significant interpretation Oracle offers is logged as `proposed`, with its evidence. You can retain, revise or reject it, with your response recorded. Earlier interpretations are retrieved for later turns so Oracle builds on them instead of rediscovering them.

Every item carries an epistemic label: `recorded`, `observed`, `inferred`, `contested`, `unknown` or `superseded`.

## 3. Retrieval

For each message, `retrieve()` assembles:

- **People in focus**: names mentioned in the message, in recent turns, or pinned to the conversation, plus your own profile.
- **A chronology index**: one line per event for the people in focus and those they share events with. It is cheap and lets the model reason about sequence without the full text of every event.
- **Computed contact intervals**: code, not the model, measures the gaps between a cut and the next reopening, from the events' tags.
- **Events in detail**, chosen by:
  - BM25 over each event's text, annotations, quotes and themes, with a small, explicit concept expansion ("feel" also matches love, declarations, asymmetry);
  - date matching ("june 18", "2025-10-05", "September 2026");
  - the events just before and after an event asked about by date;
  - every event between two named anchors for "between X and Y" questions;
  - the latest events, so "now" questions see the current state;
  - one hop of linked events.
- **Patterns, open questions, beliefs and earlier interpretations** that touch the people or events in focus, or match the message's words.

Every included item goes into a `trace` with a reason, and the conversation view shows it under "Context used". "Preview recall" shows the exact text that would be sent, without calling the model.

For the case study, a typical message retrieves 20–50 items and 15–35k characters. The whole record is never attached.

## 4. A conversational turn

1. Retrieval runs on the message (see above).
2. The request:
   - System prompt: your reasoning protocol, verbatim (`prompts/protocol.md`), followed by app-specific instructions (`prompts/oracle.md`). It is stable across requests, so it is cached.
   - Messages: up to 16 previous turns as plain text, then the new message wrapped with `<memory_context today="…">`.
   - Model `claude-opus-5-5`, adaptive thinking, effort `high`, and server-side refusal fallback.
   - Structured output (`OracleTurn` schema):
     - `request_type`, one of the protocol's eight kinds;
     - `reply`;
     - `cited_ids`;
     - `comparison_with_previous` (supports / contradicts / refines / new possibility / no material change);
     - `gaps`;
     - `memory_proposals`;
     - `interpretations_offered`.
3. Validation:
   - Proposals are checked against per-kind schemas, and every referenced id must exist. Invalid proposals are shown with the reason and cannot be accepted.
   - Cited ids that don't exist are shown to you as such.
4. Storage: the user message and its trace, the reply, and the pending proposals are stored. Offered interpretations are logged as `proposed`. On a refusal, a truncation or malformed output, **nothing is stored**.
5. You accept or reject each proposal. Only an accepted proposal writes to memory, and the UI says "Saved to memory" only after the server confirms.

**Review** is a user-triggered turn with a fixed request: review a person's record and surface only what is genuinely new (strengthened or weakened patterns, questions with new evidence, changed interpretations, errors or gaps). The home screen suggests a review when several events have accumulated since Oracle last interpreted that relationship. The suggestion is computed by code, not generated.

## 5. Status

### Implemented
- The data model for all six memory layers, with labels, history, corrections, an audit log and referential cleanup.
- Persistent storage across sessions: a local JSON file.
- Selective, traceable retrieval, plus computed interval analysis.
- Conversation with Claude, with your protocol as the system prompt and structured output.
- Memory proposals with accept/reject, and logged interpretations with retain/revise/reject.
- User-triggered relationship reviews and in-app prompts.
- Mobile-first UI:
  - home with tiles and category tabs;
  - person workspace (overview, chronology with intervals, patterns and questions, how views changed, profile editing);
  - timeline with filters;
  - event detail (original, corrections, later readings, connections);
  - patterns and questions (create, update, link evidence);
  - memory and privacy (storage location, what is transmitted, export, import, case-study import, delete all, change log).
- The Yosef case study:
  - 53 dated events, verbatim from your timeline, with inferred years flagged and 24 ambiguities noted;
  - 5 items from the narrative document, kept as separate, provenance-tagged entries;
  - 7 patterns, 9 open questions, 12 dated beliefs, and 6 earlier interpretations from the document.
- Tests (48) and the evaluation set (14 cases).

### Not verified in this build
- **The live model path has not been exercised against the real API.** The build environment had no API key. The request shape follows the current SDK documentation, and the full turn is tested with a mock client that returns the structured output. Run `npm run eval -- --live` once with a key to confirm and to get a baseline score.

### Not implemented (planned)
- **Background monitoring, scheduled reviews and notifications.** Oracle only acts when you open it. The review function is already a single entry point (`reviewPrompt` + `runTurn`), so a scheduler can call it later. A server-side job would need the server running continuously, plus a push channel.
- **Encryption at rest.** The JSON file is plain text. Options: an encrypted SQLite file, or OS-level disk encryption, which is likely already on if your laptop uses FileVault or BitLocker.
- **Semantic (embedding) retrieval.** Retrieval is lexical with explicit concept expansion and graph and time structure. At the current scale (dozens of events) this works and is easy to inspect. Embeddings become worthwhile once the record has hundreds of events across many people.
- **Multi-device sync and hosted deployment.**
- **Custom 3D illustrations.** The tile art is SVG, drawn to suggest translucent sculptural forms.

## 6. Decisions worth knowing

- **Local-first server instead of a browser-only app.** It keeps the API key out of the browser, keeps data in a file you can see, and leaves room for scheduled reviews later.
- **The model never writes memory directly.** Your protocol says "Do not claim to have saved information unless the memory system confirms that it has been saved." Proposals plus explicit acceptance make that true by construction.
- **Neutral summaries are marked as not your words.** Imported events carry a short summary to make the timeline readable. The original always wins when they differ, and the prompt tells the model so.
- **Ambiguities are recorded rather than resolved.** Examples:
  - who blocked whom on 10 July 2025;
  - whose "deletion" on 19 September 2025;
  - "so many" probably meaning "so mean" on 18 June 2026;
  - the bank-app note's wording, which differs between the timeline and the narrative document.

  Correct them on the event page, and the correction is kept beside the original.
- **The case study is in the repository.** The repository is private. If it is ever made public, or deployed somewhere public such as GitHub Pages, `seed/` would be exposed. Move it out first.
