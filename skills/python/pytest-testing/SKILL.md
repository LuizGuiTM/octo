---
name: pytest-testing
description: "Use when writing, fixing, or reviewing Python tests with pytest: fixtures, parametrization, mocking, async tests, and flaky-test diagnosis."
metadata:
  complements: [test-driven-development, systematic-debugging]
---

# pytest

## Layout and running
- Tests in `tests/` mirroring the package; files `test_*.py`, functions `test_<behavior>`.
- Run one: `pytest tests/path/test_x.py::test_name -q`; stop at first failure: `-x`; re-run failures: `--lf`.
- Shared fixtures in `conftest.py` at the narrowest directory that needs them.

## Practices
- Arrange-act-assert, one behavior per test, and plain `assert` statements (pytest rewrites them).
- `@pytest.mark.parametrize` for input tables instead of loops inside tests.
- Fixtures over setup methods; use `yield` fixtures for teardown; keep scope `function` unless setup is
  expensive and stateless.
- Built-ins: `tmp_path` for files, `monkeypatch` for env/attributes, `caplog` for logs,
  `pytest.raises(Error, match=...)` for exceptions.
- Mock at boundaries with `unittest.mock`/`pytest-mock` (`mocker.patch("module.where.used")`, patched where
  the name is **looked up**, not where it's defined).
- Async: `pytest-asyncio` (or `anyio`) with the mode the project configures.
- Time: freeze it (`freezegun`/`time-machine`) instead of sleeping.

## Flaky tests
Common causes: shared state between tests, order dependence (run with `-p randomly` if installed),
real time or network, and un-awaited coroutines. Fix the cause; don't add retries.

## Coverage
`pytest --cov=<pkg> --cov-report=term-missing` when configured; use it to find untested behavior,
not as a target by itself.
