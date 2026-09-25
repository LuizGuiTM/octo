---
name: python-project
description: "Use when writing or reviewing Python code: project layout, dependencies (uv/poetry/pip), typing, linting with ruff, and packaging conventions."
metadata:
  complements: [writing-plans, requesting-code-review]
---

# Python projects

## Tooling (use what the project already uses; these are the defaults for new ones)
- Environment and deps: `uv` (`uv sync`, `uv add <pkg>`, `uv run <cmd>`); otherwise the existing poetry/pip setup.
  Never install into the global interpreter.
- Lint and format: `ruff check --fix` and `ruff format`.
- Types: annotate public functions; check with `mypy` or `pyright` if configured.
- Tests: `pytest` (see `pytest-testing`).

## Code rules
- `src/` layout for packages; modules small and focused; no logic at import time.
- Type hints everywhere public; use `dataclass`/`pydantic` models for structured data, not dicts.
- Explicit exceptions: define domain exceptions; never use a bare `except:`; don't swallow errors.
- Paths with `pathlib`; timestamps timezone-aware (`datetime.now(tz=UTC)`).
- Config from environment (pydantic-settings or similar) validated at startup.
- Logging via the `logging` module (structured if the project does), not `print`.
- Avoid mutable default arguments; prefer pure functions for business logic.

## Dependencies
- Add dependencies with the project tool so the lockfile updates; justify new ones in the plan.
- Run `pip-audit` when adding dependencies.

## Review checks
- [ ] Types are consistent, no `Any` leaks in public APIs.
- [ ] Resources closed (`with` blocks); no blocking I/O in async code.
- [ ] `ruff` and type checks pass.
