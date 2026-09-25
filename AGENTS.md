# AGENTS.md: Octo framework

Octo is the company layer on top of **superpowers** (vendored, untouched, in `upstream/superpowers/`).
A zero-dependency Node CLI (`bin/octo.js`) installs superpowers + Octo skills, agents and instructions into
product repositories for Claude Code and GitHub Copilot.
Talk to the user in pt-BR; write code, skills and these docs in English (README is pt-BR, for humans).

## Commands
| Task | Command |
|---|---|
| Test | `npm test` (node:test on `test/*.test.js`, no deps) |
| Update superpowers | `npm run upstream:update` (optionally `-- --ref <tag>`), then `npm test` |
| Try the CLI on a sample repo | `node bin/octo.js init --cwd <dir>` then `node bin/octo.js doctor --cwd <dir>` |

## Layout
| Path | What |
|---|---|
| `upstream/superpowers/` | Pinned copy of obra/superpowers (`superpowers.lock.json`). **Never edit.** |
| `skills/core/octo-*/` | Octo layer, installed natively into `.claude/skills` |
| `skills/<domain>/<skill>/` | Domain catalogs (architecture, security, web, salesforce, python), discovered on demand |
| `agents/*.md` | Neutral subagent definitions (`tier`, optional per-host `tools`); body may use `{{vars}}` |
| `templates/bootstrap.md` | Instructions block rendered per host into CLAUDE.md / copilot-instructions.md |
| `templates/AGENTS.md` | Scaffold written once into product repos |
| `src/config.js` | Defaults, validation (tiers ⊆ allowed models), `DOMAINS`, domain detection |
| `src/sources.js` | Reads upstream skills, Octo skills, agents, templates |
| `src/sync.js` | Resolves skills, validates `complements`, generates everything, manifest-based cleanup, INDEX + complements table |
| `src/adapters.js` | Per-host output: file paths, agent frontmatter, model format, template vars |
| `src/yaml-lite.js` | Minimal YAML frontmatter parser (Octo frontmatter must stay within its subset) |
| `src/managed-json.js` | Adds/removes Octo's entries in user-owned JSON (settings, MCP configs); ownership lives in the manifest |
| `src/host-settings.js` | Guardrails → Claude permissions / Copilot autoApprove; SessionStart hook |
| `src/mcp.js` | MCP registry (`mcp/`), inline servers, Playwright; per-host placeholder translation |
| `runtime/octo-session.mjs` | Zero-dep session script copied to `.octo/bin/` in product repos |
| `mcp/<name>/` | Company MCP registry (`server.json` + optional `skill/`); `_`-prefixed dirs are examples |

## Invariants
- Octo complements, never overrides: no edits in `upstream/`. Behavior changes go into a complementing
  skill or into `templates/bootstrap.md` (user instructions outrank skills per `using-superpowers`).
- Every Octo skill has `metadata.complements` listing real superpowers skill names (tests + sync enforce it)
  and must not reuse a superpowers skill name.
- `DOMAINS` in `src/config.js` must match the directories in `skills/` except `core` (test enforces it);
  keep the schema enum in sync.
- `sync` never overwrites user content: only manifest-owned files, the `octo:begin/end` block, and JSON
  entries recorded under `managed` in `.octo/manifest.json`. A same-named user entry is reported as a
  conflict and left alone. `AGENTS.md` is created only if missing.
- New config options must be added to `defaultConfig()`; `octo config upgrade` relies on it.
- `runtime/octo-session.mjs` runs in product repos with only Node: no imports from `src/`.
- Template variables must exist in `templateVars()` (+ `extra` from sync); `render` throws on unknown ones.

## Gotchas
- `node --test` without a glob also runs superpowers' own tests (they need deps); keep the `test/*.test.js` glob.
- VS Code Copilot also reads `.claude/agents`, so with both targets the agents show up twice there.
- Copilot model names are display names and change often; they live only in config.
- Superpowers' SessionStart hook isn't installed. The instructions block does the bootstrapping on both hosts;
  Octo's own SessionStart hook only injects session state.
- `npx <local.tgz>` runs nothing; use `npx -p <spec> octo …`.
- Session branch detection uses `git branch --show-current` (works before the first commit).
