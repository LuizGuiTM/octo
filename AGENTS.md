# AGENTS.md: Octo framework

Octo is a layer on top of **superpowers** (vendored, untouched, in `upstream/superpowers/`) with curated imports
from **github/awesome-copilot** (vendored, untouched, in `upstream/awesome-copilot/`). A zero-dependency Node CLI
(`bin/octo.js`, published as `@luizguitm/octo`) installs skills, chat commands, agents, instructions, settings and
scripts into product repositories for Claude Code and GitHub Copilot.
Talk to the user in pt-BR; write code, skills and these docs in English. README and `docs/MANUAL.md` are pt-BR, for humans.

## Commands
| Task | Command |
|---|---|
| Test | `npm test` (node:test on `test/*.test.js`, no deps) |
| Update upstreams | `npm run upstream:update -- --source superpowers\|awesome-copilot\|all [--ref <tag>]`, then `npm test` |
| Try the CLI on a sample repo | `node bin/octo.js init --cwd <dir>` then `node bin/octo.js doctor --cwd <dir>` |
| Preview the package | `npm pack --dry-run` |
| Publish | bump `version`, commit, tag `vX.Y.Z`, `git push origin main --tags`; the user runs `npx npm@latest publish` in a real terminal (2FA via security key) |

## Layout
| Path | What |
|---|---|
| `upstream/superpowers/` | Pinned copy of obra/superpowers (`superpowers.lock.json`). **Never edit.** |
| `upstream/awesome-copilot/` | Only the items listed in `awesome-copilot.imports.json` (which adds domain, tech, complements). **Never edit.** |
| `skills/core/octo-*/` | Octo layer, installed natively into `.claude/skills` (with `scripts/`, `templates/`, `references/`) |
| `skills/<domain>/<tech>/<skill>/` | Own domain catalog, discovered on demand; domains also come from the imports map |
| `commands/octo-*/` | Chat commands: skills with `disable-model-invocation: true`, installed natively |
| `agents/*.md` | Neutral subagent definitions: `tier`, `argument-hint`, and per-host `claude-code:` / `copilot:` frontmatter blocks |
| `templates/` | `bootstrap.md` (instructions block), `AGENTS.md` scaffold, `session.md`, `preferences.md` (pt-BR) |
| `docs/MANUAL.md` | User manual (pt-BR), installed as `.octo/MANUAL.md` |
| `runtime/octo-session.mjs` | Zero-dep session + preferences script, copied to `.octo/bin/` |
| `mcp/<name>/` | Company MCP registry (`server.json` + optional `skill/`); `_`-prefixed dirs are examples |
| `src/config.js` | Defaults, autonomy presets, validation, `DOMAINS`, domain detection |
| `src/sources.js` | Reads upstream, imported, own and command skills, agents, templates |
| `src/sync.js` | Resolves and validates skills, generates everything, catalog INDEX, manifest-based cleanup |
| `src/adapters.js` | Per-host output: paths, agent frontmatter, model format, template vars (approvals, PR policy) |
| `src/host-settings.js` | Guardrails (adjusted by autonomy) → Claude permissions / Copilot autoApprove; SessionStart hook |
| `src/managed-json.js` | Adds/removes Octo's entries in user-owned JSON; ownership lives in the manifest |
| `src/mcp.js` | MCP registry, inline servers, Playwright; per-host placeholder translation |
| `src/yaml-lite.js` | Minimal YAML frontmatter parser (Octo frontmatter must stay within its subset) |

## Invariants
- Octo complements, never overrides: no edits in `upstream/`. Behavior changes go into a complementing
  skill or into `templates/bootstrap.md` (user instructions outrank skills per `using-superpowers`).
- Every Octo and imported skill has `complements` listing real superpowers skill names (tests + sync enforce it)
  and must not reuse a superpowers skill name; own and imported names must not collide.
- `DOMAINS` in `src/config.js` must equal `domainNames()` (own dirs + imports map); keep the schema enum in sync.
- `sync` never overwrites user content: only manifest-owned files, the `octo:begin/end` block, and JSON
  entries recorded under `managed` in `.octo/manifest.json`. `AGENTS.md` is created only if missing.
- New config options go into `defaultConfig()`; `octo config upgrade` relies on it.
- Guardrails must never contradict autonomy: `effectiveCommands()` moves granted push/PR commands out of `ask`.
- Scripts in skills and `runtime/` run in product repos with only Node: no imports from `src/`.
- Template variables must exist in `templateVars()` (+ `extra` from sync); `render` throws on unknown ones.
  Skills are copied verbatim, so they must not contain `{{vars}}`.

## Gotchas
- `node --test` without a glob also runs superpowers' own tests; keep the `test/*.test.js` glob.
- VS Code Copilot also reads `.claude/agents`, so with both targets the agents show up twice there.
- Copilot model names are display names and change often; they live only in config.
- Playwright MCP 1.64 takes the element in `target` (not `ref`); explicit screenshot names resolve against the
  workspace root, not `--output-dir`.
- `npx <local.tgz>` runs nothing; use `npx -p <spec> octo …`. From the registry, `npx @luizguitm/octo` works.
- The npm registry can take ~3 minutes to show a new version after a `202 Accepted` publish.
- Session branch detection uses `git branch --show-current` (works before the first commit).
- Shell heredocs in this environment mangle backslashes; write files with the editor tools instead.
