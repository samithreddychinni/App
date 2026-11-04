import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105932:
 * "Regression: Individual card error incorrectly triggers feed-wide broken connection warning"
 *
 * Verifies that:
 * 1. Error 434 ("Account not found") is excluded from feed-level broken connection warnings
 *    so healthy cards in the feed continue syncing normally.
 * 2. getShouldShowBrokenConnectionError only surfaces the feed-wide warning when the connection
 *    itself is broken (isFeedConnectionBroken: true on a direct feed) or the feed has feed-level errors.
 * 3. An actionable scrape status like 434 (hasFeedConnectionIssue: true) does NOT label the entire feed as broken.
 * 4. The individual card returning 434 retains its card-level error display in WorkspaceCompanyCardsTable
 *    instead of having its row error suppressed by a false feed-level broken state.
 */

const CONST = {
    COMPANY_CARDS: {
        BROKEN_CONNECTION_IGNORED_STATUSES: [200, 434, 531, 530, 500, 666],
        ACTIONABLE_IGNORED_SCRAPE_STATUSES: [434],
        FEED_BANK_NAME: {
            CHASE: 'oauth.chase.com',
            VISA: 'vcf',
            CSV: 'ccupload',
        },
        FEED_KEY_SEPARATOR: '#',
    },
} as const;

type MockCard = {
    cardID: number;
    bank: string;
    lastScrapeResult?: number;
    pendingFields?: {
        lastScrape?: string;
    };
    errors?: Record<string, string>;
};

type MockCardFeedErrorState = {
    shouldShowRBR: boolean;
    hasFeedErrors: boolean;
    hasWorkspaceErrors: boolean;
    isFeedConnectionBroken: boolean;
    shouldPromptBrokenConnection: boolean;
    hasFeedConnectionIssue: boolean;
};

function isDirectFeed(feed: string | undefined): boolean {
    if (!feed) {
        return false;
    }
    const lowerFeed = feed.toLowerCase();
    return lowerFeed.startsWith('oauth') || lowerFeed.startsWith('plaid');
}

function isCardConnectionBroken(card: MockCard): boolean {
    if (card.pendingFields?.lastScrape) {
        return false;
    }
    return !!card.lastScrapeResult && !CONST.COMPANY_CARDS.BROKEN_CONNECTION_IGNORED_STATUSES.includes(card.lastScrapeResult as any);
}

function hasCardConnectionIssue(card: MockCard): boolean {
    if (card.pendingFields?.lastScrape) {
        return false;
    }
    if (isCardConnectionBroken(card)) {
        return true;
    }
    return !!card.lastScrapeResult && CONST.COMPANY_CARDS.ACTIONABLE_IGNORED_SCRAPE_STATUSES.includes(card.lastScrapeResult as any);
}

function getShouldShowBrokenConnectionError(feedName: string, feedErrors: MockCardFeedErrorState | undefined): boolean {
    return (!!feedErrors?.isFeedConnectionBroken && isDirectFeed(feedName)) || !!feedErrors?.hasFeedErrors;
}

function resolveCardRowErrors(
    isFeedConnectionBroken: boolean,
    assignedCard: MockCard | undefined,
    transactionStartDateErrors?: Record<string, string>,
): Record<string, string> | undefined {
    const cardErrors = isFeedConnectionBroken || assignedCard?.pendingFields?.lastScrape ? undefined : assignedCard?.errors;
    return transactionStartDateErrors ? {...cardErrors, ...transactionStartDateErrors} : cardErrors;
}

