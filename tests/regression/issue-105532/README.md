# Regression Verification Protocol: Issue #105532

## Issue Summary
**Issue**: [#105532](https://github.com/Expensify/App/issues/105532) - `[Exploratory] w44-Secondary email-Both emails become workspace members when changing default one`

## Root Cause
When changing the default contact method (`setContactMethodAsDefault` in `src/libs/actions/User.ts:1130`), the action was refactored to Pattern C where optimistic data only sets a pending indicator on the login key, and state changes wait for `successData`.
However, `successData` only updated `ACCOUNT.primaryLogin`, `SESSION.email`, `LOGINS`, and `PERSONAL_DETAILS_LIST`. It omitted the workspace policy migration logic originally introduced in PR #45234 (issue #44705).
Specifically:
1. `policy.employeeList[oldDefaultContactMethod]` was not set to `null` to remove the obsolete login key from Onyx.
2. `policy.employeeList[newDefaultContactMethod]` was not seeded with the member's existing role and properties.
3. `policy.owner` was not updated to `newDefaultContactMethod` for workspaces owned by the user.

When subsequently viewing Workspace Members (`src/pages/workspace/WorkspaceMembersPage.tsx`), `useWorkspaceMembers` iterates over `policy.employeeList`. Because Onyx merges dictionary keys without removing the old email:
- The old email remained in `employeeList` with matching `policy.owner`, rendering as a member with the **Owner** badge.
- The new default email was fetched by `openWorkspaceMembersPage` and merged into `employeeList`, matching the user's updated personal details and rendering with the **Workspace Admin** badge.
- This created two separate member rows for the same user in the workspace.

## Fix
In `src/libs/actions/User.ts`:
1. Connect `allPolicies` via `Onyx.connectWithoutView({key: ONYXKEYS.COLLECTION.POLICY})`.
2. In `setContactMethodAsDefault`, iterate through `allPolicies`:
   - If `policy.employeeList` contains `oldDefaultContactMethod`, append an update to `successData` setting `[oldDefaultContactMethod]: null` and `[newDefaultContactMethod]: currentEmployee`.
   - If the user is the workspace owner (`policy.ownerAccountID === currentUserPersonalDetails.accountID` or `policy.owner === oldDefaultContactMethod`), append an update setting `owner: newDefaultContactMethod`.
3. Because Pattern C applies local updates only on server success, `failureData` requires no policy rollback.

## Verification Protocol

### Test Case: Switch Default Contact Method and Check Workspace Members
1. User A has at least two contact methods (primary email and secondary email) in Account > Profile > Contact methods.
2. User A creates a workspace ("Workspace A") and invites User B as a member.
3. Go to Workspace > Members and verify only 2 members exist: User A (Owner) and User B (Member).
4. Go to Account > Profile > Contact methods.
5. Tap the secondary contact method and select "Set as default".
6. Complete validation code verification.
7. Return to Workspace > Members.
8. **Expected**: The members list still shows only 2 members. User A's new primary email is shown with the "Owner" badge. The old primary email does not appear as a separate workspace admin row.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/SetDefaultContactMethodWorkspaceMembersRegressionTest.ts
```
Expected: 3 passing tests.
