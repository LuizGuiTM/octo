---
name: node-api
description: "Use when building or changing a Node.js/TypeScript backend service (Express, Fastify, NestJS): routes, validation, error handling, config, logging, and API tests."
metadata:
  complements: [writing-plans, test-driven-development, requesting-code-review]
---

# Node.js API services

## Layering
`route/controller` (HTTP only) → `service` (business rules, no HTTP types) → `repository/client` (I/O).
Follow the project's existing layout if it differs, but keep HTTP concerns out of business logic.

## Rules
- Validate every request at the edge with a schema (Zod, TypeBox, class-validator) and infer types from it.
- Central error handler: domain errors map to status codes; unknown errors → 500 with a generic
  message and a logged correlation id.
- `async` handlers must propagate rejections to the error handler (Express 4 needs a wrapper; Fastify, NestJS
  and Express 5 handle it).
- Config from env, validated once at startup; fail fast on missing values. No `process.env` reads scattered in code.
- Structured logging (pino or similar) with request ids; never log secrets, tokens, or PII.
- Timeouts on every outbound call; close DB pools and servers on `SIGTERM` (graceful shutdown).
- Prefer `node:` built-ins and the platform `fetch` over new dependencies.

## Tests
- Service logic: unit tests with fakes for repositories.
- HTTP: integration tests through the app instance (Supertest, `fastify.inject`) covering the success
  path, validation errors, auth failures and not-found.
- DB: test against a real database (Testcontainers or the project's test DB), not mocks, for queries.

## Review checks
- [ ] No unhandled promise paths; no floating promises.
- [ ] N+1 queries avoided; pagination on list endpoints.
- [ ] Authorization checked in the service for each resource access.
