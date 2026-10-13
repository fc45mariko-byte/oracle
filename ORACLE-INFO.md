# Oracle: how to access and use it

## Link

**https://claude.ai/artifact/8DryjJPkevMpeka7pd5yKs**

Open it on your phone or computer while signed in to claude.ai. On a phone, you can add it to your home screen from the browser's share menu.

## Who can see it

- The page is private: only you can open it.
- To share it, use the **Share** menu on the page.
- Anyone you share it with gets their own separate, empty record and cannot see yours.
- The Yosef case study file is published with the page, so people you share it with could load it too.

## How it works

- **No API key and no hosting needed.** Oracle answers with Claude through your own claude.ai account and uses your Claude usage. The first time you send a message, claude.ai asks you to allow the page to use Claude.
- **Your record** is saved in your private area of the page on claude.ai. It follows your account across devices. If the page is ever deleted, the record is deleted with it.
- **Nothing is saved without you.** When Oracle suggests a change to memory (a new event, a pattern update, a question), it appears as a card. It is saved only when you tap **Accept**.
- **The original record is never overwritten.** Corrections and later interpretations are added beside the original. Edits keep the previous version in a history.

## First steps

1. Open the link.
2. Go to **Memory & privacy** (the menu button at the top right) and tap **Load the Yosef case study**.
3. Go to **Talk** and start a conversation, or use **Add a moment** to record a new event.

## Backups

**Memory & privacy → Export JSON** downloads everything as one file. Do this now and then. **Import → Merge** loads a file back in.

## Model settings

**Memory & privacy → AI** lets you choose the model:

- **Most capable** (the default)
- **Balanced, faster**
- **Quickest**

The **Thinking** setting there controls how much Claude thinks before answering.

## What has and hasn't been tested

- **Tested:** all features, in a browser that simulates claude.ai's storage and Claude access.
- **Not yet tested:** saving to claude.ai's real storage, and getting a real Claude answer. Your first visit is the first real check. If something doesn't work, tell me what you see.

## Code

The code is in the GitHub repository `fc45mariko-byte/oracle`, on the `oracle-mvp` branch (pull request #1). The design is described in `docs/ARCHITECTURE.md`.
