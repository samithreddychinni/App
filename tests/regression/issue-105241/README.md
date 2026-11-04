# Regression Verification Protocol: Issue #105241

## Issue Summary
**Issue**: [#105241](https://github.com/Expensify/App/issues/105241) - `[$175] Netsuite-Tapping < twice from "Export company card expenses as" leads to "Card details" page`

## Root Cause
In `src/pages/workspace/accounting/netsuite/export/NetSuiteExportConfigurationPage.tsx:56-59`, `shouldGoBackToSpecificRoute` was calculated using a disjunction:
```typescript
const shouldGoBackToSpecificRoute =
    config?.reimbursableExpensesExportDestination === CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT ||
    config?.nonreimbursableExpensesExportDestination === CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT;
```
Because reimbursable expenses in NetSuite typically default to `EXPENSE_REPORT`, `shouldGoBackToSpecificRoute` evaluated to `true` even when company cards (`nonreimbursableExpensesExportDestination`) were configured to export as `JOURNAL_ENTRY` or `VENDOR_BILL`.
When tapping `<` from `NetSuiteExportConfigurationPage`, `goBackFromExportConnection` saw `shouldGoBackToSpecificRoute === true`, stripped the card account mapping route from the back stack, and navigated directly to **Card details** instead of **NetSuite journal entries export** (or vendor bills export).

## Fix
In `src/pages/workspace/accounting/netsuite/export/NetSuiteExportConfigurationPage.tsx`, determine `shouldGoBackToSpecificRoute` using the effective company card export destination (`config?.nonreimbursableExpensesExportDestination ?? config?.reimbursableExpensesExportDestination`), matching `companyCards/utils.tsx:314` and `DynamicSageIntacctExportPage.tsx:34-37`:
```typescript
const netSuiteConfig = config?.nonreimbursableExpensesExportDestination ?? config?.reimbursableExpensesExportDestination;
const shouldGoBackToSpecificRoute =
    netSuiteConfig !== CONST.NETSUITE_EXPORT_DESTINATION.VENDOR_BILL && netSuiteConfig !== CONST.NETSUITE_EXPORT_DESTINATION.JOURNAL_ENTRY;
```

## Verification Protocol

### Test Case 1: Back navigation after selecting Journal entries
1. Connect a workspace to NetSuite in Accounting.
2. Navigate to Workspace > Company cards.
3. Open an assigned card and click "NetSuite vendor bills export" row.
4. Click the hyperlinked "export options" in the subheader.
5. In "Export company card expenses as", tap "Export as" and select "Journal entries".
6. Tap `<` once (returns to NetSuite export configuration page).
7. Tap `<` a second time.
8. **Expected**: User lands on the "NetSuite journal entries export" page with account lists, NOT the "Card details" page.

### Test Case 2: Back navigation when exporting as Expense report
1. In "Export company card expenses as", change export destination to "Expense report".
2. Tap `<` twice.
3. **Expected**: Because Expense reports have no per-card account mapping, user correctly lands on "Card details" page.
