---
name: octo-parallel-waves
description: "Use together with writing-plans, subagent-driven-development, executing-plans and dispatching-parallel-agents. Structures plans into waves of tasks with disjoint file ownership so implementers run in parallel, and sets the maximum parallelism and model tier per task."
metadata:
  complements: [writing-plans, subagent-driven-development, executing-plans, dispatching-parallel-agents]
---

# Parallel waves

Superpowers serializes implementation subagents to avoid conflicts. Octo keeps that guarantee but
gets it from **file ownership** instead of serialization: tasks that touch disjoint files run in
parallel. This is a company policy set in the instructions block, so it takes precedence over the
"never dispatch implementers in parallel" default **only for tasks the plan marks as parallel-safe**.
Everything else in subagent-driven-development (briefs, reviews, fix rounds, ledger) stays as written.

## With writing-plans
Add to the plan (keep superpowers' task format and add these fields):
1. Per task: `Files:` (every file created or modified, tests included), `Depends on:`, and
   `Tier: fast | standard | deep` (superpowers' model-selection rules decide which).
2. A **Waves** table after the header:
   ```markdown
   | Wave | Tasks | Parallel-safe |
   |---|---|---|
   | 1 | T1, T2 | yes: disjoint files |
   | 2 | T3, T4, T5 | yes: disjoint files |
   | 3 | T6 | – |
   ```
3. Wave rules:
   - A task goes into the earliest wave after all its dependencies.
   - Tasks in one wave must have **disjoint `Files:`**, including shared config, lockfiles, barrel/index
     files, migrations, snapshots. If in doubt, it's not disjoint: chain the tasks.
   - Put shared foundations (types, schemas, migrations) in wave 1 so later waves fan out wide.
4. Plan reviewer check: "Are waves as wide as possible, and are same-wave file sets disjoint?"

## With subagent-driven-development / executing-plans
- Run the wave's tasks concurrently: dispatch all of the wave's implementers **in the same turn**, up to
  the configured maximum (split wider waves into batches).
- Each implementer's brief adds: "You own only these files: … Do not touch others; report
  BLOCKED if you must."
- Reviews for a wave's tasks can also run in parallel.
- **Integration gate after each wave**: run the full test suite and lint before starting the next wave.
  Parallel tasks can conflict in ways no single review sees; a red gate is debugged with
  systematic-debugging before continuing.
- Resolve BLOCKED reports that need another task's file by moving the work to the next wave.

## Other parallel moments
- Exploration before brainstorming/planning: 2-5 `octo-explorer` dispatches in one turn.
- Independent failures: dispatching-parallel-agents, one worker per failure domain.
- Final review of a large diff: split by area (backend/frontend/metadata), one reviewer each.

## Model tiers
Dispatch through `octo-worker-fast` / `octo-worker-standard` / `octo-worker-deep` (models pinned to the
allowed list), matching the task's `Tier:`. Fix-round escalations go one tier up, as superpowers says.
