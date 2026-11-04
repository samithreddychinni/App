# Regression Verification Protocol: Issue #105854

## Issue Summary
**Issue**: [#105854](https://github.com/Expensify/App/issues/105854) - `Company Card- Card feed is removed in 1st workspace after share with 2nd workspace`

## Root Cause
When a company card feed is created in Workspace 1, its settings store `preferredPolicy: 'WORKSPACE_1_POL'`.
When that feed is subsequently shared with Workspace 2, Workspace 2's policy ID is added to `linkedPolicyIDs: ['WORKSPACE_2_POL']`.
In `src/libs/CardFeedUtils.ts:396-404` (`getCardFeedsForDisplayPerPolicy`):
```typescript
const validLinkedPolicyIDs = linkedPolicyIDs?.filter(Boolean);
if (validLinkedPolicyIDs?.length) {
    for (const linkedPolicyID of validLinkedPolicyIDs) {
        (cardFeedsForDisplayPerPolicy[linkedPolicyID] ||= []).push(feedEntry);
    }
} else if (preferredPolicy) {
    (cardFeedsForDisplayPerPolicy[preferredPolicy] ||= []).push(feedEntry);
}
```
Because of the `else if`, once `validLinkedPolicyIDs` was populated with the shared workspace ID, the loop only indexed the feed under `linkedPolicyIDs` and completely omitted `preferredPolicy`.
Similarly, in `src/hooks/useCardFeeds.tsx:60-68`, `shouldIncludeFeedPredicate` evaluated `validLinkedPolicyIDs.some(...)` and returned `false` for Workspace 1 without falling back to `preferredPolicy`.
Likewise, `getAssignedCardFeedAccess` in `CardFeedUtils.ts:336` dropped `preferredPolicy` when `linkedPolicyIDs` had any entries.
As a result, Workspace 1 lost its own company card feed as soon as it was shared with Workspace 2.

## Fix
1. In `src/libs/CardFeedUtils.ts`:
   - In `getCardFeedsForDisplayPerPolicy`, index the feed under both `validLinkedPolicyIDs` and `preferredPolicy` (deduplicated).
   - In `getAssignedCardFeedAccess`, resolve `namedPolicyIDs` from both `linkedPolicyIDs` and `preferredPolicy`.
   - In `getVisibleCompanyCardFeedsForSelector`, include `preferredPolicy` in the returned feed entry.
2. In `src/hooks/useCardFeeds.tsx`:
   - In `shouldIncludeFeedPredicate`, allow the feed if either `isLinked` OR `isPreferred` matches the active policy ID (case-insensitively).
3. In `src/hooks/useOtherFeedsForFeedSelector.tsx`:
   - Check both `isLinkedToActivePolicy` and `isPreferredForActivePolicy` before showing feeds in "From other workspaces", and fall back to `preferredPolicy` when indexing.

## Verification Protocol

### Test Case 1: Share Company Card feed to a second workspace
1. Open Expensify and create Workspace A and Workspace B.
2. In Workspace A settings > Company Cards, add a company card feed (e.g. Mock commercial card).
3. Confirm the feed appears in Workspace A Company Cards.
4. Go to Workspace B settings > Company Cards > Add cards.
5. Select the card feed from Workspace A.
6. Navigate back to Workspace A settings > Company Cards.
7. **Expected**: The card feed is still displayed in Workspace A Company Cards, and is also displayed in Workspace B Company Cards.
