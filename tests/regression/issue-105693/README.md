# Regression Verification Protocol: Issue #105693

## Issue Summary
**Issue**: [#105693](https://github.com/Expensify/App/issues/105693) - `Account - System back button on 2FA success RHP navigates to Account > Security`

## Root Cause
In PR #102482 ("Send users Home after required 2FA setup instead of Settings > Security"), `sendForcedSetupUserHome()` was wired up to explicit on-screen buttons:
1. Primary button (`onButtonPress` -> "Got it")
2. Header back button (`onBackButtonPress` -> back arrow)

However, alternative dismissal vectors bypass `goBack()`:
- Android hardware/system back button
- Modal overlay/backdrop clicks outside the RHP on Web (`handleOverlayPress` in `RightModalNavigator.tsx`)
- Browser back button

When any of these occur, React Navigation popped the RHP directly off the stack. Because forced 2FA setup is opened with `settings/security?forceSetup=true` as its base route, popping the modal revealed Settings > Security underneath rather than redirecting the user to Home.

## Fix
In `src/pages/settings/Security/TwoFactorAuth/DynamicSuccessPage.tsx`:
1. Import `usePreventRemove` from `@react-navigation/native` and `useRef` from `react`.
2. Add an `isDismissingRef` flag and a `usePreventRemove` hook active during forced setup flows:
   ```typescript
   const isDismissingRef = useRef(false);
   const shouldPreventRemove = (isForcedSetupFlow || shouldReturnToOnboardingAfter2FA) && !isDismissingRef.current;

   usePreventRemove(shouldPreventRemove, () => {
       isDismissingRef.current = true;
       goBack();
   });
   ```
3. When the screen removal is intercepted, `isDismissingRef.current` is set to `true` and `goBack()` is triggered, executing `sendForcedSetupUserHome()` or `completeForcedOnboarding2FAHandoff()` to reveal Home before dismissing the modal.
4. Programmatic dismissal from `goBack()` or `onButtonPress()` sets `isDismissingRef.current = true` so the subsequent modal close animation is not blocked.

## Verification Protocol

### Test Case: System Back Navigation from 2FA Success Screen
Preconditions:
Account A owns a workspace that requires 2FA (e.g. Xero connected). Account B already finished onboarding and has 2FA disabled.
As Account A, invite Account B to the workspace as an Admin.

1. Log in as Account B and trigger the "2FA required" setup flow.
2. Complete setup (copy recovery codes, enter 6-digit verification code).
3. On the 2FA success page, press the Android system/hardware back button (or click outside the modal overlay / press browser back on Web).
4. **Expected**: The app reveals Home underneath and dismisses the RHP. The user lands on Home rather than Account > Security.

### Unit Test Execution
Run:
```bash
bun test ./tests/unit/DynamicSuccessPagePreventRemoveRegressionTest.ts
```
Expected: 3 passing tests.
