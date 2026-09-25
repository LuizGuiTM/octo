---
name: octo-ai-context
description: "Use before other work when AGENTS.md is missing, contains octo:needs-context, or contradicts the code, and at the end of every task to record what was learned. Builds and maintains AI-facing docs (AGENTS.md, docs/ai/) with parallel subagents."
metadata:
  complements: [brainstorming, systematic-debugging, finishing-a-development-branch]
---

# AI context first

AI docs are the project's long-term memory. A future agent with a fresh context should be productive
after reading `AGENTS.md` plus one linked doc. Treat them as production code: accurate, reviewed, current.

## Modes
- **Bootstrap**: `AGENTS.md` is missing or has the `octo:needs-context` marker.
- **Refresh**: docs exist but a task revealed they are wrong or incomplete.
- **Record**: end of a task; add what the next agent needs (called from `octo-autonomous-finish`).

## Bootstrap (parallel)
1. Survey the repo yourself for two minutes: root files, package manifests, CI config, top-level dirs.
2. Dispatch in **one turn**, one `octo-explorer` per area:
   - Commands: install, dev, test (all and single), lint, build. Source: scripts, Makefile, CI.
   - Architecture: entry points, top-level modules, data flow, external services.
   - Conventions: naming, error handling, logging, state management, folder patterns.
   - Testing: frameworks, layout, fixtures, how integration tests reach dependencies.
   - Domain: key entities and terms (becomes the glossary).
   - Stack specifics: one explorer per detected stack (web, salesforce, python).
3. Verify the commands: run install/test/lint when it is safe and fast. Mark unverified ones `(unverified)`.
4. Dispatch `octo-doc-writer` agents in parallel, one per file:
   - `AGENTS.md` (fill every section of the scaffold; remove the `octo:needs-context` line)
   - `docs/ai/architecture.md`
   - `docs/ai/glossary.md`
   - `docs/ai/decisions/0001-record-architecture-decisions.md` (the ADR habit itself)
5. Read the results together and fix contradictions between files.
6. Ask the user only about facts the code cannot tell you (business rules, owners, environments).

## Refresh / Record
- Fix the wrong statement where it lives, with evidence. Don't append contradictions.
- Add a **Gotcha** when something cost you more than ~15 minutes.
- Add an ADR when you chose between viable designs.
- Update the commands table when you discover or change a command.
- Link specs and plans (`docs/superpowers/specs|plans/`) from the relevant `docs/ai/` page if they describe lasting behavior.

## Quality bar
- `AGENTS.md` ≤ ~150 lines, and every command is copy-pasteable.
- Every architectural claim has a `path` reference.
- No duplicated facts across files; link instead.
- Written in the configured artifact language.
- Host files (`CLAUDE.md`, `.github/copilot-instructions.md`) only point to `AGENTS.md`; never put project
  facts inside the `octo:begin/end` block. It is regenerated.
