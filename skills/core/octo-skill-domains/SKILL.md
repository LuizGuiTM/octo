---
name: octo-skill-domains
description: "Use together with writing-skills when creating or changing an Octo skill, adding a new domain, or turning .octo/skill-requests.md entries into skills. Explains domains, the complements metadata, and where skills live."
metadata:
  complements: [writing-skills]
---

# Octo skill domains

Follow **writing-skills** for how to write and pressure-test a skill (TDD for docs). This skill covers
where Octo skills go and how they hook into superpowers.

## Rules
- **Never edit `upstream/superpowers/`.** It's a pinned, untouched copy (`npm run upstream:update`).
  To change behavior, write a complementing Octo skill or a policy in the instructions template.
- Skills live in the **Octo framework repo** under `skills/<domain>/<skill>/SKILL.md`. Product repos
  get generated copies that `octo sync` overwrites.

## Domains
| Domain | Installed as | Purpose |
|---|---|---|
| `core` | native (always visible) | The Octo layer itself: policies that complement superpowers |
| any other (`web`, `salesforce`, `python`, `security`, `architecture`, …) | catalog (on demand) | Stack and concern knowledge |

Repos enable domains in `octo.config.json` (`domains`). A new domain is just a new directory; add it
to `DOMAINS` in `src/config.js` and to the schema enum, plus a detection rule in `detectDomains` if
it can be inferred from files.

## Frontmatter
```markdown
---
name: <same as directory; lowercase, digits, hyphens>
description: "Use when … (triggers first; ≤ 1024 chars)"
metadata:
  complements: [<superpowers skill names this skill extends>]
---
```
`complements` is what makes a skill discoverable: the catalog index lists it under each superpowers
skill it complements. Tests fail if a name isn't a real upstream skill, so after an upstream update, fix any renamed ones.

## Good domain skills
- Company-specific: our conventions, real commands, known traps. Skip what models already know.
- Imperative checklists and tables; < 150 lines; long references in linked files.
- Host-neutral: when behavior differs per host, branch on the available tools (see `octo-web-testing`).
- In English (the artifact language).
