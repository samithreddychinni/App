# Issue 104993: verification

Issue: https://github.com/Expensify/App/issues/104993

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Hold: the reported near-zero total has not been reproduced.

Page selection and all-matching selection use different total sources. That is necessary when results are unloaded. The issue discussion still requires reproduction and notes a possible backend problem. Current client code already includes reportCount handling absent from older analysis.

## Recommended change

Capture the Search requests and responses on an affected account. Compare filtered rows, count/reportCount, currency and full server total before changing the client. Keep the backend total authoritative for unloaded results. The branch protects the totals-request contract and gives an exact reproduction matrix.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/ReportSearchTotalsContractTest.ts`

## Remaining verification

1. Needs an affected large account and server response evidence.
2. Check expense and expense-report searches, page two, saved searches, refunds, exclusions and mixed currencies.

## Rejected alternatives

Summing loaded rows cannot fix an all-matching total. Changing the backend sign convention without its aggregation query and response evidence is speculative. A pagination asymmetry alone does not prove the $0.02 root cause.
