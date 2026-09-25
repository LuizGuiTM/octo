---
name: apex-development
description: "Use when writing or reviewing Apex classes, triggers, batch/queueable/scheduled jobs, SOQL/SOSL, or Apex tests in a Salesforce DX project."
metadata:
  complements: [writing-plans, test-driven-development, systematic-debugging, requesting-code-review]
---

# Apex development

## Bulkification and governor limits
- Code must handle 200 records per trigger invocation. Never put SOQL, DML, or callouts inside loops.
- Collect ids into a `Set<Id>`, query once into a `Map<Id, SObject>`, and do DML on lists.
- Know the per-transaction limits (SOQL queries, DML statements, CPU time, heap). For big volumes use
  Batch Apex or Queueable (chainable), not a loop in a trigger.
- Selective SOQL: filter on indexed fields, select only needed fields, and use `LIMIT` where it makes sense.

## Triggers
- One trigger per object, with no logic in it: delegate to a handler class (follow the project's trigger
  framework if one exists).
- Handle every context you register for (before/after × insert/update/delete/undelete) explicitly.
- Guard against recursion when updates re-fire the trigger.

## Security
- Declare sharing explicitly: `with sharing` by default; `without sharing` only with a comment explaining why.
- Enforce CRUD/FLS: `WITH USER_MODE` in SOQL and `Database.insert(records, AccessLevel.USER_MODE)`, or
  `Security.stripInaccessible` when needed.
- SOQL with user input uses bind variables (`:var`); for dynamic SOQL use `Database.queryWithBinds`,
  never string concatenation. Escape with `String.escapeSingleQuotes` only as a last resort.
- Secrets and endpoints go in Named Credentials, never in code or custom settings in clear text.

## Tests
- `@IsTest` classes with `@TestSetup` data built by a test data factory. Never use `SeeAllData=true`.
- Wrap the action in `Test.startTest()`/`Test.stopTest()` (resets limits, runs async jobs).
- Assert outcomes with `Assert.areEqual`/`Assert.isTrue` and messages. Coverage without assertions is not a test.
- Test bulk (200 records), a negative path, and a restricted user via `System.runAs`.
- Mock callouts with `HttpCalloutMock`; the org requires ≥ 75% coverage to deploy, but target the behavior.
- Run: `sf apex run test --class-names MyClassTest --result-format human --code-coverage --wait 10`.

## Review checks
- [ ] No SOQL/DML in loops; no hard-coded ids or URLs.
- [ ] Sharing and CRUD/FLS are enforced.
- [ ] Errors surface usefully (`addError` on records in triggers, custom exceptions elsewhere).
