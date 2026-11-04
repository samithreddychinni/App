# Issue 104864: verification

Issue: https://github.com/Expensify/App/issues/104864

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Small source fix with component coverage; visual verification remains.

The text can shrink, but its CaretWrapper parent cannot. That prevents the available row width from constraining the name.

## Recommended change

Pass the existing styles.flexShrink1 to the FeedSelector CaretWrapper. Preserve the complete accessible name, single-line text and existing press action. Do not change all CaretWrapper callers.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/ui/FeedSelectorLongNameRegressionTest.tsx`

## Remaining verification

1. Check the narrow Company cards page on iOS Safari, Android Chrome and native.
2. The component test checks the sizing constraint and interaction; it does not measure a real browser layout.

## Rejected alternatives

A global wrapper change affects unrelated menus. Removing or shortening the stored card name loses user data rather than fixing layout.
