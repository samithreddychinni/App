# Issue 105394: verification

Issue: https://github.com/Expensify/App/issues/105394

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Verified through the real native JavaScript build pipeline.

The locked Rspack pipeline can remove the optional access from an inline require property chain. The two preview handlers then dereference a null current ref. A null ref is valid before the deferred context menu mounts.

## Recommended change

Capture contextMenuRef.current in a local variable inside each handler, then use optional access on that local. Test both real compiled handlers through annotation, React Compiler, the native inline-require loader and Rspack, with minification both enabled and disabled.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `node tests/regression/issue-105394/verify-context-menu-bundle.mjs`

## Remaining verification

1. Verify cold-start Android report and transaction navigation in a release build.
2. The JavaScript checks mock navigation dependencies and do not claim an Android process-crash reproduction.

## Rejected alternatives

A source-only Jest test passes before bundling and misses this defect. Changing hydration timing leaves the invalid emitted access in place. A global bundler patch would affect far more code than these two guards.
