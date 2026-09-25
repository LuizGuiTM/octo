---
name: octo-mcp-_example
description: "Use before exploring unfamiliar code, when planning a change that touches several modules, when debugging across module boundaries, and when estimating the impact of a diff in review. Queries the code knowledge graph MCP server instead of grepping blindly."
metadata:
  complements: [brainstorming, writing-plans, systematic-debugging, requesting-code-review]
---

# Querying the code graph (example)

1. Ask the graph first: which modules own X, who calls Y, what depends on Z, which community a
   file belongs to. Prefer narrow questions (one symbol or module at a time).
2. Confirm every answer in the code (`path:line`) before relying on it; graphs can be stale.
3. If the graph is stale (files missing, old names), rebuild it with the tool's command and note it in
   the session file.
4. Put the relevant graph facts into subagent prompts so they don't re-explore.
