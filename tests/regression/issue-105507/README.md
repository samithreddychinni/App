# Regression Verification Protocol: Issue #105507

## Issue Summary
**Issue**: [#105507](https://github.com/Expensify/App/issues/105507) - `[$175] Workflow-The approval workflow created from invite new member reappears after deleting`

## Root Cause
When a policy has at least one approval workflow created under the rules-based architecture, the backend considers the policy rule-managed and rejects legacy `RemoveWorkspaceApproval` commands with error code 666.
When inviting a new member and selecting a custom approver, the invite flow assigns the approver via `employeeList[email].submitsTo` without creating a dedicated approval rule.
When the admin deletes that approval workflow, `removeApprovalWorkflowRules` checks:
```typescript
if (isEmptyObject(removeDiff) && !hasRuleBasedDefaultWorkflow(existingRules)) {
    return false;
}
```
Because no rule covered the invited member, `removeDiff` is empty (`{}`). If the default workflow has no explicit rules yet, the function evaluated to `false` and fell back to `removeApprovalWorkflow`, which sent the legacy `RemoveWorkspaceApproval` command.
The backend rejected the legacy command with error 666, and `failureData` restored the deleted workflow in Onyx.

## Fix
In `src/libs/actions/Workflow.ts:626`, only fall back to the legacy `RemoveWorkspaceApproval` path when the policy has no approval workflow rules at all (`isEmptyObject(existingRules)`). When rules exist on the policy, `buildReturnToDefaultWorkflowDiff` folds the member into default workflow rules and persists the change through `SET_POLICY_APPROVAL_WORKFLOW_RULES`.

## Verification Protocol

### Test Case 1: Delete workflow created via invite member on rule-enabled workspace
1. Open a workspace with approval workflows enabled.
2. In Workflows > Approvals, tap "Add approval workflow" and save a custom workflow (this initializes approval rules on the policy).
3. Navigate to Members > Invite member.
4. Select or enter a new user email, tap Next.
5. In the "Approver" row, select an approver different from the workspace default approver. Tap Invite.
6. Navigate to Workflows > Approvals. Confirm a new workflow appears for the invited member.
7. Click the new workflow and tap Delete workflow.
8. **Expected**: The workflow is permanently deleted and does not reappear after network synchronization.
