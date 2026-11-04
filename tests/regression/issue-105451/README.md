# Regression Verification Protocol: Issue #105451

## Issue Summary
**Issue**: [#105451](https://github.com/Expensify/App/issues/105451) - `[$175] Tax amount is shown 0 even if the tax rate is not 0`
**PR Fixed**: [#101674](https://github.com/Expensify/App/pull/101674) regression gap.

## Root Cause
In `src/libs/DistanceRequestUtils.ts:819` and `src/libs/actions/IOU/SplitExpenseItems.ts:327`, `getTaxableAmount` computes taxable distance amount as `amount * taxClaimablePercentage`, defaulting `taxClaimablePercentage` to `CONST.DEFAULT_NUMBER_ID` (0) when undefined.
When a distance rate does not have a configured tax rate (`taxRateExternalID` is undefined), the workspace UI hides the "Tax reclaimable on" field, so `taxClaimablePercentage` is always undefined.
Following PR #101674, category rules and workspace defaults apply a tax rate (e.g. TaxA 10%) to distance expenses using rates without their own tax rate. However, because `getTaxableAmount` multiplied by 0, `taxableAmount` was 0, resulting in `0 * 10% = 0` tax amount.

## Fix
When a distance rate has no selectable `taxRateExternalID` configured, `defaultTaxClaimablePercentage` defaults to `1` (100% of the distance amount is taxable). When a rate has a configured tax rate, it continues defaulting to `0` if `taxClaimablePercentage` is not set.

## Verification Protocol

### Test Case 1: Distance expense with category tax rule on Rate-NoTax
1. Use an account with a workspace that has **Taxes**, **Distance rates**, and **Rules** enabled.
2. Under **Taxes**, create a non-default rate `TaxA` at 10%. Leave workspace default as `Tax exempt (0%)`.
3. Under **Distance rates**, enable **Track tax** and create a rate `Rate-NoTax`, leaving its tax rate unset.
4. Under **Rules > Add rule > Apply expense defaults**, add a rule with Category `Car` and Tax `TaxA`. Save.
5. Start a distance expense in the workspace chat, set a route and continue to the confirm page.
6. Set **Rate** to `Rate-NoTax`.
7. Set **Category** to `Car`.
8. **Expected**: The Tax field displays `TaxA (10%)` and the **Tax amount** displays 10% of the total distance expense amount (not 0).
9. Tap **Create expense** and open the created transaction.
10. **Expected**: Tax amount remains 10% of the expense amount.

### Test Case 2: Split distance expense
1. Split the distance expense across participants.
2. **Expected**: Tax amount for each split item is accurately calculated as 10% of that item's split amount.
