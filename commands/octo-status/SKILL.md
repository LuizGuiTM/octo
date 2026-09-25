---
name: octo-status
description: "Command /octo-status: shows where the work stands (session, phase, plan waves, next step) and, when something looks off, the Octo installation health. Only when the user invokes it."
argument-hint: ""
disable-model-invocation: true
---

# /octo-status

1. Run `node .octo/bin/octo-session.mjs status` and read the active session for this branch.
2. If there's a plan, show its waves and which are done (session "Current state" and `git log`).
3. Show `git status --short` in one line (clean / N changed files).
4. Answer in ≤ 8 lines: phase, what's done, the next step, and the next command to run
   (`/octo-plan`, `/octo-run`, `/octo-test-web`, `/octo-done`).
5. Health: if `AGENTS.md` still has `octo:needs-context`, recommend `/octo-context`. If files the instructions
   block mentions are missing, or the user asks, run `npx @luizguitm/octo doctor` and report its ✗ lines.
