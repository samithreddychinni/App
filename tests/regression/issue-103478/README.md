# Issue 103478: verification

Issue: https://github.com/Expensify/App/issues/103478

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Already addressed on the reviewed main revision; add regression coverage.

The old two-page flow saved the offset before the frequency. Current main now uses useSubmissionFrequencyDraft and saves frequency before offset. Its draft also distinguishes a saved Weekly offset from a Monthly date.

## Recommended change

Keep the current draft and request-order implementation. Add tests for Weekly Sunday offset 7 becoming Monthly day 1, a newly selected day 15, and reopening a saved Monthly day 15. Do not restore the obsolete setWorkspaceAutoReportingMonthlyOffset API from the queued proposal.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/MonthlySubmissionDraftRegressionTest.ts`

## Remaining verification

1. Exercise the Frequency and Date subpages against the server. Verify the request order and failure rollback, including offline changes, unchanged schedules and cancellation.

## Rejected alternatives

Blindly resending policy.autoReportingOffset can turn Sunday into the seventh day. Adding optimistic resets is unnecessary when current draft state already separates the two frequencies.
