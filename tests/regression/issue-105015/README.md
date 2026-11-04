# Issue 105015: verification

Issue: https://github.com/Expensify/App/issues/105015

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Corrected fix with action tests and all supported locale entries.

AddWorkEmail restricts the existing-account guidance to task onboarding. MergeIntoAccountAndLogin also reaches the blocked view through both EXP_ERROR and an Onyx blocking flag with another response code, including 501.

## Recommended change

Remove the task guard for the known existing-account response. Set guidance for the known existing-account message in both blocked merge paths; retain the generic fallback for unclassified errors, including a 501 blocking flag without a reason. Preserve specific 2FA, SSO and invalid-code feedback. Update the existing guidance key in all eleven locales and leave the generic unknown-error subtitle intact.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/BlockedMergeGuidanceRegressionTest.ts`
- `tests/unit/AddWorkEmailTest.ts`

## Remaining verification

1. Exercise the complete onboarding flow with an existing work account.
2. Review non-English copy with fluent speakers and confirm menu-path names.

## Rejected alternatives

Changing only AddWorkEmail misses merge validation. Replacing the generic subtitle would prescribe merging for unknown errors. Checking only jsonCode 501 would miss other responses that set the same blocking flag.
