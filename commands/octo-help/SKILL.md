---
name: octo-help
description: "Command /octo-help: explains the Octo workflow and lists the available /octo-* commands. Only when the user invokes it."
argument-hint: "[command or topic]"
disable-model-invocation: true
---

# /octo-help

Answer in the user's language, briefly. For a specific command or topic, explain only that.

| Command | When |
|---|---|
| `/octo-start <request>` | Start new work: branch, session, context, brainstorm → approved spec |
| `/octo-plan` | Spec → plan with parallel waves and acceptance scenarios |
| `/octo-run` | Execute the plan wave by wave with subagents |
| `/octo-test-web` | Browser scenarios with one screenshot each |
| `/octo-done` | Verification, Definition of Done, AI docs, commit |
| `/octo-fix <problem>` | Debug and fix a bug with a regression test |
| `/octo-review [base]` | Review the branch's diff |
| `/octo-status` | Where things stand and the next step |
| `/octo-context` | Create/refresh AGENTS.md and docs/ai |
| `/octo-prefs` | Personal preferences interview |

Typical flow: `/octo-start` → `/octo-plan` → `/octo-run` → `/octo-test-web` → `/octo-done`.
The full manual (in Portuguese) is `.octo/MANUAL.md`; CLI commands (`npx @luizguitm/octo …`) are listed there.
