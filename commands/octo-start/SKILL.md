---
name: octo-start
description: "Command /octo-start <what to build or change>: starts a new piece of work the Octo way (branch, session, AI context, brainstorming on the right path). Only when the user invokes it."
argument-hint: "<what you want to build or change>"
disable-model-invocation: true
---

# /octo-start

The user wants to start new work. Their request is the text after the command; if it's empty, ask for it
in one question.

1. **Context**: read `AGENTS.md`. If it has `octo:needs-context`, run `octo-ai-context` first (tell the user).
2. **Branch**: if on a protected branch, create a work branch named with the pattern in the instructions
   block's Git section (`{type}` = `feature` for new work), e.g. `feature/<short-topic>-octo`.
3. **Session**: `node .octo/bin/octo-session.mjs new "<topic>"`; if one is active for this branch, resume it instead.
4. **Discover**: run `octo-discovering-skills` for `brainstorming`.
5. **Brainstorm** with superpowers `brainstorming`. It classifies the request; record the path in the session
   (`phase: brainstorm`, and a Decisions line "path: spike | bounded | architectural"):
   - **Spike**: answer the question; nothing to plan or commit unless the user asks.
   - **Bounded**: short design in chat, approved per the autonomy policy. No spec file and no plan document.
     Write the acceptance scenarios (S1, S2…) into the session file, implement with test-driven-development,
     then `/octo-done` (the DoD takes its scenarios from the session and has no `--plan`).
   - **Architectural**: written spec, approved per the autonomy policy. Next command: `/octo-plan`.
6. Update the session (path, spec if any, next step) and tell the user the next command.
