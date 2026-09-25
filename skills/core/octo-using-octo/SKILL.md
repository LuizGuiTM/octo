---
name: octo-using-octo
description: "Use at the start of every conversation, right after using-superpowers. Explains the company's Octo layer on top of superpowers: AI-docs first, domain skills that complement each superpowers skill, parallel waves, model tiers, and autonomous finishing with a commit."
metadata:
  complements: [using-superpowers]
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

# Using Octo

**Superpowers is the workflow. Octo complements it.** Every superpowers skill still applies exactly as
written. Octo adds company context, domain skills, and a few policies. Where an Octo policy and a
superpowers default differ, the Octo policy wins, because it comes from your human partner's
instructions (CLAUDE.md / copilot-instructions.md), which superpowers itself ranks above skills.

## The complement rule
Whenever you invoke a superpowers skill, also load the Octo skills that complement it:
1. The native complements listed in the instructions block ("Complements" table).
2. Catalog complements: run `octo-discovering-skills` for that superpowers skill.

Announce both: `Using writing-plans + octo-parallel-waves, web/node/node-api to plan the API change.`

## What Octo adds
| Concern | Octo skill | Complements |
|---|---|---|
| Resume work across sessions, hosts and compaction | `octo-session-continuity` | using-superpowers, brainstorming, writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch |
| AI-facing docs are the project's memory | `octo-ai-context` | brainstorming, systematic-debugging, finishing-a-development-branch |
| Just-in-time domain skills | `octo-discovering-skills` | every superpowers skill |
| Maximum safe parallelism | `octo-parallel-waves` | writing-plans, subagent-driven-development, executing-plans, dispatching-parallel-agents |
| Browser verification of UI | `octo-web-testing` | verification-before-completion, requesting-code-review |
| Definition of Done document, a screenshot per scenario | `octo-definition-of-done` | writing-plans, verification-before-completion, finishing-a-development-branch |
| Finish with a commit, Devin-style | `octo-autonomous-finish` | finishing-a-development-branch, verification-before-completion |
| Growing the library by domain | `octo-skill-domains` | writing-skills |

## AI docs first
Before brainstorming or debugging, read `AGENTS.md`. If it's missing, contains `octo:needs-context`,
or contradicts the code, run `octo-ai-context` first.

## Asking vs. deciding
Superpowers asks your partner at defined points (design approval, plan review, finishing options).
Keep those, except where the autonomy policy in the instructions block says otherwise. Outside them,
act autonomously and ask only in the situations the policy lists. When you ask: one question, 2-4
options, your recommendation first.

## Model tiers
Superpowers asks for a "fast/cheap", "standard" or "most capable" model. Octo maps these to allowed
models (see the instructions block):
| Superpowers says | Octo tier | Dispatch |
|---|---|---|
| cheap / fast model | `fast` | `octo-worker-fast` |
| standard / mid-tier model | `standard` | `octo-worker-standard` |
| most capable model | `deep` | `octo-worker-deep` |
Always dispatch through these agents or pass the tier's model explicitly. Never use a model outside
the allowed list.

## Host notes
- Claude Code: superpowers' vocabulary (`Agent`, todos, `Skill`) is native.
- GitHub Copilot: read `references/copilot-tools.md` for the equivalents.
- Skill references like `superpowers:writing-plans` mean the skill named `writing-plans`.
