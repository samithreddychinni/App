# Issue 104971: verification

Issue: https://github.com/Expensify/App/issues/104971

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Regression-tested iOS options; device rendering remains unverified.

The iOS 26 workaround draws the label into a wide icon image on older iOS versions too. Classic UIKit can scale that image into its compact icon slot. The scaling itself still needs device confirmation.

## Recommended change

Use native localized tab labels below iOS 26 and omit the rasterized label in both selection states. Retain the rasterized label workaround on iOS 26 and later. Preserve glyph dimensions, status dots, accessibility labels, theme colors and the shared text style. Parse the major version from dotted version strings.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/NativeTabLegacyIOSRegressionTest.ts`
- `tests/unit/useNativeTabBarOptionsTest.ts`

## Remaining verification

1. Verify portrait and landscape on iOS 16/18 and 26.
2. Check selected and unselected tabs, long translations, theme changes and status dots.

## Rejected alternatives

A global icon renderer change would also affect Android and iOS 26. Number("26.0.1") is NaN, so it is unsuitable for this version test.
