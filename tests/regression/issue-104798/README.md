# Issue 104798: verification

Issue: https://github.com/Expensify/App/issues/104798

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Regression-tested fix.

The incremental LHN pass reconsiders only changed keys. A hidden transaction thread and its parent share one row, but only the thread key changes. The Unread flag also passes no thread to isUnread.

## Recommended change

Add the parent key to the incremental pass only when report attributes identify the updated report as its single transaction thread. Deduplicate keys. Pass that thread into the existing unread helper in both full and incremental builds. Keep the existing mute rule.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/SingleExpenseThreadUnreadRegressionTest.ts`
- `tests/unit/SidebarUtilsTest.ts`

## Remaining verification

1. Check read, self-authored, muted, deleted-thread and multi-expense transitions in the app.
2. The focused test uses the real unread evaluator and an isolated thread-identification fixture.

## Rejected alternatives

A hook-only change would leave other callers inconsistent. Marking every parent unread would include unrelated threads or self-authored/read comments.
