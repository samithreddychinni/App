# Issue 105456: Verification

Issue: https://github.com/Expensify/App/issues/105456

Reviewed source: `90fb28b72a862de788aa57333be5eb516af73ce6`. The branch contains only the files for this issue.

## Review result

Verified fix across all 11 locale files.

In the company card instructions step for Visa (`vcf`) and Mastercard (`cdf`), step 2 ("Contact your bank...") was formatted with markdown link syntax pointing to the same help article constant (`COMPANY_CARDS_VISA_COMMERCIAL_CARD_HELP` and `COMPANY_CARDS_MASTERCARD_COMMERCIAL_CARDS`) as step 1. Because the user selects a card network (not an individual bank), there is no specific bank URL for this step. Formatting step 2 as a link caused both hyperlinks to navigate to the exact same help article.

## Recommended change

Remove the markdown link syntax from step 2 in `vcf` and `cdf` across all locale translation files (`en.ts`, `de.ts`, `el.ts`, `es.ts`, `fr.ts`, `it.ts`, `ja.ts`, `nl.ts`, `pl.ts`, `pt-BR.ts`, `zh-hans.ts`), keeping the bank contact guidance as plain text matching the Amex (`gl1025`) template.

## Checks

Run regression test:
- `tests/unit/CompanyCardsFeedInstructionsRegressionTest.ts`

## Remaining verification

1. Navigate to Workspace > Company cards > Add cards > Select country (United States) > Commercial > Visa.
2. Confirm step 1 contains the hyperlink to the Visa commercial feed help article.
3. Confirm step 2 ("Contact your bank...") is displayed as plain text without a link.
4. Repeat for Mastercard commercial card feed.
