# Playwright MCP: field notes

Used by GitHub Copilot (and optionally Claude Code) through the `playwright` server Octo writes into
`.vscode/mcp.json` / `.mcp.json`. Verified with `@playwright/mcp` 1.64.

## Tools you'll use
| Tool | Use | Notes |
|---|---|---|
| `browser_navigate` | open the app | `{ url }` |
| `browser_snapshot` | accessibility tree with element refs (`[ref=e12]`) | the source of truth for PASS/FAIL |
| `browser_click` | click an element | element ref goes in **`target`** (1.64); older versions used `ref`. Read the schema |
| `browser_type` / `browser_fill_form` | type into inputs | take the input's ref from the latest snapshot |
| `browser_wait_for` | wait for `text` to appear or `textGone` to disappear | use after every action before judging |
| `browser_take_screenshot` | evidence | `filename` is resolved against the **workspace root**: pass the full DoD path |
| `browser_console_messages` | console errors | check after each scenario |
| `browser_resize` | mobile width checks | e.g. 375×812 |
| `browser_close` | end the session | always, at the end |

## Pitfalls seen in real runs
- **Silent failures.** A click with a wrong argument name returns an error; if you ignore it, the next
  snapshot is unchanged and the scenario *looks* like it passed. Stop on every error.
- **Refs expire.** Refs belong to one snapshot. After navigation or re-render, take a new snapshot before
  clicking again.
- **Stray files.** A relative `filename` like `S1.png` lands in the repo root. Always use the DoD path.
- **Auto-named output** (no `filename`) goes to `--output-dir` (`.octo/evidence/`, git-ignored).
- **Favicon 404s** in the console are noise; mention them but don't fail a scenario for them.
- **Browser choice**: headed Chrome by default. For CI-like runs the server accepts `--headless`.

## Minimal scenario loop
```
navigate(url) → wait_for(text: <landmark>) → snapshot
for each step: click/type(target=<ref from latest snapshot>) → wait_for(<expected change>) → snapshot
assert on the snapshot text → take_screenshot(filename: "<dodDir>/<date>-<topic>/screenshots/<ID>-<slug>.png")
console_messages → record errors
```
