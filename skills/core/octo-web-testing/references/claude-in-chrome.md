# Claude in Chrome: field notes

Used by Claude Code (`claude --chrome` or `/chrome`). Tools are named `mcp__claude-in-chrome__*` and act in
the user's real Chrome, in a tab group of their own.

## Tools you'll use
| Tool | Use | Notes |
|---|---|---|
| `tabs_context_mcp` | list/create this session's tab group | call first; create your own tab, never reuse the user's |
| `navigate` | open the app | |
| `get_page_text` / `read_page` | page text / accessibility tree | the source of truth for PASS/FAIL |
| `find` | locate elements by description → refs | |
| `form_input` | set input values by ref | |
| `computer` | click (`left_click` with `ref`), keys, **screenshots** | screenshot with `save_to_disk: true` returns a file path |
| `read_console_messages` | console errors | always pass a `pattern`; `onlyErrors: true` for checks |
| `gif_creator` | optional recording of the main flow | export with `download: true` |
| `tabs_close_mcp` | close your tab | always, at the end |

## Pitfalls seen in real runs
- **Screenshots are `.jpg`.** Keep the extension when copying into the DoD folder.
- **Don't pass `scale`** for evidence screenshots: scaled captures come out unreadable.
- **Right after `navigate`, captures can come out blank or shrunk.** Read the page text first (it waits for
  content), then capture.
- **Captures can time out** (`Page.captureScreenshot` 30 s). Retry once, then keep the verdict from the page
  text and note it in the DoD's History.
- **Native dialogs** (`alert`/`confirm`) block the extension. Avoid triggering them.
- The browser is the user's real, logged-in Chrome: only visit the app under test.

## Minimal scenario loop
```
tabs_context_mcp(createIfEmpty) → navigate(url) → get_page_text (landmark present?)
for each step: find → form_input / computer.left_click(ref) → get_page_text (expected change?)
computer.screenshot(save_to_disk) → cp <returned path> "<dodDir>/<date>-<topic>/screenshots/<ID>-<slug>.jpg"
read_console_messages(onlyErrors) → tabs_close_mcp
```
