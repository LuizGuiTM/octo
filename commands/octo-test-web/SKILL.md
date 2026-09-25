---
name: octo-test-web
description: "Command /octo-test-web: runs the plan's web acceptance scenarios in a real browser and saves one screenshot per scenario into the DoD folder. Only when the user invokes it."
argument-hint: "[scenario IDs, default: all web scenarios] [--url <app url>]"
disable-model-invocation: true
---

# /octo-test-web

Follow `octo-web-testing` exactly, for the scenarios given (default: every `web` row of the plan's
**Acceptance scenarios**):
1. Pick the browser tool for this host; start the app if needed and wait until it responds.
2. Run each scenario: confirm the expected state through the page, then save the screenshot into
   `<dodDir>/<date>-<topic>/screenshots/`.
3. Report a PASS/FAIL table. For FAILs, offer `/octo-fix`. Otherwise the next command is `/octo-done`.
