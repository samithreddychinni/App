# Issue 104360: verification

Issue: https://github.com/Expensify/App/issues/104360

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Regression-tested fix; full browser flow remains to verify.

A visible BaseModal can unmount without onDismiss. Its pending focus promise then remains unresolved. Current BaseModal uses a callback ref for unmount cleanup, so the queued effect-dependency diff is obsolete.

## Recommended change

Resolve this modal ID inside the existing callback used only for unmount, before hideModal restores composer focus. Keep the normal animation callbacks unchanged. This avoids a new effect, a stale ID, and resolving another still-open modal.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/ui/BaseModalUnmountFocusRegressionTest.tsx`
- `tests/ui/BaseModalTest.tsx`

## Remaining verification

1. Delete a workspace and edit a report comment in the browser.
2. Check nested modals, interrupted close/reopen animations and keyboard focus restoration.

## Rejected alternatives

Unconditional autofocus only treats one symptom. Resolving inside every hideModal call could release a newly reopened modal when an old hide callback arrives.
