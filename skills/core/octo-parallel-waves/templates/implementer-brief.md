# Parallel-wave addendum

Append this to superpowers' implementer prompt (`subagent-driven-development/implementer-prompt.md`) for
tasks that run in parallel. It adds rules; it doesn't replace anything in that prompt. Fill every `<…>`.

---

## Parallel wave rules (Octo)
Other implementers are working in this same repository **at the same time**, on other files.

- **You own ONLY these files:** <every path from the task's **Files:** list>
  Don't create, edit, format or stage anything else. If the task truly needs another file, stop and report
  BLOCKED with the file and the reason: that work moves to a later wave.
- **Tests while working:** run only your own tests (`<single-test command from AGENTS.md>`). Full-suite
  failures during the wave come from files other implementers are mid-edit on; the orchestrator runs the
  full suite after the wave.
- **Commit exactly once**, at the end, with only your files:
  `git add <your files>` then `git commit -m "<type>(<scope>): <summary> [plan Task <N>]" -- <your files>`.
  If git reports `index.lock` exists, another implementer is committing: wait a few seconds and retry
  (never delete the lock file). Report the commit SHA.
- **Also follow:** <catalog paths, e.g. `.octo/catalog/salesforce/apex/salesforce-apex-quality/SKILL.md`, or "none">
- Use superpowers' statuses in your report. If the task needs more judgment than your tier allows, report
  BLOCKED with the reason "needs a higher tier".
