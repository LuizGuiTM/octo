---
name: lwc-development
description: "Use when building or reviewing Lightning Web Components (LWC): wire adapters, Apex calls, events, Lightning Data Service, styling with SLDS, and Jest tests with sfdx-lwc-jest."
metadata:
  complements: [writing-plans, test-driven-development, requesting-code-review]
---

# Lightning Web Components

## Data access (prefer in this order)
1. Base components that use Lightning Data Service (`lightning-record-form`, `lightning-record-edit-form`).
2. LDS wire adapters (`getRecord`, `getFieldValue`, `updateRecord` from `lightning/uiRecordApi`). They are
   cached, respect FLS, and keep components in sync.
3. Apex with `@AuraEnabled(cacheable=true)` via `@wire` for reads; imperative calls for writes, then
   `notifyRecordUpdateAvailable(...)` or `refreshApex` to refresh.
- Import fields with schema references (`import NAME from '@salesforce/schema/Account.Name'`), not
  strings, so the platform tracks dependencies.

## Component rules
- `@api` for public properties (treat them as read-only inside the component); reactive fields for internal state.
- Communicate child → parent with `CustomEvent` (lowercase names, no `on` prefix); across the DOM tree
  use Lightning Message Service.
- Handle the `{ data, error }` of every wire; show spinners and errors with `lightning-spinner` and toast
  (`ShowToastEvent`) or inline messages.
- Use SLDS classes and base components before custom CSS. Label user-facing text with Custom Labels
  (`@salesforce/label/...`) for translation.
- Expose via `js-meta.xml` targets only where needed.

## Tests (Jest)
- `npm run test:unit` (sfdx-lwc-jest). Create the element with `createElement`, append to `document.body`,
  and clean up the DOM in `afterEach`.
- Emit wire data with the test wire adapters (`getRecord.emit(mock)`), and mock Apex imports with `jest.mock`.
- `await Promise.resolve()` (or flush promises) after changes before asserting on the DOM.
- Cover loading, data, empty and error states and dispatched events.

## Verify in the org
Deploy to a scratch org/sandbox and run `octo-web-testing` on the Lightning page that hosts the component.
