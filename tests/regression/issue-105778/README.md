# Regression Verification Protocol: Issue #105778

## Issue Summary
**Issue**: [#105778](https://github.com/Expensify/App/issues/105778) - `iOS - Log in - Online magic link does not open the linked report when signed out`

## Root Cause
1. In `src/libs/isPublicScreenRoute.ts`:
   The route regex matches the full route string against `^${screenRoute}$`. When a magic link email is tapped (e.g., `v/:accountID/:validateCode?exitTo=r/reportID`), the presence of `?exitTo=...` query parameters caused `isPublicScreenRoute` to return `false`.
2. In `src/libs/actions/Link.ts`:
   `if (!isAuthenticated && isPublicScreenRoute(route)) return;` was bypassed because `isPublicScreenRoute` returned `false`. Consequently, `Link.ts` called `waitForUserSignIn()`.
3. In `src/libs/actions/Session/index.ts`:
   `waitForUserSignIn()` stored a single callback in `authPromiseResolver`.
   When `ValidateLoginPage` mounted, it called `signInWithValidateCodeAndNavigate(..., exitTo)`, which called `handleExitToNavigation(exitTo)` which also invoked `waitForUserSignIn()`.
   The second call overwrote `authPromiseResolver`. When authentication completed, only one promise resolved, dropping navigation to the linked report and causing `Link.ts` to attempt navigating to the raw magic-link URL instead of the destination report.

## Fix
1. In `src/libs/isPublicScreenRoute.ts`:
   Strip query parameters and hash fragments before testing against `PUBLIC_SCREENS_ROUTES`:
   ```typescript
   const cleanRoute = (route.startsWith('/') ? route.slice(1) : route).split(/[?#]/)[0] ?? '';
   ```
2. In `src/libs/actions/Session/index.ts`:
   Support multiple concurrent listeners in `waitForUserSignIn()` by using `const authPromiseResolvers = new Set<(value: boolean) => void>()`.

## Verification Protocol

### Test Case 1: Tapping magic link report email while signed out
1. On iOS, sign in to the app and then explicitly log out.
2. Open an email containing a link to a report (e.g., "View report" with `exitTo=r/<reportID>`).
3. Tap the link to open Expensify.
4. **Expected**: The app validates credentials, completes sign-in, and immediately opens the linked expense report without getting stuck on an offline message or blank screen.
