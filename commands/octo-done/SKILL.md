---
name: octo-done
description: "Command /octo-done: closes the current work: verification, Definition of Done document, AI docs, commit on the feature branch, push/PR per policy, session close. Only when the user invokes it."
argument-hint: ""
disable-model-invocation: true
---

# /octo-done

Follow `octo-autonomous-finish` in order:
1. `verification-before-completion`: fresh test/lint/build evidence.
2. `octo-definition-of-done`: build the DoD (scenarios from the plan, or from the session for bounded work), then
   check it: `node .claude/skills/octo-definition-of-done/scripts/check-dod.mjs <DoD.md> --plan <session plan>`
   (omit `--plan` when there's no plan). Stop if it fails.
3. `octo-ai-context` (record mode).
4. Hygiene, stage explicit paths, `node .claude/skills/octo-autonomous-finish/scripts/pre-commit-check.mjs`,
   then the commit.
5. Push / pull request per the policy (`open-pr.mjs`), or superpowers' finishing options; close the session.
6. Summary to the user with the DoD link, the commit hash and the PR link if any.
