# Regression Verification Protocol: Issue #105525

## Issue Summary
**Issue**: [#105525](https://github.com/Expensify/App/issues/105525) - `[Exploratory] Personal card-Cannot switch transaction start date to "From the beginning"`

## Root Cause
In `src/pages/settings/Wallet/PersonalCardEditTransactionStartDatePage.tsx`:
1. `dateOptionSelected` state was unconditionally initialized to `CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM` (`line 50`). When a card had no `scrapeMinDate` (i.e. was set to "From the beginning"), opening the edit transaction start date page incorrectly highlighted "Custom start date" instead of "From the beginning".
2. In `getNewStartDate()` (`lines 73-76`), selecting `CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING` computed and returned a hardcoded date 90 days in the past (`subDays(new Date(), 90)`) instead of empty string `''`.
   In Expensify's architecture (as seen in `PersonalCardDetailsHeaderMenu.tsx`, `CompanyCardTransactionStartDateForm.tsx:88`, and `WorkspaceCompanyCardEditTransactionStartDatePage.tsx`), empty string `''` represents "From the beginning" and clears `scrapeMinDate`. By returning a 90-day-old date string, `updateAssignedCardTransactionStartDate` wrote that date to `card.scrapeMinDate`, causing `PersonalCardDetailsHeaderMenu` to format and display that date rather than "From the beginning".

## Fix
1. In `src/pages/settings/Wallet/PersonalCardEditTransactionStartDatePage.tsx`:
   - Initialize `dateOptionSelected` to check `currentStartDate`: if present, select `CUSTOM`; if falsy (`undefined` or `''`), select `FROM_BEGINNING`.
   - Update `getNewStartDate()` to return `''` when `dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING`, and `startDate` when `CUSTOM`.
   - Compare `(currentStartDate ?? '') !== newStartDate` in `submit()` to avoid redundant API write calls when already set to "From the beginning".
   - Removed unused `subDays` import from `date-fns`.

## Verification Protocol

### Test Case 1: Switching to "From the beginning"
1. Navigate to Settings > Wallet > click on an existing Personal Card.
2. Ensure the card has a custom transaction start date (e.g. yesterday's date).
3. Tap "Transaction start date" to open the edit page.
4. Select "From the beginning".
5. Click "Save".
6. **Expected**: The Personal Card details page displays "From the beginning" as the transaction start date.

### Test Case 2: Reopening when set to "From the beginning"
1. Following Test Case 1 (where the card start date is "From the beginning"), tap "Transaction start date" again.
2. **Expected**: "From the beginning" is selected by default with a checkmark, not "Custom start date".
3. Tap "Custom start date".
4. **Expected**: Date picker appears initialized to today's date, and selecting a date and saving updates the card to the custom date.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/PersonalCardEditTransactionStartDateRegressionTest.ts
```
Expected: 9 passing tests.
