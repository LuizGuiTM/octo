---
name: octo-discovering-skills
description: "Use every time you invoke a superpowers skill, and whenever the work touches a technology or concern (framework, Salesforce, Python, security, migrations) not yet covered by a loaded skill. Finds and loads the Octo domain skills that complement the current step, and records missing ones."
metadata:
  complements: [using-superpowers]
---

# Discovering domain skills

Superpowers skills are always visible. Domain knowledge lives in a catalog organized as
**domain → technology → item** (e.g. `salesforce/apex/…`, `web/react/…`) and is loaded **just in time**,
keyed by the superpowers skill you're running and the files you touch. The context stays small while the
library grows. Items come from Octo and from github/awesome-copilot.

The catalog has two kinds of items:
- **Skills** (`SKILL.md`, often with `references/`, `scripts/`, `assets/`): workflows and checklists, keyed
  to superpowers skills.
- **Instructions** (`*.instructions.md` with an `applyTo` glob): coding standards for a technology, keyed to
  the files you edit.

## How
1. Open `.octo/catalog/INDEX.md`.
2. **Skills**: in **By superpowers skill**, find the row for the skill you just invoked. Keep only those
   whose "Use when" matches the actual work (match on meaning: a plan touching Apex triggers →
   `salesforce/apex/salesforce-apex-quality`; a React component test → `web/react/react19-test-patterns`).
3. **Instructions**: before editing files, check the instructions whose `applyTo` glob matches them
   (e.g. `**/*.cls` → `salesforce/apex/apex.instructions.md`). Broad globs (`**`) apply only when the
   description matches the work (accessibility for UI work, OWASP for security-sensitive code).
4. Read each chosen file in full. Read an item's `references/` only when needed, and prefer running its
   `scripts/` over re-deriving what they compute.
5. Announce in one line: `Domain: salesforce/apex/salesforce-apex-quality, salesforce/apex/apex.instructions.md`.
6. Apply them on top of the superpowers skill. They add rules and never remove superpowers steps.
7. **Pass them on**: when dispatching subagents (implementers, reviewers), list the catalog paths in the
   prompt, e.g. `Also follow .octo/catalog/salesforce/apex/salesforce-apex-quality/SKILL.md`.

Load at most ~4 items per step. If more match, prefer the most specific technology. Large instructions
(hundreds of lines): read the sections relevant to the change, not the whole file.
Re-run discovery mid-step when the work reaches a new technology (e.g. the plan was all backend, and
now a task touches LWC).

## When no skill fits
If you needed guidance the catalog lacks (a company convention, a recurring trap, an internal tool),
append to `.octo/skill-requests.md` (create it if needed):
```
## <domain>/<technology>/<proposed-skill-name>
- Complements: <superpowers skill>
- Need: <what was missing, one or two sentences>
- Evidence: <task or path where it came up>
```
Mention new requests in your final summary so the team can write them (`octo-skill-domains`).

## Promoting
If you load the same catalog skill in most tasks, suggest `octo skills promote <name>` to make it native.
