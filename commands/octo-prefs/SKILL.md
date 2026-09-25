---
name: octo-prefs
description: "Command /octo-prefs: reviews and adjusts the user's personal preferences (models per tier, communication, autonomy) through three quick questions. Only when the user invokes it."
argument-hint: "[--local to edit only this repo's preferences]"
disable-model-invocation: true
---

# /octo-prefs

Personal preferences live in `~/.octo/preferences.md` (all repos; Windows: `%USERPROFILE%\.octo\preferences.md`)
and optionally `.octo/preferences.local.md` (this repo only, git-ignored; `--local`). They come pre-filled with
the team defaults, so this is a review, not a form.

1. If the file doesn't exist: `npx @luizguitm/octo prefs init` (add `--local` for the repo file).
2. Show the three sections as they are now, then ask **one question per section**, each with 2-4 options and
   "keep as is" first:
   - **Models**: which allowed model per tier on this host, and when to use `deep`. Offer only models in the
     team's allowed list (instructions block).
   - **Communication**: response length and how often to post updates during long tasks.
   - **Autonomy**: `supervised`, `balanced` or `full`, capped by the team policy, plus anything to always ask first.
3. Write only what changed, in the user's words, short.
4. Remind the user: team policies in `octo.config.json` and guardrails always win over personal preferences.
