# Regression Verification Protocol: Issue #105225

## Issue Summary
**Issue**: [#105225](https://github.com/Expensify/App/issues/105225) - `[$175] Trial ended-User is not navigated to Subscription page after clicking Add payment card`

## Root Cause
In PR #100917 ("Keep the page an RHP was opened from underneath it"), `WorkspaceOwnerRestrictedAction/index.tsx` was refactored to use dynamic routing via `createDynamicRoute(DYNAMIC_ROUTES.ADD_PAYMENT_CARD.path)`.
However, `createDynamicRoute` was called without providing a `basePath` parameter:
```typescript
const addPaymentCard = () => {
    Navigation.dismissModal({
        afterTransition: () => Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.ADD_PAYMENT_CARD.path)),
    });
};
```
When `basePath` is omitted, `createDynamicRoute` defaults to `getActiveRoute()`. Because `dismissModal()` has already dismissed the restricted modal dialog, `getActiveRoute()` resolves to the underlying chat report screen (e.g., `r/123`). This results in navigating to `r/123/add-payment-card`, opening the "Add payment card" RHP on top of the Inbox rather than on top of Settings > Subscription.

## Fix
In `src/pages/RestrictedAction/Workspace/WorkspaceOwnerRestrictedAction/index.tsx`:
1. Import `ROUTES` from `@src/ROUTES`.
2. Pass `ROUTES.SETTINGS_SUBSCRIPTION.route` as the `basePath` argument to `createDynamicRoute`:
   ```typescript
   Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.ADD_PAYMENT_CARD.path, ROUTES.SETTINGS_SUBSCRIPTION.route));
   ```
3. In `tests/unit/pages/RestrictedAction/WorkspaceOwnerRestrictedActionTest.tsx`, update the web assertion from `'r/123/add-payment-card'` to `'settings/subscription/add-payment-card'`.

## Verification Protocol

### Test Case: Restricted Action "Add Payment Card" Navigation
1. Log in to New Dot on Web/Desktop with an account whose workspace trial has ended.
2. In a workspace chat, trigger a billable restricted action (e.g., click `+` -> "Create expense").
3. On the "Restricted" modal screen, click "Add payment card".
4. **Expected**: The user is redirected to the Subscription page with the "Add payment card" RHP opened on top of Settings > Subscription.
5. Close the RHP.
6. **Expected**: The background screen remains on Settings > Subscription.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/WorkspaceOwnerRestrictedActionAddCardRegressionTest.ts
```
Expected: 3 passing tests.
