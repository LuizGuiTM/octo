---
name: octo-definition-of-done
description: "Use together with verification-before-completion and finishing-a-development-branch whenever the work has a spec or plan. Builds the Definition of Done document: every acceptance scenario with its result and a screenshot, test evidence, review status, and the company DoD checklist. The task isn't done, and isn't committed, until the DoD says DONE."
metadata:
  complements: [verification-before-completion, finishing-a-development-branch, writing-plans]
---

# Definition of Done document

One document per spec/plan proves the work is done, with evidence a reviewer can check without
running anything: `<dodDir>/YYYY-MM-DD-<topic>/DoD.md` (`dodDir` is in the instructions block;
default `docs/superpowers/dod`), with screenshots next to it in `screenshots/`.
Start from `dod-template.md` in this skill's directory.

**Language:** the DoD is a human-facing document. Write it entirely in the **document language** from the
instructions block (default pt-BR), including headings, statuses and observations; the template is
already in pt-BR. Status words: `CONCLUÍDO` / `NÃO CONCLUÍDO`, results: `PASSOU` / `FALHOU` (translate them
if the document language isn't Portuguese). Scenario IDs, file names and commands stay as they are.

## With writing-plans: scenarios are defined up front
The plan must contain an **Acceptance scenarios** table. Every spec acceptance criterion maps to at
least one scenario:
```markdown
## Acceptance scenarios
| ID | Criterion (spec) | Type | Steps | Expected |
|---|---|---|---|---|
| S1 | AC1: user can create an order | web | open /orders/new → fill form → Save | toast "Order created", order in list |
| S2 | AC2: invalid email rejected | web | … | inline error under Email |
| S3 | AC3: total uses tax rules | test | `npm test -- orders/total` | 12 passed |
```
`Type`: `web` = run in the browser with a screenshot (`octo-web-testing`); `test` = proven by automated
tests (quote the command and counts); `manual` = needs a human, so name who and why.

## Building the document
1. Create `<dodDir>/YYYY-MM-DD-<topic>/` and copy `dod-template.md` to `DoD.md` there. Use the plan's topic.
2. **Web scenarios**: `octo-web-testing` runs them and saves **one screenshot per scenario at the
   moment the expected result is visible** (plus one at the failure point, if it fails), as
   `screenshots/<ID>-<slug>.<ext>` (keep the tool's extension), e.g. `screenshots/S1-create-order.jpg`. Screenshots of FAIL runs that
   were later fixed are kept as `<ID>-<slug>-fail-<n>.<ext>` and linked in the history section.
3. **Test scenarios**: run the command fresh and paste the summary line (counts).
4. Fill the checklist with real evidence. Tick a box only with evidence in this session; otherwise
   leave it unticked with the reason.
5. **Status**: `CONCLUÍDO` (DONE) only when every scenario passes and every checklist item is ticked or explicitly
   waived by your human partner (write who waived it and why). Otherwise `NÃO CONCLUÍDO` (NOT DONE), listing what's missing.
6. Embed screenshots with relative paths so the document renders on GitHub/VS Code:
   `![S1 – create order](screenshots/S1-create-order.jpg)`.
7. Keep it factual and short: no marketing, no restating the spec. Link the spec and plan instead.

## Company DoD checklist (always included)
- [ ] All acceptance scenarios PASS, each with evidence (screenshot or test output)
- [ ] Full test suite green (command + counts)
- [ ] Lint / type check / build green
- [ ] Code review done, no open CRITICAL/IMPORTANT findings
- [ ] Security review done if auth, input, secrets or personal data were touched
- [ ] AI docs updated (`AGENTS.md`, `docs/ai/`, ADRs) via `octo-ai-context`
- [ ] No secrets, debug output or temp files in the diff
- [ ] Committed on a feature branch (branch recorded; the DoD ships in that commit)
- [ ] Every extra DoD criterion listed in the instructions block (company or repo specific)

## With finishing
- The DoD must say `CONCLUÍDO` (DONE) before the final commit (`octo-autonomous-finish`), and it goes **in** that
  commit, screenshots included. The document records the branch; the commit hash goes in the final
  summary (never amend just to write the hash).
- Link the DoD in the final summary and in any PR description.
- Screenshots must not contain real personal data or secrets. Use test data; blur or retake if needed.
