---
name: nextjs-app-router
description: "Use when working in a Next.js project with the App Router (app/ directory): routes, layouts, Server and Client Components, Server Actions, route handlers, caching and data fetching."
metadata:
  complements: [writing-plans, subagent-driven-development, requesting-code-review]
---

# Next.js App Router

First check the version in `package.json` and read the project's existing patterns. Caching defaults
changed between major versions, so don't assume them.

## Server vs Client Components
- Components are Server Components by default. Add `'use client'` only at the leaf that needs state,
  effects, event handlers or browser APIs.
- Never import server-only code (DB clients, secrets) into client components; use `import 'server-only'`
  in those modules.
- Pass serializable props from server to client components.

## Data
- Fetch on the server, close to where it's used. Parallelize independent fetches with `Promise.all`.
- Mutations: Server Actions (`'use server'`) or route handlers (`app/api/**/route.ts`). Validate input with
  the project's schema library (e.g. Zod) inside the action. Server Actions are public endpoints, so
  check auth inside every one.
- After mutations, revalidate explicitly (`revalidatePath`/`revalidateTag`) according to the caching strategy used.

## Routing files
`page.tsx` (route UI), `layout.tsx` (shared shell, persists), `loading.tsx` (Suspense fallback),
`error.tsx` (client error boundary), `not-found.tsx`, `route.ts` (HTTP handler). Use `generateMetadata`
for SEO.

## Pitfalls
- Hydration mismatches: no `Date.now()`/`Math.random()`/`window` in server-rendered output.
- Environment variables exposed to the browser must start with `NEXT_PUBLIC_`. Anything else is server-only.
- Don't use `useEffect` fetching in a page that can fetch on the server.

## Verify
`next build` must pass (it type-checks and catches server/client boundary errors), then run
`octo-web-testing` against `next dev` or `next start`.
