# Regression Verification Protocol: Issue #105173

## Issue Summary
**Issue**: [#105173](https://github.com/Expensify/App/issues/105173) - `[$175] App crashes when entering multi-selection mode on an edited report`

## Root Cause
In `src/hooks/useSearchBulkActions.ts` (lines 1216, 2686, 3171, and 3286), `searchResults?.search.type` is accessed using optional chaining only on `searchResults`, but not on `search`:
```typescript
const exportSearchType = searchResults?.search.type ?? queryJSON?.type;
const isExpenseReportSearch = isExpenseReportType || searchResults?.search.type === CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT;
const isExpenseSearch = queryJSON?.type === CONST.SEARCH.DATA_TYPES.EXPENSE || searchResults?.search.type === CONST.SEARCH.DATA_TYPES.EXPENSE;
if (selectedTransactionsKeys.length < 3 && searchResults?.search.type !== CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT && searchResults?.data) { ... }
```

When an expense is edited directly from the Inbox without having previously navigated to the Search/Spend tab in the current session:
1. `UpdateMoneyRequest.ts` merges `{data: optimisticSnapshotData}` into the search snapshot collection (`ONYXKEYS.COLLECTION.SNAPSHOT`).
2. This creates a partial snapshot entry in Onyx where `data` is defined, but `search` is `undefined`.
3. On narrow layouts / iOS, `SearchPageNarrow` is mounted in the background. When entering mobile selection mode (`ONYXKEYS.MOBILE_SELECTION_MODE`), `SearchBulkActionsButton` renders and invokes `useSearchBulkActions`.
4. Because `searchResults` has `data` populated, `searchResults?.search` evaluates to `undefined`, and accessing `.type` throws an unhandled `TypeError: Cannot read property 'type' of undefined`, crashing the app into the top-level error boundary.

## Fix
Add optional chaining to the `.search` access across all four call sites in `src/hooks/useSearchBulkActions.ts`:
```typescript
const exportSearchType = searchResults?.search?.type ?? queryJSON?.type;
const isExpenseReportSearch = isExpenseReportType || searchResults?.search?.type === CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT;
const isExpenseSearch = queryJSON?.type === CONST.SEARCH.DATA_TYPES.EXPENSE || searchResults?.search?.type === CONST.SEARCH.DATA_TYPES.EXPENSE;
if (selectedTransactionsKeys.length < 3 && searchResults?.search?.type !== CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT && searchResults?.data) { ... }
```

## Verification Protocol

### Test Case 1: Enter multi-selection mode after editing an expense on fresh launch
1. Fresh launch the app on iOS or mobile web narrow layout (do NOT open the Spend/Search tab).
2. Open an expense report with multiple expenses from the Inbox tab.
3. Edit fields on one or more expenses (e.g. amount, category, or description) and save.
4. Long-press one of the expenses.
5. Tap **Select** at the bottom to enter multi-selection mode.
6. **Expected**: The app smoothly transitions into multi-selection mode without crashing or freezing.

### Test Case 2: Multi-selection and bulk actions in regular Search view
1. Navigate to the Search/Spend tab.
2. Select one or more transactions to enter selection mode.
3. Verify bulk actions (Export, Pay, Merge, Download receipts) continue to function as expected.
