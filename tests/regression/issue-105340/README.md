# Regression Verification Protocol: Issue #105340

## Issue Summary
**Issue**: [#105340](https://github.com/Expensify/App/issues/105340) - `[Exploratory] Distance - Can't select the rate after change the report to another Workspace`

## Root Cause
1. In `src/pages/iou/request/step/DynamicIOURequestStepDistanceRate.tsx` (lines 75-91):
   - The component retrieved `reportPolicyType`, `policyCategories`, `policyTags`, and invoked `usePolicyForTransaction` using `report?.policyID`.
   - When navigated from `MoneyRequestView`, `report` is the transaction thread report (`transactionThreadReport.reportID`).
   - If the expense report changed workspaces (e.g. from Workspace 1 to Workspace 2 via "Change Workspace"), the child transaction thread report's `policyID` is either undefined or retains the stale ID of the old workspace.
   - Consequently, `usePolicyForTransaction` and Onyx hooks failed to resolve the new workspace (`Workspace 2`), leaving `policy` undefined or pointing to the deleted workspace.
   - When the user selected a valid rate from the list and clicked Save, `updateMoneyRequestDistanceRate` was called with the old/undefined `policy`. In `ViolationsUtils.getViolationsOnyxData`, the selected rate was not found in `policy`, causing `CONST.VIOLATIONS.CUSTOM_UNIT_OUT_OF_POLICY` ("Rate not valid for this workspace") to be re-added immediately.
2. In `src/libs/TransactionUtils/getUpdatedTransaction.ts` (line 283):
   - When `customUnitRateID` was updated on the transaction, `comment.customUnit.customUnitID` was not synced to the target policy's distance custom unit ID, retaining the old workspace's custom unit ID.
3. In `src/libs/actions/Report/index.ts` (`updatePolicyIdForReportAndThreads`, line 8347):
   - The recursive thread policy updater wrapped `optimisticData.push` inside `if (originalPolicyID)`. If a child thread report had an undefined `policyID` prior to the move, it was never updated with the new `policyID`.

## Fix
1. In `src/pages/iou/request/step/DynamicIOURequestStepDistanceRate.tsx`:
   - Resolve `policyID` using `parentReport?.policyID ?? report?.policyID`.
   - Use `policyID` for `reportPolicyType`, `policyCategories`, `policyTags`, `reportPolicyTags`, and `usePolicyForTransaction`.
2. In `src/libs/TransactionUtils/getUpdatedTransaction.ts`:
   - When updating `customUnitRateID`, sync `comment.customUnit.customUnitID` to `DistanceRequestUtils.getDistanceRateCustomUnit(policy)?.customUnitID`.
3. In `src/libs/actions/Report/index.ts`:
   - In `updatePolicyIdForReportAndThreads`, unconditionally update `policyID` on the report and child threads in `optimisticData`, rolling back to `originalPolicyID ?? null` in `failureData`.

## Verification Protocol

### Test Case: Change Workspace on Report with Distance Expense
1. Have two workspaces: Workspace 1 and Workspace 2 (both with Distance rates enabled).
2. Create a distance expense in Workspace 1 and submit it on an expense report.
3. Navigate to Workspaces and delete/archive Workspace 1.
4. Open the expense report that was created.
5. Tap More (...) > "Change workspace" and select Workspace 2.
6. Open the distance expense details from the report.
7. Observe the "Rate not valid for this workspace" violation indicator.
8. Tap "Rate" to open the rate selection page.
9. Select a valid rate from Workspace 2 and tap "Save".
10. **Expected**: The rate updates successfully, the error "Rate not valid for this workspace" disappears, and the updated rate is displayed on the expense.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/DistanceRateChangeWorkspaceRegressionTest.ts
```
Expected: 5 passing tests.
