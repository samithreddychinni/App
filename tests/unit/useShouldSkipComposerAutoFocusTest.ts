import {describe, expect, it} from '@jest/globals';

/**
 * Tests for useShouldSkipComposerAutoFocus logic.
 * Verifies that auto-focus is skipped on web for SEARCH_MONEY_REQUEST_REPORT
 * when search query navigation is present, while preserving central pane auto-focus.
 */

describe('useShouldSkipComposerAutoFocus logic', () => {
    function computeShouldSkipAutoFocus({
        isWeb,
        routeName,
        hasExpenseCarousel,
        isExpenseView,
        hasSearchReportCarousel,
    }: {
        isWeb: boolean;
        routeName: string | undefined;
        hasExpenseCarousel: boolean;
        isExpenseView: boolean;
        hasSearchReportCarousel: boolean;
    }): boolean {
        const isSearchMoneyRequestReport = routeName === 'Search_Money_Request_Report';
        const isCentralReport = routeName === 'Report';
        return isWeb && !isCentralReport && ((hasExpenseCarousel && isExpenseView) || (isSearchMoneyRequestReport && hasSearchReportCarousel));
    }

    it('skips auto-focus on SEARCH_MONEY_REQUEST_REPORT when search query is present on web', () => {
        const shouldSkip = computeShouldSkipAutoFocus({
            isWeb: true,
            routeName: 'Search_Money_Request_Report',
            hasExpenseCarousel: false,
            isExpenseView: true,
            hasSearchReportCarousel: true,
        });
        expect(shouldSkip).toBe(true);
    });

    it('does not skip auto-focus on SEARCH_MONEY_REQUEST_REPORT when no search query is active', () => {
        const shouldSkip = computeShouldSkipAutoFocus({
            isWeb: true,
            routeName: 'Search_Money_Request_Report',
            hasExpenseCarousel: false,
            isExpenseView: true,
            hasSearchReportCarousel: false,
        });
        expect(shouldSkip).toBe(false);
    });

    it('never skips auto-focus on central Report screen', () => {
        const shouldSkip = computeShouldSkipAutoFocus({
            isWeb: true,
            routeName: 'Report',
            hasExpenseCarousel: true,
            isExpenseView: true,
            hasSearchReportCarousel: true,
        });
        expect(shouldSkip).toBe(false);
    });

    it('never skips auto-focus on native platforms', () => {
        const shouldSkip = computeShouldSkipAutoFocus({
            isWeb: false,
            routeName: 'Search_Money_Request_Report',
            hasExpenseCarousel: true,
            isExpenseView: true,
            hasSearchReportCarousel: true,
        });
        expect(shouldSkip).toBe(false);
    });

    it('skips auto-focus in standard expense carousel with multiple expenses', () => {
        const shouldSkip = computeShouldSkipAutoFocus({
            isWeb: true,
            routeName: 'Search_Report',
            hasExpenseCarousel: true,
            isExpenseView: true,
            hasSearchReportCarousel: false,
        });
        expect(shouldSkip).toBe(true);
    });
});
