# Issue 105115: verification

Issue: https://github.com/Expensify/App/issues/105115

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Prefer an authoritative payment response; backend evidence is still required.

The client optimistically sets REIMBURSED. The contract test shows that a payment response containing APPROVED and isWaitingOnBankAccount corrects it, while an omitted correction leaves Paid. The live backend omission remains an inference.

## Recommended change

Capture PayMoneyRequest and OpenReport responses for the same report. If the payment response omits the final waiting-bank state, return the authoritative report update from PayMoneyRequest. This is the smallest root fix without extra reads or a client guess. Retain the tested frontend as-is unless an App-only workaround is required.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/actions/IOUTest/PayMoneyRequestTest.ts`

## Remaining verification

1. Needs a verified business bank account and recipient without a receiving account.
2. Check failure rollback, offline replay, recipients with accounts and partial/held payments.
3. No money movement was performed.

## Rejected alternatives

A follow-up OpenReport is an App workaround, not the best system fix. It adds a request and can have report-opening side effects. The queued call also uses obsolete parameters and omits fields required by the current signature. Predicting the recipient bank state from the payer bank list is invalid.
