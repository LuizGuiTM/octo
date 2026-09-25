---
name: octo-review
description: "Command /octo-review [base]: reviews the current branch's diff with superpowers' code reviewer plus Octo's domain checks, splitting large diffs across parallel reviewers. Only when the user invokes it."
argument-hint: "[base branch or commit, default: the merge base with the main branch]"
disable-model-invocation: true
---

# /octo-review

1. Determine the range: the argument, or the merge base with the default branch → `HEAD` plus uncommitted changes.
2. Run `octo-discovering-skills` for `requesting-code-review` (domain reviewers: Apex, React, SQL, security…).
3. Follow superpowers `requesting-code-review` with its `code-reviewer.md` template, on `octo-worker-deep`,
   passing the matching catalog paths. Octo addition: for large diffs (> ~800 lines), split by area
   (backend, frontend, metadata…) and dispatch one reviewer per area in parallel.
4. Present the findings ranked by severity and offer to fix them; `receiving-code-review` rules apply.
