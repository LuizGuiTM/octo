---
name: react-components
description: "Use when writing or reviewing React components, hooks, client state, forms, or component tests (React Testing Library / Vitest / Jest)."
metadata:
  complements: [writing-plans, test-driven-development, requesting-code-review]
---

# React components

## Structure
- Function components and hooks only. One component per file when it's exported; co-locate its test
  (`Button.test.tsx`) and styles.
- Props are typed (TypeScript) and minimal. Pass data, not whole stores. Avoid boolean-prop explosions;
  prefer composition (`children`, slots).
- Derive, don't sync: compute values from props/state during render instead of mirroring them in
  `useState` + `useEffect`.
- `useEffect` is for synchronizing with external systems only (subscriptions, DOM APIs, network when
  there's no data library). Every effect with a subscription returns a cleanup.
- Server data goes through the project's data layer (TanStack Query, SWR, RSC, loaders), not ad-hoc
  fetch-in-effect.

## Rules of hooks and performance
- Hooks at top level, never conditional. Complete dependency arrays; fix lint warnings, don't silence them.
- Stable `key`s from data ids, never array indexes for dynamic lists.
- Add `memo`/`useMemo`/`useCallback` only for a measured problem or referential stability a child needs
  (unless the React Compiler is enabled, in which case skip them).

## Accessibility (non-negotiable)
- Semantic elements (`button`, `a`, `label`, `nav`, headings in order).
- Every input has a label; errors are linked with `aria-describedby`.
- Keyboard: everything clickable is focusable and operable; visible focus; modals trap and restore focus.
- Images have `alt`; icons-only buttons have `aria-label`.

## Tests (React Testing Library)
- Query like a user: `getByRole`, `getByLabelText`, `getByText`. Avoid `getByTestId` unless no role fits.
- Interact with `userEvent`, and assert visible outcomes.
- Mock the network at the boundary (MSW) rather than mocking hooks.
- Cover loading, empty, error and success states.
Rendered flows across pages are covered by `octo-web-testing`.
