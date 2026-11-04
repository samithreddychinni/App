# Issue 103777: verification

Issue: https://github.com/Expensify/App/issues/103777

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Replace speculative router rehydration with the identified route-identity fix.

The reviewed issue discussion identifies duplicate root route keys: cancellation restores the saved TabNavigator into the last tab by name, overwriting a newer tab. React Navigation can then pair an RHP with tab state lacking preloadedRoutes. Four real-handler regression cases fail before the restoration fix, and two deferred tab-jump cases fail before the sibling cancellation fix. This agrees with the existing reviewed proposal (https://github.com/Expensify/App/issues/103777#issuecomment-6616565434); it is not a new discovery.

## Recommended change

Restore only the route whose key matches the saved original in handleRemoveFullscreenUnderRHP, the RHP-closed buffer listener, fallback buffer recovery, and the deferred post-dismissal tab jump. If the original key is gone, preserve later tabs and remove only the temporary buffer. Correct the existing buffer tests to save the real slot key and capture the expected snapshot before cleanup clears it.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/Navigation/createRootStackNavigator/handleReplaceFullscreenUnderRHP.test.ts`
- `tests/unit/Navigation/preMountBufferTest.ts`
- `tests/unit/PreservedStackStateDiagnosisTest.ts`

## Remaining verification

1. Run the restricted-workspace Manual expense, Subscription search, FAB Scan receipt sequence on Android and iOS.
2. Check swipe dismissal, a missing original route and normal single-tab cancellation.
3. An old queued proposal was automatically posted by the restarted service; this local correction must not be published automatically.

## Rejected alternatives

Unconditional stale:true rehydration changes the active index and does not repair duplicate root keys. Empty-array guards hide the symptom. Clearing on one Subscription navigation path misses other pushes. The issue already has a reviewed matching proposal; do not submit a duplicate.
