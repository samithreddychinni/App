# Issue 105002: verification

Issue: https://github.com/Expensify/App/issues/105002

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Rewrite the diagnosis; preserve literal HTML source and markdown round trips.

The issue author clarified that the test concerns rendered content, not HTML source. The existing web handler already converts a text/html fragment through Parser. Native HTML support cannot be inferred from the no-op web hook fallback alone.

## Recommended change

Keep the MIME distinction and the existing markdown-input round-trip guard. Add tests for rich HTML conversion, literal HTML carried as text/plain and a native markdown wrapper. Reproduce the exact rendered-content source before changing the wrapper rule or the native clipboard pipeline.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/RichHTMLClipboardRegressionTest.ts`

## Remaining verification

1. Repeat the clarified issue steps with the actual source app on web, iOS and Android.
2. Capture clipboard MIME formats without logging private message content.

## Rejected alternatives

Parsing raw text as HTML would corrupt code snippets. Removing the p-dir-ltr guard wholesale can double-convert markdown copied inside the app. Native event payload support must be established before adding item.data handling.
