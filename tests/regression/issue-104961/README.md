# Issue 104961: verification

Issue: https://github.com/Expensify/App/issues/104961

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Reject the global employee rewrite until the product contract is confirmed.

The legacy employee-list path and the rules path have different semantics. The issue maintainer explicitly asks for confirmation of the non-beta behavior. Current generated rules already represent the over-limit step followed by the next approver.

## Recommended change

Keep legacy global forwarding fields unchanged. Test the rules-generated chain below, at and above the limit, then reproduce both beta states with captured save commands. If the intended rules path fails on the server, fix server evaluation or persistence rather than rewriting unrelated employees.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/unit/OverLimitApprovalRoutingContractTest.ts`
- `tests/unit/WorkflowUtilsTest.ts`

## Remaining verification

1. Product and backend must confirm legacy behavior.
2. Run both beta states and shared-over-limit workflows with different next approvers.

## Rejected alternatives

Assigning overLimitEmployee.forwardsTo globally cannot encode different next approvers for shared workflows. Cleanup also cannot safely distinguish a field owned by this workflow from another workflow.
