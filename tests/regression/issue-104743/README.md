# Issue 104743: verification

Issue: https://github.com/Expensify/App/issues/104743

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Reject the proposed index clamp; native reproduction is still required.

The remaining mutation-order or detach cause is not identified. The prior #101057 fix is patch +015 for merged transaction ordering. Patch +045 addresses non-ViewGroup parents. They are different failures. Current affected code is Kotlin, not the Java target in the queued proposal.

## Recommended change

Capture the complete mount batch and parent/child tags, then repair the operation that loses synchronization the shadow and native trees. Preserve the existing merged-transaction ordering patch. Use the branch test protocol before choosing a recovery policy.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

No automated native result is claimed. Use the checks below in the configured device or build environment.

## Remaining verification

1. Requires HybridApp Android and native mount logs.
2. No Android SDK, emulator, or connected device is available here. The branch contains executable test steps, not claimed native test results.

## Rejected alternatives

Clamping an insertion can avoid one exception while leaving subsequent index-based remove or move operations targeting a different child. It is crash suppression, not proof that the tree is repaired. Skipping the insertion has the same unproven recovery problem.

## Native regression cases

1. Capture a failing mount batch, including tag identity and logical child counts before every instruction. Distinguish the plain addView branch from removeClippedSubviews.
2. Replay the batch against an empty parent when Fabric requests insertion at index 1. Record the first instruction that created the divergence.
3. Test insert followed by remove, move and replace. Assert the identity and final order of every child, not only absence of an exception.
4. Repeat after merging two transactions, retaining patch +015. Compare with unmerged transactions and stopped surfaces.
5. Test missing child ViewState, a child already attached elsewhere, screen detach/reattach and rapid tab transitions.
6. Run the original restart/navigation scenario in a HybridApp release build. Compare native child tags with the expected shadow-tree order after each batch.

A smaller crash count alone does not establish a correct mount-order fix.
