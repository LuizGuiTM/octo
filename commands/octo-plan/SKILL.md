---
name: octo-plan
description: "Command /octo-plan: turns the approved spec of the current session into an implementation plan with parallel waves and acceptance scenarios, then continues or stops according to the autonomy policy. Only when the user invokes it."
argument-hint: "[spec path, default: the session's spec]"
disable-model-invocation: true
---

# /octo-plan

1. Find the spec: the argument, or `spec:` in the active session (`node .octo/bin/octo-session.mjs status`).
   No approved spec? Say so: bounded work needs no plan (go straight to implementation); architectural work
   starts with `/octo-start`.
2. Run `octo-discovering-skills` for `writing-plans`.
3. Follow superpowers `writing-plans` in its own task format, plus `octo-parallel-waves` (a
   `**Wave:** · **Depends on:** · **Tier:**` line per task, the Waves table) and `octo-definition-of-done`
   (the **Acceptance scenarios** table).
4. Validate: `node .claude/skills/octo-parallel-waves/scripts/check-waves.mjs <plan>`. Fix until it passes.
5. Update the session (`plan:`, next step). Execution method: subagent-driven with parallel waves (the policy
   supplies it; don't ask).
6. Plan review per the instructions block ("Approval points"): if the policy waits for plan review, show the
   waves table and stop; the user continues with `/octo-run`. Otherwise start `/octo-run` right away.
