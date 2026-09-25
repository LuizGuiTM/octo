---
name: octo-run
description: "Command /octo-run: executes the current plan wave by wave with parallel subagents, reviews and an integration gate per wave. Only when the user invokes it."
argument-hint: "[plan path, default: the session's plan] [--wave N]"
disable-model-invocation: true
---

# /octo-run

1. Load the plan (argument or the session's `plan:`) and the session's current state; continue from the
   first wave that isn't done. `--wave N` starts at wave N.
2. Follow superpowers `subagent-driven-development` with `octo-parallel-waves`: all tasks of a wave in the
   same turn, dispatched by tier (`octo-worker-fast|standard|deep`), each owning only its files.
3. After each wave: reviews, the integration gate (full test suite), a checkpoint commit (per the autonomy
   policy), and a session update.
4. After the last wave, tell the user the next command: `/octo-test-web` for UI changes, otherwise `/octo-done`.
