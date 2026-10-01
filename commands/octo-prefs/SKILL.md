---
name: octo-prefs
description: "Command /octo-prefs: reviews the user's personal preferences (models per tier, communication, autonomy) in up to three quick questions, and confirms which models exist on this host. Also run on the first message of a session while preferences haven't been reviewed."
argument-hint: "[--local to edit only this repo's preferences]"
disable-model-invocation: true
---

# /octo-prefs

Personal preferences live in `~/.octo/preferences.md` (all repos; Windows: `%USERPROFILE%\.octo\preferences.md`)
and optionally `.octo/preferences.local.md` (this repo only, git-ignored; `--local`). They come pre-filled with
the team defaults, so this is a quick review, not a form. The instructions block sends you here (by reading this
file) on the first message of a session while the preferences still contain `octo:unreviewed`.

1. If the file doesn't exist: `npx -y @luizguitm/octo@latest prefs init` (add `--local` for the repo file).
2. Show the three sections as they are now (compact, ≤ 12 lines, in the user's language), then ask **one
   question per section**, each with 2-4 options and "keep as is" first. If your host lets you ask several
   questions at once, do so in one turn. "Manter tudo" is a complete review.
   - **Models** (Copilot only; on Claude Code `opus`, `sonnet`, `haiku` always resolve, so skip it): ask the user
     to confirm the names in the Copilot model picker. If a model in the team's tiers doesn't exist there,
     that's why agents fell back to unknown models: propose the corrected names for `models.copilot.allowed`
     and `tiers` in `octo.config.json`. Once the names are confirmed, also set `models.copilot.pin: true` (until
     then agents simply use the model picked in the chat). After the user agrees, edit it and run
     `npx -y @luizguitm/octo@latest sync`; commit it (`chore: fix Octo model names`) on the work branch with the
     task's first commit, never on a protected branch.
   - **Communication**: response length, how often to post updates during long tasks, and the **language
     level**: technical, or simple (no jargon, explain in business terms) for people who aren't developers.
   - **Autonomy**: `supervised`, `balanced` or `full`, capped by the team policy, plus anything to always ask first.
3. Write only what changed, in the user's words, short, and remove the `octo:unreviewed` line from every
   preferences file that has it, also when nothing changed: that marks them reviewed, so nobody asks again.
4. Remind the user (one line): team policies in `octo.config.json` and guardrails always win over personal preferences.
5. If this review interrupted a request, go back to it now.
