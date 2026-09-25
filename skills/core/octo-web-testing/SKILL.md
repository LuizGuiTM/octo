---
name: octo-web-testing
description: "Use after implementing anything a browser renders (pages, components, forms, Salesforce LWC or Experience Cloud) and before finishing. Starts the app, runs the plan's acceptance scenarios in a real browser (Claude in Chrome on Claude Code, Playwright MCP on GitHub Copilot) and saves one screenshot per scenario for the Definition of Done document."
metadata:
  complements: [verification-before-completion, requesting-code-review, finishing-a-development-branch]
---

# Web testing in a real browser

Unit tests prove the logic; this skill proves the user can actually do the thing. It is part of
the evidence verification-before-completion demands for any UI change.

## 1. Pick the browser tool for this host
Check which tools you have, in this order:
| Host | Tool | How you recognize it |
|---|---|---|
| Claude Code | **Claude in Chrome** | tools named `mcp__claude-in-chrome__*` (session started with `claude --chrome` or `/chrome`) |
| GitHub Copilot (VS Code / CLI) | **Playwright MCP** | tools named `browser_navigate`, `browser_snapshot`, `browser_click`… (server `playwright` in `.vscode/mcp.json`) |
| Either, as fallback | Playwright MCP | same as above, via `.mcp.json` on Claude Code |

The instructions block names the configured tool and the app URL/start command.
If no browser tool is available: tell the user how to enable it (commands above), and meanwhile fall
back to the project's own e2e runner (`npx playwright test`, Cypress, and so on) if one exists. Never claim
UI verification you didn't perform.

## 2. Prepare
1. Start the app with the configured start command **in the background** and wait until the URL
   responds (poll with curl or the equivalent; don't sleep blindly). Reuse it if it's already running.
2. For Salesforce: deploy to a scratch/sandbox org first (`sf project deploy start`) and open it with
   `sf org open --url-only`. Never test in production orgs.
3. Seed test data through the app's own seed scripts/APIs, never by hand in shared environments.

## 3. Scenarios
Use the plan's **Acceptance scenarios** table (`web` rows); IDs S1, S2… are fixed there
(`octo-definition-of-done`). If there's no plan, write the table yourself from the spec before opening
the browser. Make sure it covers the happy path, one validation error, the empty state, one permission/role case
(if the feature has access rules), and mobile width (375px) for user-facing UI.

## 4. Run, with one screenshot per scenario
Screenshots go to `<dodDir>/YYYY-MM-DD-<topic>/screenshots/<ID>-<slug>.<ext>` (see `octo-definition-of-done`).
Keep the extension the tool produced (`.jpg` from Claude in Chrome, `.png` from Playwright).
Take the screenshot **when the expected result is on screen**; on FAIL, take it at the failure point
and name it `<ID>-<slug>-fail-<n>.<ext>`.

| Tool | How to save the screenshot |
|---|---|
| Claude in Chrome | `computer` action `screenshot` with `save_to_disk: true` and **no `scale`** (full resolution; scaled captures are unreadable in the DoD) → the result gives the saved path → copy that file to the DoD path (`cp` / `Copy-Item`) |
| Playwright MCP | `browser_take_screenshot` with `filename` set to the **full DoD path relative to the repo root** (e.g. `docs/superpowers/dod/2026-09-24-orders/screenshots/S1-create-order.png`). Explicit names resolve against the workspace root and land there directly; only auto-named files go to `.octo/evidence/` |

Tool-call discipline (learned from real runs):
- **Read the tool's input schema; don't assume argument names.** They change between versions (Playwright
  MCP 1.64 takes the element in `target`, older versions in `ref`).
- **Every tool error is a stop.** Never continue a scenario past a failed click/type/wait. A silent failure
  followed by an unchanged snapshot looks like a pass but proves nothing.
- **Prove each action changed the page**: after a click, wait for the expected change (`browser_wait_for`
  text / textGone, or re-read the page) before judging or capturing. If the snapshot is identical to the
  previous one, the action didn't happen.

Screenshot hygiene (learned from real runs):
- **Confirm the state first, then capture**: read the page text or accessibility tree and check the
  expected result is there before the screenshot. Right after a navigation, the page may still be
  rendering and the capture can come out blank or shrunk.
- If a capture times out or looks wrong (blank, shrunk, cut), retry **once**. If it's still wrong, keep the
  PASS/FAIL verdict from the page text, attach the best capture you have, and note it in the DoD's
  History section. Don't loop.

Then:
- ≤ 3 scenarios: run them yourself. More: group them into independent sets and dispatch one
  `octo-web-tester` per set **in parallel** (own tab/context each), passing the scenario rows, URL, test
  credentials and the screenshot folder.
- Judge results by reading the page (accessibility tree / page text); the screenshot is evidence, not the check.
- Check the console and network for errors after each scenario.
- Verify each screenshot file exists and isn't empty before recording it in the DoD, and that no stray
  screenshot landed elsewhere in the repo (`git status`).
- Optionally record a GIF of the main flow (Claude in Chrome `gif_creator`, export with `download: true`).

## 5. Report and loop
- Write each scenario result and screenshot link into the DoD document (`octo-definition-of-done`), then
  put the results table in your summary.
- A FAIL is a bug: go to systematic-debugging, fix with test-driven-development, then re-run **all** scenarios (new screenshots; keep the fail ones for the history).
- Stop the dev server you started when done.
- If a scenario is valuable long-term, suggest turning it into a committed e2e test.

## Safety
- Don't trigger native `alert`/`confirm`/`prompt` dialogs unless needed; they block automation.
- Never type real credentials or personal data; ask the user for test accounts.
- Only interact with the app under test; don't navigate elsewhere with the user's logged-in browser.
