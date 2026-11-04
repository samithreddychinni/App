# Issue 104750: verification

Issue: https://github.com/Expensify/App/issues/104750

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Corrected and regression-tested fix.

Approval guards treat pending or scanning expenses specially but omit scan-failed expenses with missing fields. Existing callers also differ in how they block active scans.

## Recommended change

Add hasOnlyUnsettledOrPendingExpenses using the existing isExpenseValueUnsettled and isPending helpers. Use it in report, preview, primary and secondary approval decisions. Keep existing active-scan restrictions. Place the secondary guard before duplicate-expense exceptions can return Approve.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/FailedScanApprovalRegressionTest.ts`
- `tests/unit/ReportPrimaryActionUtilsTest.ts`
- `tests/unit/ReportSecondaryActionUtilsTest.ts`

## Remaining verification

1. Verify the live preview, report header, Search row and secondary menu.
2. Check a report with complete and failed expenses against backend splitting behavior.

## Rejected alternatives

Blocking when any expense failed would prevent approval of the complete expenses in a mixed report. Replacing all existing scanning checks would broaden behavior beyond this bug.
