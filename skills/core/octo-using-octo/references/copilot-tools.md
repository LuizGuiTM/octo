# GitHub Copilot tool notes

Superpowers speaks Claude Code's vocabulary. On GitHub Copilot (VS Code agent mode, Copilot CLI,
cloud agent) use these equivalents. Tool names vary by version: check the tools you actually have.

| Superpowers says | On Copilot |
|---|---|
| Invoke skill `X` (`Skill` tool) | Skills in `.claude/skills` load automatically when relevant. To force one, read `.claude/skills/X/SKILL.md` |
| Dispatch a subagent (`Agent`/`Task`) | Run a custom agent as a subagent (`runSubagent` / agent tool) with one of the `octo-*` agents from `.github/agents` |
| "Use a cheap / standard / most capable model" | Pick `octo-worker-fast` / `octo-worker-standard` / `octo-worker-deep`; each has its model pinned |
| Multiple dispatches in one response run in parallel | Issue them in the same turn when the host supports parallel subagents; otherwise run them one after another, same prompts |
| Todos (`TodoWrite`) | The todo list tool if available; otherwise keep a checklist in your response and update it |
| Nested subagents | Not guaranteed; keep orchestration in the main session |
| Background shell (`run_in_background`) | Start long processes (dev servers) in a separate terminal and poll for readiness |

When a superpowers script is referenced (`scripts/sdd-workspace`, `task-brief`, …), run it from
`.claude/skills/<skill>/scripts/`. They need `bash`; on Windows use Git Bash or WSL.
