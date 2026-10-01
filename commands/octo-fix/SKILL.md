---
name: octo-fix
description: "Command /octo-fix <bug, error or failing test>: investigates and fixes a problem with systematic debugging, a regression test first, and a commit. Only when the user invokes it."
argument-hint: "<what is broken: error message, failing test, steps>"
disable-model-invocation: true
---

# /octo-fix

0. **Startup checks** (instructions block, "Before any implementation"), unless the session already records them.
1. Read `AGENTS.md` (quick bootstrap with `octo-ai-context` if it has `octo:needs-context`; area mode only for the
   area of the bug); resume the branch's session if there is one, otherwise create a work branch with the
   pattern from the instructions block's Git section and `{type}` = `fix` (e.g. `fix/<topic>-octo`), with its own session.
2. Run `octo-discovering-skills` for `systematic-debugging` (stack skills list known traps).
3. Follow superpowers `systematic-debugging` exactly: reproduce, find the root cause, test **one hypothesis
   at a time** with the smallest change. Octo addition: independent evidence gathering (logs, call sites,
   recent commits in different areas) may run as parallel `octo-explorer` dispatches.
4. Fix with `test-driven-development`: the failing test reproduces the bug first. Run the tests of what you
   touched (Rigor section); in a Salesforce org, only the affected test classes.
5. Add a Gotcha to `AGENTS.md` if it cost real time, then **finish with `octo-autonomous-finish`** exactly like
   `/octo-done`: final verification, commit (`fix(<scope>): …`), and push + draft PR when the policy allows. A bug
   fix needs no DoD document unless the bug was in a screen (then one scenario with its screenshot). Don't stop
   at the commit: the work is only finished with the PR link (or the manual commands if the PR can't be opened).
