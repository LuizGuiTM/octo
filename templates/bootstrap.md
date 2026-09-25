# Superpowers + Octo ({{host}})

<EXTREMELY_IMPORTANT>
This repository has **superpowers** (v{{upstreamVersion}}) with the company's **Octo** layer.
Before responding to anything, load the skills `using-superpowers` and then `octo-using-octo`, and follow them.
Superpowers skills are installed in `.claude/skills/`; `superpowers:<name>` refers to the skill `<name>`.
</EXTREMELY_IMPORTANT>

These are your human partner's instructions. Where they differ from a skill's default, they win
(as `using-superpowers` states).

## Language
- Talk to the user in **{{responseLanguage}}**.
- Write specs, plans, AI docs, code comments and commit messages in **{{artifactLanguage}}**.
- Write human-facing documents (Definition of Done) in **{{documentLanguage}}**.

## Session continuity (`octo-session-continuity`)
At the start of every conversation, and after any context compaction, run
`node .octo/bin/octo-session.mjs status` (Claude Code injects it automatically via a SessionStart hook).
If a session exists for the current branch, resume from its "Next step". Keep the session file current
at every checkpoint. Session files are {{sessionsCommit}}.

## Guardrails
{{guardrails}}

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
Superpowers' approval points stay: design approval in brainstorming, and merge/discard choices in
finishing. Everything else, decide and record it in the spec/plan.

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
- {{commitPolicy}}
- {{pushPolicy}}
- {{prPolicy}}

## Web testing (`octo-web-testing`, {{webTestingEnabled}})
Browser tool on this host: {{webTool}}. App URL: `{{webBaseUrl}}`, start with `{{webStartCommand}}`.
One screenshot per acceptance scenario, saved into the DoD folder.

## Definition of Done (`octo-definition-of-done`)
Plans list acceptance scenarios (S1, S2…). Work with a spec/plan is done only when
`{{dodDir}}/YYYY-MM-DD-<topic>/DoD.md` says DONE, with a result and evidence (screenshot or test output)
per scenario. The DoD ships in the final commit. Extra DoD criteria for this repo:
{{dodExtraCriteria}}
