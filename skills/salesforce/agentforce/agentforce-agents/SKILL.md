---
name: agentforce-agents
description: "Use when designing, building or testing Agentforce agents: topics, instructions, agent actions (invocable Apex, flows, prompt templates), agent specs, and agent tests with the sf CLI."
metadata:
  complements: [brainstorming, writing-plans, verification-before-completion]
---

# Agentforce agents

The Agentforce tooling changes fast. Check `sf agent --help` and the installed plugin version before
relying on a command, and record the working commands in `AGENTS.md`.

## Design (in the spec)
- **Role and scope**: what the agent does and explicitly doesn't do.
- **Topics**: one per job to be done, each with a classification description (when it applies),
  a scope, and short, testable instructions. Avoid overlapping topics; overlaps cause misrouting.
- **Actions** per topic: prefer existing standard actions; custom actions via invocable Apex, autolaunched
  Flows, or Prompt Templates.
- **Guardrails**: what data the agent can read or change, and under which running user/permissions.
- **Test utterances**: for each topic, 5+ utterances that must route there and a few that must not.

## Actions
- Invocable Apex: `@InvocableMethod(label='…' description='…')` with `@InvocableVariable` inputs/outputs,
  clear descriptions (the planner reads them), bulk-safe, `with sharing`, and CRUD/FLS enforced.
- Return structured, concise outputs; the agent reasons over them.
- Unit-test every action like any Apex/Flow (see `salesforce/apex/salesforce-apex-quality` and `salesforce/apex/apex.instructions.md` in the catalog).

## Build and test with the CLI (verify names with --help)
- Generate a spec: `sf agent generate agent-spec` → review the YAML topics.
- Create the agent from the spec: `sf agent create --spec <file>`.
- Tests: generate a test spec (`sf agent generate test-spec`), create it (`sf agent test create`), and run it
  (`sf agent test run --api-name <name> --wait 10`), checking topic routing, action invocation and outcomes.
- Retrieve/deploy agent metadata with the rest of the project (`sf project retrieve start` / `deploy start`).

## Verify
- All agent tests pass in a sandbox/scratch org, never production.
- Try conversations in the org's agent preview and, when relevant, through the channel UI via
  `octo-web-testing`.
