---
name: octo-parallel-waves
description: "Use together with writing-plans, subagent-driven-development, executing-plans and dispatching-parallel-agents. Adds waves of tasks with disjoint file ownership to superpowers plans so implementers run in parallel, with a model tier per task and an integration gate per wave."
metadata:
  complements: [writing-plans, subagent-driven-development, executing-plans, dispatching-parallel-agents]
---

# Parallel waves

Superpowers serializes implementation subagents to avoid conflicts. Octo keeps that guarantee but gets
it from **file ownership**: tasks that touch disjoint files run in parallel. This is a policy from the
instructions block, so it overrides "never dispatch implementers in parallel" **only for tasks the plan
puts in the same wave**. Everything else in subagent-driven-development stays exactly as written: its
implementer prompt, statuses, task briefs, reviews, fix rounds and ledger.

## With writing-plans: one extra line per task
Keep superpowers' task format and add a wave line right under each heading:
```markdown
### Task 3: Status filter API
**Wave:** 2 · **Depends on:** Task 1 · **Tier:** standard

**Files:**
- Modify: `server.mjs:14-30`
- Test: `test/server.test.mjs`
```
- `Wave`: the earliest wave after all dependencies. `Depends on`: `Task N` list or `none`.
- `Tier`: `fast | standard | deep`, chosen with superpowers' model-selection rules.
- `**Files:**` must list **every** file the task creates, modifies or tests, including shared config,
  lockfiles, barrel/index files, migrations and snapshots. Same-wave tasks must have **disjoint** files;
  if in doubt, they're not disjoint: chain them.
- Put shared foundations (types, schemas, migrations) in wave 1 so later waves fan out wide.
- Add a **Waves** summary after the plan header:
  ```markdown
  | Wave | Tasks | Parallel-safe |
  |---|---|---|
  | 1 | Task 1, Task 2 | yes: disjoint files |
  | 2 | Task 3 | – |
  ```
- Validate before handing off: `node .claude/skills/octo-parallel-waves/scripts/check-waves.mjs <plan.md>`
  (dependencies ordered, files disjoint per wave, tier set). Fix until it passes.
- Execution method: when writing-plans offers "Subagent-driven or Native", the Octo policy has already chosen
  **subagent-driven with parallel waves**; don't ask.

## With subagent-driven-development
Per wave, instead of one task at a time:
1. Prepare each task's brief with SDD's own `scripts/task-brief` and its implementer prompt
   (`implementer-prompt.md`), then **append** the addendum in `templates/implementer-brief.md` (owned files,
   one commit per task, focused tests, catalog paths).
2. Dispatch all of the wave's implementers **in the same turn** on their tier's agent, up to the configured
   maximum (split wider waves into batches).
3. Each implementer ends with **exactly one commit** containing only its owned files and reports its SHA with
   superpowers' statuses (DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT).
4. Review each task on its own commit: `review-package <plan> <sha>^ <sha>`. Reviews of the same wave can run
   in parallel. Fix rounds follow SDD (a fix is a new commit touching the same owned files).
5. **Integration gate** after the wave: full test suite and lint. Parallel tasks can conflict in ways no single
   review sees; a red gate goes to systematic-debugging before the next wave.
6. A BLOCKED report that needs another task's file: move that work to the next wave.

## Other parallel moments
- Exploration before brainstorming/planning: 2-5 `octo-explorer` dispatches in one turn.
- Independent failures: dispatching-parallel-agents, one worker per failure domain.
- Final review of a large diff: split by area (backend/frontend/metadata), one reviewer each.

## Model tiers
Dispatch through `octo-worker-fast` / `octo-worker-standard` / `octo-worker-deep` (models pinned to the
allowed list), matching the task's `Tier`. Fix-round escalations go one tier up, as superpowers says.

## Files in this skill
| File | Use |
|---|---|
| `scripts/check-waves.mjs` | Validates waves, dependencies, tiers and same-wave file ownership. Accepts superpowers' `### Task N` format (and the compact `### T1` form) |
| `templates/implementer-brief.md` | Addendum appended to superpowers' implementer prompt for parallel waves |
