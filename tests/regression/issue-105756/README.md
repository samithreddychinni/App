# Regression Verification Protocol: Issue #105756

## Issue Summary
**Issue**: [#105756](https://github.com/Expensify/App/issues/105756) - `[$175] Unable to create a new Expense from Reports > More > Create Expense`

## Root Cause
When creating an expense from a report with multi-level tags or after encountering an initial validation or tag policy violation:
1. In `src/libs/Violations/ViolationsUtils.ts:578`, `getIsViolationFixed` for `tagOutOfPolicy` checked `Object.values(policyTagLists).some((tagList) => !!tagList.tags?.[tag]?.enabled)`. Because multi-level tags are colon-separated strings (e.g. `"Department:Engineering"`), indexing `tagList.tags` directly with `tag` returns `undefined`, preventing `tagOutOfPolicy` violations from ever being marked as fixed.
2. The unresolved violation keeps `formError` populated in `useFormErrorManagement.ts`.
3. In `src/components/MoneyRequestConfirmationList/confirmAction.ts`, when the user clicks "Save expense", `validate(paymentMethod)` runs and passes (`!result.errorKey`). However, `confirmAction.ts` never cleared `formError` on successful validation and had an explicit `if (formError) return;` check before `onConfirm?.()`.
4. As a result, the stale `formError` closure silently early-returned and blocked `onConfirm`, rendering the "Save expense" button completely unresponsive.

## Fix
1. In `src/components/MoneyRequestConfirmationList/confirmAction.ts`:
   - When `validate(paymentMethod)` passes with zero error (`!result.errorKey`), clear any stale `formError` via `setFormError('')`.
   - Remove the redundant `if (formError) return;` guard that was preventing valid submissions after `validate()` already confirmed the absence of errors.
2. In `src/libs/Violations/ViolationsUtils.ts`:
   - Import `hasMatchingTag` from `@libs/TagsOptionsListUtils` and use it in `getIsViolationFixed` for `${CONST.VIOLATIONS_PREFIX}${CONST.VIOLATIONS.TAG_OUT_OF_POLICY}` so multi-level tags are parsed into component parts and matched correctly against policy tag lists.

## Verification Protocol

### Test Case 1: Create expense with multi-level tag and required fields
1. Open a workspace with multi-level tags enabled (e.g. `Department:Project`).
2. Go to Spend > Reports and open a report.
3. Click More > Add Expense > Create Expense.
4. Scan or enter receipt, select tags from multi-level list, and enter required category.
5. Tap "Save Expense".
6. **Expected**: The expense is successfully created and added to the report without button freezing or becoming unresponsive.

### Test Case 2: Validation recovery on expense confirmation
1. Start creating an expense and intentionally leave a required field empty.
2. Tap "Save Expense" (an error surfaces under the field or footer).
3. Fill in the required field so all fields are valid.
4. Tap "Save Expense" again.
5. **Expected**: The previous form error clears, and the expense is confirmed and saved immediately.
