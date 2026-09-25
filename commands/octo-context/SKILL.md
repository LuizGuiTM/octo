---
name: octo-context
description: "Command /octo-context: creates or refreshes the AI docs (AGENTS.md, docs/ai/) from the code. Only when the user invokes it."
argument-hint: "[area to refresh, default: everything]"
disable-model-invocation: true
---

# /octo-context

Follow `octo-ai-context`: bootstrap mode if `AGENTS.md` is missing or has `octo:needs-context`, otherwise
refresh mode for the given area. Verify every command you document. Finish with a one-paragraph summary of
what changed and a commit (`docs: …`) per the autonomy policy.
