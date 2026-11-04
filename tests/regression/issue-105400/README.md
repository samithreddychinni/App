# Regression Verification Protocol: Issue #105400

## Issue Summary
**Issue**: [#105400](https://github.com/Expensify/App/issues/105400) - `[$175] Composer-Left & right arrow keys doesn't work on report with only 1 expense`
**PR Fixed**: [#104836](https://github.com/Expensify/App/pull/104836) regression gaps.

## Root Cause
1. **Keypress focus in RHP (`ComposerWithSuggestions.tsx:824`)**:
   `checkComposerVisibility` checked `!!modal?.isVisible`. In `AuthScreens.tsx:107-110`, every RHP screen sets `Modal.setModalVisibility(true, CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED)` on focus. Consequently, `modal?.isVisible` is always true in the RHP, causing `checkComposerVisibility()` to always return `false`. When the composer loses focus, typing a character never refocused the composer.
2. **Missing keyboard shortcuts on Search reports (`MoneyRequestReportNavigation.tsx`)**:
   When opening a report from Search reports view, the route is `SEARCH_MONEY_REQUEST_REPORT`. In `MoneyReportHeader.tsx`, this route renders `MoneyRequestReportNavigation` (the report carousel) rather than `MoneyRequestReportTransactionsNavigation` (the expense carousel). While `MoneyRequestReportNavigation` rendered on-screen prev/next buttons, it registered no keyboard shortcuts for ArrowLeft and ArrowRight.
3. **Auto-focus suppression (`useShouldSkipComposerAutoFocus.ts`)**:
   `useShouldSkipComposerAutoFocus` only checked `hasExpenseCarousel` from transaction thread navigation IDs. On `SEARCH_MONEY_REQUEST_REPORT`, those IDs are absent, causing the composer to auto-focus and intercept keystrokes instead of allowing report paging.

## Verification Protocol

### Test Case 1: Keypress autofocus on RHP composer
1. Open any report and click an expense to open the RHP expense view.
2. Click into the composer, type text, and press ArrowLeft / ArrowRight. Confirm cursor moves within text and expense does not change.
3. Click an empty area of the expense view so the composer loses focus.
4. Type any letter on the keyboard.
5. **Expected**: The composer immediately gains focus and inserts the typed letter.

### Test Case 2: Left and right arrow keys in Search report view
1. Navigate to Search > Reports.
2. Open a report that has 1 expense (with multiple reports visible in the search results).
3. Confirm the composer is not auto-focused on opening.
4. Press ArrowRight.
5. **Expected**: Navigates to the next report in search results, matching the on-screen next arrow.
6. Press ArrowLeft.
7. **Expected**: Navigates to the previous report in search results, matching the on-screen previous arrow.
8. At the first report, verify ArrowLeft does nothing (disabled).
9. At the last report, verify ArrowRight does nothing (disabled).

### Test Case 3: Overlaid modals and popovers
1. On the RHP expense view or Search report view, open a menu or modal on top (e.g., More menu or an alert).
2. Press ArrowLeft / ArrowRight or type a character.
3. **Expected**: Keystrokes are not intercepted by the background navigation and composer does not take focus.
