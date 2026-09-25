---
name: fastapi-services
description: "Use when building or changing a FastAPI service: routers, Pydantic models, dependencies, async I/O, error handling, and API tests with TestClient/httpx."
metadata:
  complements: [writing-plans, test-driven-development, requesting-code-review]
---

# FastAPI services

## Structure
- `routers/` (HTTP only) → `services/` (business rules) → `repositories/` or clients (I/O).
- Pydantic models for request and response (`response_model`), separate from ORM models.
- Dependencies (`Depends`) for DB sessions, auth, and settings; override them in tests.

## Rules
- `async def` endpoints only when the whole call chain is async (async DB driver, `httpx.AsyncClient`).
  Blocking libraries go in `def` endpoints or `run_in_threadpool`.
- Validation is Pydantic's job; business rule violations raise domain exceptions mapped to responses by
  exception handlers (consistent error body, see `api-design`).
- Auth via a dependency that returns the current user; authorization checked in the service per resource.
- Lifespan handler for startup/shutdown of pools and clients.
- Settings via `pydantic-settings`, loaded once.

## Tests
- `TestClient` (sync) or `httpx.AsyncClient` with `ASGITransport` (async) against the app.
- Override dependencies (`app.dependency_overrides`) to inject a test DB or fake clients, and reset them after each test.
- Cover success, validation (422), auth (401/403) and not-found for each endpoint.
- Real database for repository tests (test container or transaction rollback per test).

## Verify
Run the tests, `ruff`, and the type checker; start the app (`uvicorn app.main:app --reload`) and check
`/docs` renders the updated schema.
