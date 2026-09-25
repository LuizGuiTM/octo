---
name: octo-fix
description: "Command /octo-fix <bug, error or failing test>: investigates and fixes a problem with systematic debugging, a regression test first, and a commit. Only when the user invokes it."
argument-hint: "<what is broken: error message, failing test, steps>"
disable-model-invocation: true
---

# /octo-fix

1. Read `AGENTS.md`; resume the branch's session if there is one, otherwise create a work branch with the
   pattern from the instructions block's Git section and `{type}` = `fix` (e.g. `fix/<topic>-octo`), with its own session.
2. Run `octo-discovering-skills` for `systematic-debugging` (stack skills list known traps).
3. Follow superpowers `systematic-debugging` exactly: reproduce, find the root cause, test **one hypothesis
   at a time** with the smallest change. Octo addition: independent evidence gathering (logs, call sites,
   recent commits in different areas) may run as parallel `octo-explorer` dispatches.
4. Fix with `test-driven-development`: the failing test reproduces the bug first.
5. Verify, add a Gotcha to `AGENTS.md` if it cost real time, and commit (`fix(<scope>): …`) per the autonomy policy.
