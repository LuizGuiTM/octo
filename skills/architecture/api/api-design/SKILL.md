---
name: api-design
description: "Use when designing or changing an HTTP/REST API, webhook, or integration contract (new endpoints, request/response shapes, versioning, errors, pagination)."
metadata:
  complements: [brainstorming, writing-plans, requesting-code-review]
---

# API design

## Contract first
Write the contract in the spec before implementing: method, path, auth, request schema, response
schema, errors, and an example for each. If the project has OpenAPI, update it in the same change.

## Conventions
- Resources are plural nouns: `GET /orders/{id}`, `POST /orders`. Actions that aren't CRUD:
  `POST /orders/{id}/cancel`.
- Status codes: 200 read/update, 201 create (+ `Location`), 204 no body, 400 validation, 401 no auth,
  403 forbidden, 404 not found, 409 conflict, 422 semantic validation (if the project uses it), 429 rate limit, 5xx server.
- One error shape for the whole API, e.g. `{ "error": { "code": "ORDER_NOT_FOUND", "message": "...", "details": [...] } }`.
- Pagination: cursor-based for large or live collections (`?cursor=&limit=`), return `nextCursor`.
- Timestamps in ISO-8601 UTC; money as integer minor units + currency; ids as opaque strings.
- `PUT`/`DELETE` are idempotent; for `POST` that creates payments or orders, support an `Idempotency-Key`.

## Compatibility
- Adding optional fields is safe; removing/renaming fields or changing types is breaking.
- Breaking changes need a new version (`/v2` or a header) and a deprecation window, and must be
  called out in the spec as a user decision.

## Tests
- Contract tests for each status code in the contract, including auth failures.
- Validation tests for boundary values.
