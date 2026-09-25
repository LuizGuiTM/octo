---
name: security-review
description: "Use when code handles authentication, authorization, user input, secrets, file uploads, external calls, or personal data, and in every review phase for such changes. OWASP-oriented checklist with concrete checks."
metadata:
  complements: [brainstorming, requesting-code-review, receiving-code-review]
---

# Security review

## Checklist by area
**Input and output**
- [ ] All external input is validated at the boundary (schema/type, length, format, allow-lists).
- [ ] Queries are parameterized (SQL, SOQL bind variables, NoSQL filters); no string concatenation.
- [ ] Output is encoded for its context (HTML, attributes, URLs, JS). No `dangerouslySetInnerHTML`/`innerHTML` with user data.
- [ ] Shell and file paths are never built from raw input; no path traversal (`..`).

**AuthN / AuthZ**
- [ ] Every endpoint/action checks authorization server-side, per object (no IDOR: user A can't read B's record by changing an id).
- [ ] Least privilege for tokens, service accounts, and integration users.
- [ ] Sessions/tokens expire; logout invalidates them; tokens aren't stored in `localStorage` when avoidable.

**Secrets and data**
- [ ] No secrets in code, logs, error messages, or client bundles. Use env/secret stores.
- [ ] Personal data is minimized, not logged, and encrypted at rest/in transit where required (LGPD).
- [ ] Error responses don't leak stack traces or internal ids to users.

**Dependencies and config**
- [ ] New dependencies are maintained and pinned; run the stack's audit (`npm audit`, `pip-audit`).
- [ ] CORS, CSP, cookies (`HttpOnly`, `Secure`, `SameSite`) are set deliberately.
- [ ] Rate limiting on auth and expensive endpoints.

**Outbound calls**
- [ ] No SSRF: URLs from users are validated against an allow-list.
- [ ] Timeouts and retries with backoff; TLS verification on.

## Reporting
Report each issue as CRITICAL/IMPORTANT with a concrete exploit scenario (attacker input → impact)
and the minimal fix. Never include working exploit payloads against real systems.
