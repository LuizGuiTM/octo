---
name: sf-deployment
description: "Use when retrieving, deploying, or validating Salesforce metadata with the sf CLI, working with scratch orgs or sandboxes, or preparing a release."
metadata:
  complements: [verification-before-completion, finishing-a-development-branch]
---

# Salesforce deployment (sf CLI)

**Never deploy to production or run destructive changes without asking the user.** Check the
target org with `sf org display` before every deploy.

## Orgs
- List: `sf org list`. The default org is in `.sf/config.json`; pass `--target-org <alias>` explicitly in scripts.
- Scratch org: `sf org create scratch --definition-file config/project-scratch-def.json --alias <alias> --duration-days 7 --set-default`.
- Open: `sf org open --target-org <alias>` (`--url-only` to get the URL for web testing).

## Source
- Deploy: `sf project deploy start --source-dir force-app --target-org <alias>` (or `--metadata ApexClass:MyClass`).
- Retrieve: `sf project retrieve start --metadata <Type:Name> --target-org <alias>`.
- Preview: `sf project deploy preview` / `sf project retrieve preview` to see what would change.

## Validation before release
- Validate without deploying: `sf project deploy validate --source-dir force-app --test-level RunLocalTests --target-org <alias>`.
- Quick deploy a validated job: `sf project deploy quick --job-id <id>`.
- Test levels: `RunLocalTests` for release validation; `RunSpecifiedTests --tests A B` for fast loops.
- Destructive changes use a `destructiveChanges.xml` manifest, and always need the user's explicit approval.

## Hygiene
- Don't commit `.sf/`, `.sfdx/`, or org-specific files; check `.forceignore`.
- Keep API versions consistent (`sourceApiVersion` in `sfdx-project.json`).
- Record the project's deploy/test commands in `AGENTS.md`.
