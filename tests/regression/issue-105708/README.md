# Regression Verification Protocol: Issue #105708

## Issue Summary
**Issue**: [#105708](https://github.com/Expensify/App/issues/105708) - `[$175] [Sentry: APP-NM1] Web: getSystemMessageDisplayState calls Array.toReversed, crashes on Chrome < 110`

## Root Cause
In `src/libs/ReportActionsUtils.ts:726`:
```typescript
const chronologicalActions = isNewestFirst ? reportActions.toReversed() : reportActions;
```
`Array.prototype.toReversed` is an ES2023 method introduced in Chrome 110, Safari 16, and Firefox 115.
Expensify's web bundle does not polyfill newer ECMAScript array prototype methods.
When a user on an older browser (such as Chrome 109 on Windows, which generated the Sentry error APP-NM1) opens any report where actions arrive newest first (e.g. from `/search/view/:reportID` or `/r/:reportID`), `getSystemMessageDisplayState` is called synchronously during component render in `useReportActionsPresentation.ts:30`.
Calling `reportActions.toReversed()` throws `TypeError: e.toReversed is not a function`, which escapes to React's top-level error boundary and crashes the screen.

## Fix
1. In `src/libs/ReportActionsUtils.ts:726`:
   Replace `reportActions.toReversed()` with `[...reportActions].reverse()`.
   Spreading `[...reportActions]` creates a shallow copy, preventing mutation of the original Onyx-managed array, while `.reverse()` is supported across all browser versions.
2. In `oxlint.config.mts`:
   Add `toReversed`, `toSorted`, and `toSpliced` to `no-restricted-properties` under the source file rules to prevent future regressions.

## Verification Protocol

### Test Case: Open Report on Legacy Browser Engine
1. Launch the web app in Chrome 109 or in a browser session where `Array.prototype.toReversed` is undefined (or via browser console `delete Array.prototype.toReversed`).
2. Navigate to Search and open an expense or report where report actions are loaded newest-first.
3. **Expected**: The report renders normally with all system messages grouped/displayed properly. No fatal unhandled TypeError is thrown, and the application does not crash to the error boundary screen.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/GetSystemMessageDisplayStateToReversedRegressionTest.ts
```
Expected: 3 passing tests.
