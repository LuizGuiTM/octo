---
name: octo-mcp-azure-devops
description: "Use when finishing work on an Azure DevOps repository and open-pr.mjs could not create the pull request (az CLI missing or not signed in), or when a task references an Azure DevOps work item. Creates the draft PR and reads work items through Microsoft's Azure DevOps MCP server."
metadata:
  complements: [finishing-a-development-branch, brainstorming]
---

# Azure DevOps through MCP

The `azure-devops` MCP server (Microsoft, remote) works with the user's Microsoft account: no `az` CLI, no PAT.
The first call may open a browser sign-in; tell the user in one line ("vou pedir login na sua conta Microsoft
para abrir o PR").

## Open the pull request
Use it when `open-pr.mjs` already pushed the branch but printed "PR not created automatically":
1. Find the server's tool for creating pull requests (repositories tools; typically named like
   `repo_create_pull_request`). Read its input schema; don't guess argument names.
2. Create it with: the repository and project from `origin`, source branch = the current work branch, target =
   the base branch `open-pr.mjs` printed, title = the final commit's summary, description = the filled
   `templates/pull-request.md` of `octo-autonomous-finish`, and **draft** when the autonomy policy says draft.
3. Report the PR URL the tool returns. If the tool fails (permissions, sign-in refused), give the user the
   one-click link `open-pr.mjs` printed instead. Don't retry in a loop.

## Work items
If the request mentions a work item (e.g. "#12345" or "AB#12345"), read it with the server's work-item tool
before brainstorming or debugging, and link it in the PR description.
