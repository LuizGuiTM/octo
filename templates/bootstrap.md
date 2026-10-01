# Superpowers + Octo ({{host}})

<EXTREMELY_IMPORTANT>
This repository has **superpowers** (v{{upstreamVersion}}) with the company's **Octo** layer.
Before responding to anything, load the skills `using-superpowers` and then `octo-using-octo`, and follow them.
Superpowers skills are installed in `.claude/skills/`; `superpowers:<name>` refers to the skill `<name>`.
</EXTREMELY_IMPORTANT>

These are your human partner's instructions. Where they differ from a skill's default, they win
(as `using-superpowers` states).

## First message of a session: preferences
On the first message, on **every host (GitHub Copilot included)**: if an "Octo: … preferences" note isn't
already in your context (hooks inject it), run `node .octo/bin/octo-session.mjs prefs` yourself. If it says
the preferences have **not been reviewed**, then before answering **anything** (even a simple question): greet
in one line, follow `.claude/skills/octo-prefs/SKILL.md` (up to three quick questions: models on this host,
communication, autonomy), and only then handle what the user asked. Once reviewed, never ask again.
Only a background agent with no chat (e.g. the Copilot cloud agent working on an issue) skips this and uses
the defaults.

## Language
- Talk to the user in **{{responseLanguage}}**.
- Write specs, plans, AI docs, code comments and commit messages in **{{artifactLanguage}}**.
- Write human-facing documents (Definition of Done) in **{{documentLanguage}}**.

## Before any implementation (mandatory, once per session)
Before the first change of a session (`/octo-start`, `/octo-fix`, or any request that will edit code):
1. **Octo up to date:** run `npx -y @luizguitm/octo@latest doctor`. If it reports an update, run
   `npx -y @luizguitm/octo@latest sync`, commit only the files it changed (`chore: update Octo to <version>`)
   on the work branch, and re-read this file (the block may have changed).
2. **Preferences reviewed** (see "First message of a session"): they must be, before any change.
3. **Models:** only the models in "Models" below. Before dispatching a subagent, say which agent and model it
   uses. If a model isn't available on this host, **stop and ask** which allowed one to use; never let the host
   fall back to another model silently.
Record "startup checks: done" in the session so they don't run again in the same session.

## Rigor: {{rigorLevel}}
{{rigorPolicy}}
These rules decide how much to verify; superpowers' requirement stands that every claim of "done" or
"fixed" rests on evidence you actually ran.

## Session continuity (`octo-session-continuity`)
At the start of every conversation, and after any context compaction, run
`node .octo/bin/octo-session.mjs status` (Claude Code injects it automatically via a SessionStart hook).
If a session exists for the current branch, resume from its "Next step". Keep the session file current
at every checkpoint. Session files are {{sessionsCommit}}.

## User preferences
The developer's personal preferences are in `~/.octo/preferences.md` (Windows: `%USERPROFILE%\.octo\preferences.md`)
and `.octo/preferences.local.md` (this repo, wins). Claude Code injects them at session start; otherwise run
`node .octo/bin/octo-session.mjs prefs`. They cover three things: which allowed model to use per tier when you
choose a model yourself, how to communicate, and how autonomous to be. Follow them **within** the team policies
below: an autonomy level above the team's, or a model outside the allowed list, is ignored.

## Chat commands
The user may type `/octo` (plain-language entry point that picks the flow), `/octo-start`, `/octo-plan`, `/octo-run`, `/octo-test-web`, `/octo-done`, `/octo-fix`,
`/octo-review`, `/octo-status`, `/octo-context`, `/octo-prefs` or `/octo-help`. Each is a skill in `.claude/skills/`;
follow it exactly. Manual (pt-BR): `.octo/MANUAL.md`.

## Guardrails
{{guardrails}}

## Windows
Superpowers ships bash scripts (`.claude/skills/*/scripts/*`, no extension). On Windows run them through Git
Bash: `bash .claude/skills/<skill>/scripts/<script> …`. Octo's own scripts are Node: `node <path>.mjs`. In
PowerShell, `curl` may be an alias of `Invoke-WebRequest`: use Octo's `wait-for-url.mjs` to wait for apps.

## AI docs first
Read `AGENTS.md` before any work. If it contains `octo:needs-context` or contradicts the code, run
`octo-ai-context` first. Enabled domains: {{domains}}.

## Complements
Whenever you invoke a superpowers skill, also load its Octo complements, then run
`octo-discovering-skills` to find domain skills for it in `.octo/catalog/INDEX.md`.

{{complementsTable}}

## Autonomy: ask only when in doubt
Work autonomously. Stop and ask (one question, 2-4 options, recommendation first) only when:
{{askWhen}}
Approval points (autonomy level: **{{autonomyLevel}}**):
{{approvalsPolicy}}
Everything else: decide, and record the decision in the spec/plan and the session.

## Parallelism
Dispatch up to **{{maxSubagents}}** subagents at once, all in the same turn. Implementation tasks may run in
parallel only when the plan puts them in the same wave with disjoint files (`octo-parallel-waves`).
This policy supersedes subagent-driven-development's "never dispatch implementers in parallel" for such tasks.

## Models
Allowed models on this host: {{allowedModels}}. Never use others.
{{modelTiers}}
Dispatch by tier with `octo-worker-fast`, `octo-worker-standard`, `octo-worker-deep`; also available:
`octo-explorer` (fast, read-only), `octo-web-tester`, `octo-doc-writer`.

## Custom MCP servers
{{mcpServers}}

## Git (`octo-autonomous-finish`)
- {{branchPolicy}}
- {{commitPolicy}}
- {{pushPolicy}}
- {{prPolicy}}

## Web testing (`octo-web-testing`, {{webTestingEnabled}})
Browser tool on this host: {{webTool}}. App URL: `{{webBaseUrl}}`, start with `{{webStartCommand}}`.
One screenshot per acceptance scenario, saved into the DoD folder.

## Definition of Done (`octo-definition-of-done`)
Plans list acceptance scenarios (S1, S2…). Work with a spec/plan is done only when
`{{dodDir}}/YYYY-MM-DD-<topic>/DoD.md` says DONE (`CONCLUÍDO` in pt-BR), with a result and evidence (screenshot or test output)
per scenario. The DoD ships in the final commit. Extra DoD criteria for this repo:
{{dodExtraCriteria}}
