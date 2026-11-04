# Issue 105010: verification

Issue: https://github.com/Expensify/App/issues/105010

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Original diagnosis rejected; current main already uses unique list identity.

The issue contains captured server data: names repeat but Onyx keys and orderWeight are unique. Empty names were not the cause. Current main has unique row keys and getTagListEntryByOrderWeight for reads and optimistic writes.

## Recommended change

Keep the current identity-based fix. Add a regression with duplicate Sub-projects labels, distinct keys and distinct GL-coded tags. Do not prepend invented headers to the uploaded CSV. Track the documented backend index-handling issues separately.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/DuplicateTagListIdentityRegressionTest.ts`
- `tests/actions/PolicyTagTest.ts`
- `tests/ui/WorkspaceTagsTest.tsx`

## Remaining verification

1. Import a no-header CSV with adjacent GL-code columns.
2. Verify rename, required/enabled toggles and GL-code updates after the server responds, not just optimistically.

## Rejected alternatives

Renaming headers would conceal the valid duplicate-name case and alter import semantics. Looking up by name still selects the first duplicate.
