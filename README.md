# Oracle

A persistent relationship-intelligence system. Oracle keeps a structured record of the people in your life, what happened between you, the patterns you suspect, the questions you haven't settled, and how your understanding has changed. When you talk to it, it recovers the relevant history before it answers.

The design and the reasoning behind it are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it

Requires Node 22.9 or later.

```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY
npm start                   # http://127.0.0.1:4321
```

Open **Memory** (top-right menu) and choose **Load the Yosef case study** to import the documented timeline.

Without an API key, everything except conversation works: the record, timeline, people, patterns, questions, corrections, export and deletion. "Preview recall" still shows exactly what Oracle would retrieve for a message.

### On your phone

Oracle listens only on this computer by default. To use it from a phone on the same Wi-Fi network, set `HOST=0.0.0.0` and an `ORACLE_PASSCODE` in `.env`. Then open `http://<computer's LAN address>:4321` and enter the passcode under Memory. The server will not start on a network address without a passcode. Traffic on your LAN is plain HTTP.

## Where your data goes

- **Stored:** one plain JSON file, `data/oracle.json` by default. It is not encrypted and is git-ignored.
- **Sent:** when you send a message, the retrieved memory context, recent turns of that conversation and your message go to the Anthropic API. Nothing is sent when you browse or edit the record.
- **Control:** every item can be opened, corrected or deleted in the app. Memory → Export downloads everything as JSON. Memory → Delete all data erases it.

## Tests and evaluation

```bash
npm test                    # 48 tests: store integrity, verbatim import, retrieval, AI turn (mock model), API
npm run eval                # offline: does retrieval surface what each Yosef case needs?
npm run eval -- --live      # also runs each case through Claude and grades it with an LLM judge (uses API credits)
```

`seed/yosef-timeline-original.txt` holds the timeline exactly as it was pasted. A test checks that every imported event's original text appears in it word for word, and that no line was dropped.

## Layout

```
server/
  model.js         entities, schemas, epistemic labels
  store.js         persistence (JSON file), history, corrections, audit log
  retrieval.js     selective, traceable memory retrieval
  analysis.js      computed facts (contact intervals, who cut contact)
  intelligence.js  prompt assembly, Claude call, structured output
  proposals.js     memory changes the model proposes and you accept
  prompts/         the reasoning protocol (verbatim) and app-specific instructions
  index.js         HTTP server and JSON API
public/            mobile-first web app (no build step)
seed/              the Yosef case study
evals/             evaluation cases and runner
tests/
```
