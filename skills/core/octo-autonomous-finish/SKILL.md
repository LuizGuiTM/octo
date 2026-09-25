---
name: octo-autonomous-finish
description: "Use together with finishing-a-development-branch, and at the end of any task, even small ones that skipped the full workflow. Applies the company autonomy policy: update AI docs, commit on a feature branch without asking, and only then offer push/PR/merge according to the policy."
metadata:
  complements: [finishing-a-development-branch, verification-before-completion]
---

# Autonomous finish

Octo aims for Devin-style closure: the task ends **committed**, not "ready for you to commit". The
policy values (commit / push / PR / protected branches / branch prefix) are in the instructions block.

## Order of operations
1. **verification-before-completion**, as written: fresh evidence, all green. If anything is red, stop
   and report. Don't commit red work unless your partner says so.
2. **Definition of Done**: when there's a spec/plan, `octo-definition-of-done` must produce a DoD document
   with status `DONE` (every scenario with a screenshot or test evidence). `NOT DONE` → no commit;
   report what's missing.
3. **AI docs**: `octo-ai-context` in record mode (new commands, gotchas, ADRs). Mark the spec as implemented.
4. **Hygiene**: remove debug output, temp files and screenshots outside the DoD folder; check `git status` for files you
   didn't intend; never stage secrets (`.env`, keys, tokens).
5. **Commit** (when the policy enables it, without asking):
   - On a protected branch? First create a work branch with the pattern from the instructions block's Git
     section (e.g. `feature/<topic>-octo`). Never commit to a protected branch.
   - Stage explicit paths, including the DoD folder (document + screenshots). Don't use a blind `git add -A`.
   - If the diff touches configuration or anything credential-like, apply the catalog skill
     `security/secrets/secret-scanning` before staging.
   - Conventional Commits in the artifact language (types and rules in the catalog skill
     `engineering/git/conventional-commit`, when that domain is enabled):
     ```
     <type>(<scope>): <imperative summary ≤ 72 chars>

     <why, 1-3 lines>
     Spec: docs/superpowers/specs/<file>.md
     Plan: docs/superpowers/plans/<file>.md
     DoD: docs/superpowers/dod/<date>-<topic>/DoD.md
     ```
   - Add the attribution trailer your host requires, if any. Never `--no-verify`; if a hook fails, fix
     the cause and commit again.
   - Subagent-driven work may already have per-task commits: then commit only the remaining changes
     (docs, fixes) and don't squash without asking.
6. **finishing-a-development-branch**, adjusted by policy:
   - PR enabled → fill `templates/pull-request.md` into a temp file (DoD link, test evidence, autonomous
     decisions from the session), then
     `node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs --title "<commit summary>" --body-file <file> [--draft]`
     (`--draft` when the policy says draft). It pushes and opens the PR on GitHub (`gh`) or Azure DevOps (`az`),
     detected from `origin`, and prints the URL. If it exits 1 (CLI missing, not authenticated, unknown host),
     report its output and the manual commands; the branch stays committed. Don't retry blindly.
   - Only push enabled → `node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs --push-only` and report it.
     Never run `git push` directly: the guardrails only pre-approve the script, which can't force-push.
   - Disabled → present superpowers' options. The work is already committed, so "keep the branch" is the
     safe default. Merging into a protected branch and discarding work always need explicit confirmation.
7. **Summary** to your partner (response language, ≤ 10 lines): what changed (user-visible first), evidence
   (tests, web scenarios, link to the DoD), branch and commit hash, decisions you took autonomously, follow-ups, and
   new `.octo/skill-requests.md` entries.

## When commits are disabled
Leave everything uncommitted, show `git status --short`, and give the ready-to-use commit message.

## Files in this skill
| File | Use |
|---|---|
| `scripts/pre-commit-check.mjs` | `node .claude/skills/octo-autonomous-finish/scripts/pre-commit-check.mjs`, after staging: blocks protected branches, staged protected paths, secret-looking lines and stray screenshots. Never commit while it fails |
| `scripts/open-pr.mjs` | Push + open the PR on GitHub or Azure DevOps (`--title`, `--body-file`, `--base`, `--draft`, `--dry-run`) |
| `templates/pull-request.md` | PR description, when the policy allows opening PRs |
