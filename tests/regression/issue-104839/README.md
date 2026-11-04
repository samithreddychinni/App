# Issue 104839: verification

Issue: https://github.com/Expensify/App/issues/104839

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Corrected and regression-tested fix.

One DOM input represents all slots. focus-trap handles document capture before React onKeyPress. An input-level capture listener is also too late.

## Recommended change

Add a window capture listener for unmodified Tab only while this input owns focus. Consume in-range moves with preventDefault and stopPropagation. Use the existing synchronous edit index so repeated keys advance correctly. Leave boundary Tabs and the native onKeyPress path intact, and remove the listener on unmount.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/ui/ValidateCodeInputEventTest.tsx`

## Remaining verification

1. Verify sign-in, 2FA and an RHP code screen in a browser with the real focus trap.
2. Check boundary Tabs, modifier shortcuts and hardware keyboard navigation on native.

## Rejected alternatives

The queued input capture suggestion cannot run before document capture. Six separate inputs would require a much larger autofill and paste rewrite.
