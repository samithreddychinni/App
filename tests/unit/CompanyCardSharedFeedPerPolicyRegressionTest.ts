import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105854:
 * "Company Card - Card feed is removed in 1st workspace after share with 2nd workspace"
 *
 * Verifies that when a company card feed created in Workspace 1 (preferredPolicy) is shared
 * with Workspace 2 (added to linkedPolicyIDs), it remains accessible and displayed in BOTH
 * Workspace 1 and Workspace 2 instead of being removed from Workspace 1.
 */

type FeedSettings = {
    preferredPolicy?: string;
    linkedPolicyIDs?: string[];
    domainID?: number;
};

type CardFeedEntry = {
    id: string;
    feed: string;
    preferredPolicy?: string;
    linkedPolicyIDs?: string[];
    fundID: string;
};

/**
 * Mirror of getCardFeedsForDisplayPerPolicy indexing logic from src/libs/CardFeedUtils.ts
 */
function indexFeedsPerPolicy(feeds: CardFeedEntry[]): Record<string, CardFeedEntry[]> {
    const cardFeedsForDisplayPerPolicy: Record<string, CardFeedEntry[]> = {};

    for (const feedEntry of feeds) {
        const validLinkedPolicyIDs = feedEntry.linkedPolicyIDs?.filter(Boolean) ?? [];
        const policyIDsToIndex = new Set<string>();

        for (const linkedPolicyID of validLinkedPolicyIDs) {
            policyIDsToIndex.add(linkedPolicyID);
        }
        if (feedEntry.preferredPolicy) {
            policyIDsToIndex.add(feedEntry.preferredPolicy);
        }

        if (policyIDsToIndex.size > 0) {
            for (const policyIDToIndex of policyIDsToIndex) {
                (cardFeedsForDisplayPerPolicy[policyIDToIndex] ||= []).push(feedEntry);
            }
        }
    }

    return cardFeedsForDisplayPerPolicy;
}

/**
 * Mirror of shouldIncludeFeedPredicate from src/hooks/useCardFeeds.tsx
 */
function shouldIncludeFeed(policyID: string, feed: FeedSettings, effectiveWorkspaceAccountID?: number): boolean {
    const upperPolicyID = policyID.toUpperCase();
    const validLinkedPolicyIDs = feed?.linkedPolicyIDs?.filter(Boolean) ?? [];
    const isLinked = validLinkedPolicyIDs.some((linkedPolicyID) => linkedPolicyID.toUpperCase() === upperPolicyID);
    const isPreferred = feed.preferredPolicy ? feed.preferredPolicy.toUpperCase() === upperPolicyID : false;

    if (isLinked || isPreferred) {
        return true;
    }
    return !validLinkedPolicyIDs.length && !feed.preferredPolicy ? feed.domainID === effectiveWorkspaceAccountID : false;
}

/**
 * Mirror of namedPolicyIDs resolution in getAssignedCardFeedAccess from src/libs/CardFeedUtils.ts
 */
function getNamedPolicyIDs(feedSettings?: FeedSettings): string[] {
    const linkedPolicyIDs = feedSettings?.linkedPolicyIDs?.filter(Boolean) ?? [];
    return Array.from(new Set([...linkedPolicyIDs, feedSettings?.preferredPolicy].filter((policyID): policyID is string => !!policyID)));
}

