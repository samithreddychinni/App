# Issue 105008: verification

Issue: https://github.com/Expensify/App/issues/105008

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Regression-tested fix.

dateStateSelector returns raw getCreated output. Both the editable picker and read-only row consume it, so both can receive a timestamp.

## Recommended change

Use getFormattedCreated in the shared selector. Keep the stored transaction timestamp and startSplitBill unchanged. This also keeps date comparisons consistent with the date picker.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/components/MoneyRequestConfirmationList/DateSelectorRegressionTest.ts`

## Remaining verification

1. Verify creator and participant views after a failed scan.
2. Check a timezone west of UTC around midnight.

## Rejected alternatives

Formatting only the read-only row misses the editable branch. Changing stored transaction dates broadens the fix and can lose time information.
