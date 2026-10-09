# Oracle

A persistent relationship-intelligence system, built as a web app. Oracle keeps a structured record of the people in your life, what happened between you, the patterns you suspect, the questions you haven't settled, and how your understanding has changed. When you talk to it, it recovers the relevant history before it answers.

The design and the reasoning behind it are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How it works

Oracle is a static web app. Once loaded, everything runs in your browser.

- **Your record** lives in that browser's storage (IndexedDB) on that device. There is no Oracle server or account. Another phone or browser starts empty; use Export and Import to move the record.
- **Conversation** uses your own Anthropic API key, which you enter under Memory & privacy. The browser sends each message, with the memory context retrieved for it, directly to `api.anthropic.com`. The key stays in that browser's local storage and is never included in exports.
- **Offline:** after the first visit, the app opens without a connection. Conversation needs the network.
- **Install:** on a phone, use "Add to Home Screen" to install it like an app.

## On claude.ai

`npm run build:claude` builds a version for publishing as a private claude.ai page. There, Oracle needs no API key or hosting: it answers with Claude through your claude.ai account, and keeps your record in your private area of the page's database, so it follows your account across devices. The Yosef case study loads from a button under Memory & privacy.

## Host it elsewhere

The site is just files in `dist/`. Pick one:

- **Netlify** (works with a private repository on the free plan): create a new site from this repository. `netlify.toml` tells it how to build.
- **GitHub Pages:** in the repository, go to Settings → Pages and set the source to GitHub Actions. `.github/workflows/pages.yml` then deploys on every push to `main`. Pages on a private repository needs a paid GitHub plan, and the published site is public.

In both cases only the app's code is published. The Yosef case study is never included: the build fails if case-study text ends up in the bundle.

## Load the Yosef case study

Download `case-study/yosef.oracle.json` from this repository to your phone. Then in Oracle go to Memory & privacy → Import, choose the file, and tap **Merge**. After you edit `seed/`, regenerate the file with `npm run case-study`.

## Develop

Requires Node 22.9 or later.

```bash
npm install
npm start                   # builds and serves at http://127.0.0.1:4321
npm test                    # 53 tests
npm run eval                # offline: does retrieval surface what each Yosef case needs?
npm run eval -- --live      # also runs each case through Claude and an LLM judge (needs ANTHROPIC_API_KEY in .env; uses credits)
```

## Layout

```
core/              runs in the browser, tested in Node
  model.js         entities, schemas, epistemic labels
  store.js         the record: history, corrections, audit log; pluggable storage backend
  retrieval.js     selective, traceable memory retrieval
  analysis.js      computed facts (contact intervals, who cut contact)
  intelligence.js  prompt assembly, Claude call, structured output
  proposals.js     memory changes the model proposes and you accept
  prompts.js       the reasoning protocol (verbatim) and app-specific instructions
  api.js           in-page request handler used by the UI
public/            the app: HTML, CSS, views, IndexedDB backend
scripts/           build, local server, case-study export
seed/              the Yosef case study (source)
case-study/        the case study as an importable file
evals/  tests/
```
