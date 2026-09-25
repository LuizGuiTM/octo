---
name: octo-session-continuity
description: "Use at the start of every conversation, after context compaction, and at every checkpoint of non-trivial work (spec approved, plan written, wave done, decision taken, question asked, blocker hit, before stopping). Keeps a session file per task in .octo/sessions/ so any later session, on any host, resumes exactly where the work stopped."
metadata:
  complements: [using-superpowers, brainstorming, writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch]
---

# Session continuity

Conversation memory doesn't survive a new session, a host switch (Claude Code ↔ Copilot) or context
compaction. The session file does. It covers the **whole task** (phase, spec, plan, decisions, next step)
and points to superpowers' SDD ledger (`.superpowers/sdd/<plan>/progress.md`) for task-level progress
instead of duplicating it.

## Start of a conversation
1. Run `node .octo/bin/octo-session.mjs status` (Claude Code already injected its output at session start).
2. **Session for the current branch** → read it fully, tell the user in 1-2 lines where things stand, and
   continue from **Next step**. If an SDD ledger is listed, resume through subagent-driven-development
   as it prescribes.
3. **Only sessions on other branches** → mention them in one line; don't touch them unless asked.
4. **None**, and the request is non-trivial (anything that will go through brainstorming) → create one
   right after the first exchange: `node .octo/bin/octo-session.mjs new "<topic>"`.

## Checkpoints: update the file (edit it directly)
Update the frontmatter (`phase`, `spec`, `plan`, `sdd-workspace`, `dod`, `updated`) and the sections:
| Moment | Update |
|---|---|
| Spec approved / plan written | `spec:` / `plan:` paths, `phase`, Current state |
| Each wave completed | Current state (waves done), Next step |
| Autonomous decision | Decisions: `date — decision — why — autonomous` |
| Question asked to the user | Open questions (and what continues meanwhile) |
| Blocker | Open questions and blockers, Next step = how to unblock |
| Before stopping or when context feels long | Current state + a precise Next step |

**Next step** is always ONE concrete action ("Dispatch wave 3: T7, T8"), never "continue".
Append a one-line timestamped entry to **Log** at each checkpoint. Keep the file under ~80 lines:
summarize old log lines rather than letting them grow.

## End
In `octo-autonomous-finish`, after the commit: fill `dod:`, write the final state, then
`node .octo/bin/octo-session.mjs close <file>`.

## Rules
- One active session per branch. Different tasks → different branches.
- Subagents never edit the session file; the orchestrator does.
- Never put secrets or personal data in it.
