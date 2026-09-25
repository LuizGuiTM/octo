---
name: octo-discovering-skills
description: "Use every time you invoke a superpowers skill, and whenever the work touches a technology or concern (framework, Salesforce, Python, security, migrations) not yet covered by a loaded skill. Finds and loads the Octo domain skills that complement the current step, and records missing ones."
metadata:
  complements: [using-superpowers]
---

# Discovering domain skills

Superpowers skills are always visible. Octo domain skills (web, salesforce, python, security,
architecture, and so on) live in a catalog and are loaded **just in time**, keyed by the superpowers skill
you're running. The context stays small while the library grows.

## How
1. Open `.octo/catalog/INDEX.md`.
2. In **By superpowers skill**, find the row for the skill you just invoked. It lists the domain skills
   that complement it.
3. Keep only those whose "Use when" matches the actual work (match on meaning: a plan touching Apex
   triggers → `apex-development`; a React form → `react-components`).
4. Read each chosen `SKILL.md` in full. Read linked reference files only when needed.
5. Announce in one line: `Domain skills: salesforce/apex-development, security/security-review`.
6. Apply them on top of the superpowers skill. They add rules and never remove superpowers steps.
7. **Pass them on**: when dispatching subagents (implementers, reviewers), list the domain skill paths
   in the prompt, e.g. `Also follow .octo/catalog/salesforce/apex-development/SKILL.md`.

Load at most ~4 domain skills per step. If more match, prefer the most specific.
Re-run discovery mid-step when the work reaches a new technology (e.g. the plan was all backend, and
now a task touches LWC).

## When no skill fits
If you needed guidance the catalog lacks (a company convention, a recurring trap, an internal tool),
append to `.octo/skill-requests.md` (create it if needed):
```
## <domain>/<proposed-skill-name>
- Complements: <superpowers skill>
- Need: <what was missing, one or two sentences>
- Evidence: <task or path where it came up>
```
Mention new requests in your final summary so the team can write them (`octo-skill-domains`).

## Promoting
If you load the same catalog skill in most tasks, suggest `octo skills promote <name>` to make it native.