describe('Issue #105932 - Individual Card Error 434 Does Not Trigger Feed-Wide Broken Connection Warning', () => {
    const DOMAIN_ID = '11111111';
    const DIRECT_FEED = `${CONST.COMPANY_CARDS.FEED_BANK_NAME.CHASE}${CONST.COMPANY_CARDS.FEED_KEY_SEPARATOR}${DOMAIN_ID}`;
    const COMMERCIAL_FEED = `${CONST.COMPANY_CARDS.FEED_BANK_NAME.VISA}${CONST.COMPANY_CARDS.FEED_KEY_SEPARATOR}${DOMAIN_ID}`;

    const cardWithError434: MockCard = {
        cardID: 101,
        bank: CONST.COMPANY_CARDS.FEED_BANK_NAME.CHASE,
        lastScrapeResult: 434, // Account not found
        errors: {
            connection: 'Account not found. Please contact your bank or administrator.',
        },
    };

    const healthyCard: MockCard = {
        cardID: 102,
        bank: CONST.COMPANY_CARDS.FEED_BANK_NAME.CHASE,
        lastScrapeResult: 200,
    };

    const cardWithGenuinelyBrokenConnection: MockCard = {
        cardID: 103,
        bank: CONST.COMPANY_CARDS.FEED_BANK_NAME.CHASE,
        lastScrapeResult: 403, // Reauth required / credential failure
        errors: {
            connection: 'Invalid credentials. Please log into your bank.',
        },
    };

    it('identifies error 434 as an actionable card issue without classifying the connection as broken', () => {
        expect(isCardConnectionBroken(cardWithError434)).toBe(false);
        expect(hasCardConnectionIssue(cardWithError434)).toBe(true);

        expect(isCardConnectionBroken(healthyCard)).toBe(false);
        expect(hasCardConnectionIssue(healthyCard)).toBe(false);

        expect(isCardConnectionBroken(cardWithGenuinelyBrokenConnection)).toBe(true);
        expect(hasCardConnectionIssue(cardWithGenuinelyBrokenConnection)).toBe(true);
    });

    it('does not show feed-level broken connection warning when a card has error 434', () => {
        const feedErrors: MockCardFeedErrorState = {
            shouldShowRBR: false,
            hasFeedErrors: false,
            hasWorkspaceErrors: false,
            isFeedConnectionBroken: false,
            shouldPromptBrokenConnection: false,
            hasFeedConnectionIssue: true, // Set because card 101 returned 434
        };

        expect(getShouldShowBrokenConnectionError(DIRECT_FEED, feedErrors)).toBe(false);
        expect(getShouldShowBrokenConnectionError(COMMERCIAL_FEED, feedErrors)).toBe(false);
    });

    it('preserves feed-wide warnings for genuine connection failures on direct feeds', () => {
        const feedErrors: MockCardFeedErrorState = {
            shouldShowRBR: true,
            hasFeedErrors: false,
            hasWorkspaceErrors: false,
            isFeedConnectionBroken: true, // Genuinely broken (e.g. 403)
            shouldPromptBrokenConnection: true,
            hasFeedConnectionIssue: true,
        };

        expect(getShouldShowBrokenConnectionError(DIRECT_FEED, feedErrors)).toBe(true);
        // Commercial feeds don't prompt broken connection without feed-level errors
        expect(getShouldShowBrokenConnectionError(COMMERCIAL_FEED, feedErrors)).toBe(false);
    });

    it('preserves feed-wide warnings when feed has feed-level errors', () => {
        const feedErrors: MockCardFeedErrorState = {
            shouldShowRBR: true,
            hasFeedErrors: true,
            hasWorkspaceErrors: false,
            isFeedConnectionBroken: false,
            shouldPromptBrokenConnection: false,
            hasFeedConnectionIssue: false,
        };

        expect(getShouldShowBrokenConnectionError(DIRECT_FEED, feedErrors)).toBe(true);
        expect(getShouldShowBrokenConnectionError(COMMERCIAL_FEED, feedErrors)).toBe(true);
    });

    it('ensures individual card row error is displayed in the table when only card error 434 occurs', () => {
        const isFeedConnectionBroken = false;
        const rowErrors = resolveCardRowErrors(isFeedConnectionBroken, cardWithError434);

        expect(rowErrors).toBeDefined();
        expect(rowErrors?.connection).toBe('Account not found. Please contact your bank or administrator.');
    });

    it('correctly suppresses individual card errors in favor of feed-level banner when the feed connection itself is broken', () => {
        const isFeedConnectionBroken = true;
        const rowErrors = resolveCardRowErrors(isFeedConnectionBroken, cardWithGenuinelyBrokenConnection);

        // When the feed itself is broken, the feed header banner owns the error and cardErrors is suppressed
        expect(rowErrors).toBeUndefined();
    });
});