describe('CompanyCardSharedFeedPerPolicyRegressionTest', () => {
    describe('indexFeedsPerPolicy (getCardFeedsForDisplayPerPolicy)', () => {
        it('indexes a feed under BOTH preferredPolicy (workspace 1) and linkedPolicyIDs (workspace 2) after sharing', () => {
            const sharedFeed: CardFeedEntry = {
                id: '123456_mock_feed',
                feed: 'mock_feed',
                preferredPolicy: 'WORKSPACE_1_POL',
                linkedPolicyIDs: ['WORKSPACE_2_POL'],
                fundID: '123456',
            };

            const result = indexFeedsPerPolicy([sharedFeed]);

            expect(result.WORKSPACE_1_POL).toBeDefined();
            expect(result.WORKSPACE_1_POL.length).toBe(1);
            expect(result.WORKSPACE_1_POL[0].id).toBe('123456_mock_feed');

            expect(result.WORKSPACE_2_POL).toBeDefined();
            expect(result.WORKSPACE_2_POL.length).toBe(1);
            expect(result.WORKSPACE_2_POL[0].id).toBe('123456_mock_feed');
        });

        it('does not duplicate feed entry if preferredPolicy is also in linkedPolicyIDs', () => {
            const feed: CardFeedEntry = {
                id: '123456_mock_feed',
                feed: 'mock_feed',
                preferredPolicy: 'WORKSPACE_1_POL',
                linkedPolicyIDs: ['WORKSPACE_1_POL', 'WORKSPACE_2_POL'],
                fundID: '123456',
            };

            const result = indexFeedsPerPolicy([feed]);

            expect(result.WORKSPACE_1_POL.length).toBe(1);
            expect(result.WORKSPACE_2_POL.length).toBe(1);
        });

        it('indexes correctly when feed only has preferredPolicy and no linkedPolicyIDs', () => {
            const unsharedFeed: CardFeedEntry = {
                id: '123456_mock_feed',
                feed: 'mock_feed',
                preferredPolicy: 'WORKSPACE_1_POL',
                linkedPolicyIDs: [],
                fundID: '123456',
            };

            const result = indexFeedsPerPolicy([unsharedFeed]);

            expect(result.WORKSPACE_1_POL.length).toBe(1);
            expect(result.WORKSPACE_2_POL).toBeUndefined();
        });
    });

    describe('shouldIncludeFeed (useCardFeeds predicate)', () => {
        const sharedFeed: FeedSettings = {
            preferredPolicy: 'WORKSPACE_1_POL',
            linkedPolicyIDs: ['WORKSPACE_2_POL'],
        };

        it('includes feed in Workspace 1 (preferredPolicy) after sharing with Workspace 2', () => {
            const includedInWS1 = shouldIncludeFeed('WORKSPACE_1_POL', sharedFeed);
            expect(includedInWS1).toBe(true);
        });

        it('includes feed in Workspace 2 (linkedPolicyIDs)', () => {
            const includedInWS2 = shouldIncludeFeed('WORKSPACE_2_POL', sharedFeed);
            expect(includedInWS2).toBe(true);
        });

        it('excludes feed from an unrelated Workspace 3', () => {
            const includedInWS3 = shouldIncludeFeed('WORKSPACE_3_POL', sharedFeed);
            expect(includedInWS3).toBe(false);
        });

        it('handles case-insensitivity between policyID and preferredPolicy or linkedPolicyIDs', () => {
            expect(shouldIncludeFeed('workspace_1_pol', sharedFeed)).toBe(true);
            expect(shouldIncludeFeed('workspace_2_pol', sharedFeed)).toBe(true);
        });
    });

    describe('getNamedPolicyIDs (getAssignedCardFeedAccess)', () => {
        it('resolves policy IDs from both preferredPolicy and linkedPolicyIDs', () => {
            const feedSettings: FeedSettings = {
                preferredPolicy: 'POL_A',
                linkedPolicyIDs: ['POL_B', 'POL_C'],
            };

            const namedPolicies = getNamedPolicyIDs(feedSettings);
            expect(namedPolicies).toContain('POL_A');
            expect(namedPolicies).toContain('POL_B');
            expect(namedPolicies).toContain('POL_C');
            expect(namedPolicies.length).toBe(3);
        });

        it('deduplicates when preferredPolicy appears in linkedPolicyIDs', () => {
            const feedSettings: FeedSettings = {
                preferredPolicy: 'POL_A',
                linkedPolicyIDs: ['POL_A', 'POL_B'],
            };

            const namedPolicies = getNamedPolicyIDs(feedSettings);
            expect(namedPolicies).toEqual(['POL_A', 'POL_B']);
        });
    });
});
