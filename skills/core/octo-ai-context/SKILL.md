---
name: octo-ai-context
description: "Use before other work when AGENTS.md is missing, contains octo:needs-context, or contradicts the code, and at the end of every task to record what was learned. Builds AI-facing docs (AGENTS.md, docs/ai/) quickly and incrementally: a minimal map first, then each area only when a task touches it."
metadata:
  complements: [brainstorming, systematic-debugging, finishing-a-development-branch]
---

# AI context first, but fast

AI docs are the project's long-term memory. They are built **incrementally**: a short map of the whole repo
first, then depth only for the areas real tasks touch. Never try to document a large repository in one go:
on a 10-year monorepo that takes hours and most of it is never read.

## Modes
- **Quick bootstrap**: `AGENTS.md` is missing or has `octo:needs-context`. Budget: about 10 minutes.
- **Area**: a task is about to touch an area that `AGENTS.md` lists as "not yet documented".
- **Record**: end of a task; add what the next agent needs (called from `octo-autonomous-finish`).

## Quick bootstrap (≈ 10 minutes, no deep reading)
1. **If a code-graph MCP is configured** (see "Custom MCP servers" in the instructions block, e.g. graphify),
   ask it for the module/community map and the entry points first. It replaces most of the exploration.
2. Read only **root-level signals**: README, package manifests (`package.json`, `sfdx-project.json`,
   `pyproject.toml`), CI config, top-level directories, and one listing level below them. For big metadata
   trees (Salesforce `force-app/main/default/*`), **count** items per type with a file listing; don't open them.
3. At most **3** `octo-explorer` dispatches, in one turn, each with a narrow question: how to build/test/deploy,
   the top-level layout and entry points, and the conventions visible in 2-3 representative files.
4. Write `AGENTS.md` with: project in 3 lines, stack, **commands** (verified or marked `(unverified)`), a layout
   table of top-level areas, conventions seen, and a section **"Not yet documented"** listing the big areas
   (e.g. "`force-app/main/default/classes` – 1,240 Apex classes"). Remove `octo:needs-context`.
5. Stop there. Don't write `docs/ai/` pages, glossaries or ADRs in the bootstrap.

## Area mode (lazy, when a task needs it)
When a task touches an area in "Not yet documented" (e.g. the Opportunity pricing classes):
1. Explore **that area only** (1-2 `octo-explorer` dispatches, or the code graph).
2. Write `docs/ai/<area>.md` (≤ 80 lines: purpose, main classes/files with paths, data flow, traps) and link it
   from `AGENTS.md`, moving the area out of "Not yet documented".

## Record (end of a task)
- Fix any wrong statement where it lives, with evidence. Don't append contradictions.
- Add a **Gotcha** when something cost more than ~15 minutes.
- Add an ADR only when you chose between viable designs (`architecture/adr/create-architectural-decision-record`).
- Update the commands table when you discover or change a command.
- Keep it to minutes: record what this task learned, not a survey of the neighbourhood.

## Quality bar
- `AGENTS.md` ≤ ~150 lines; every command copy-pasteable; every claim about the code has a `path`.
- No duplicated facts across files; link instead. Written in the configured artifact language.
- Host files (`CLAUDE.md`, `.github/copilot-instructions.md`) only point to `AGENTS.md`; never put project
  facts inside the `octo:begin/end` block (it is regenerated).
- Catalog helpers when you need a checklist: `engineering/docs/create-agentsmd` (what a good AGENTS.md covers)
  and `engineering/docs/acquire-codebase-knowledge` (survey method). Use them for completeness, not for size.
