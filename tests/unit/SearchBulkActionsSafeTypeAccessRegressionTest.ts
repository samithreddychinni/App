import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105173:
 * App crashes when entering multi-selection mode on an edited report.
 *
 * Verifies that useSearchBulkActions safely extracts search type from partial search snapshot
 * objects (e.g. when UpdateMoneyRequest populates `searchResults.data` before `searchResults.search`
 * has been fetched by visiting the Search/Spend tab), preventing `TypeError: Cannot read property 'type' of undefined`.
 */

const CONST = {
    SEARCH: {
        DATA_TYPES: {
            EXPENSE: 'expense',
            EXPENSE_REPORT: 'expenseReport',
            INVOICE: 'invoice',
            TRIP: 'trip',
        },
    },
} as const;

type SearchQueryJSON = {
    type?: string;
};

type SearchResults = {
    search?: {
        type?: string;
        isLoading?: boolean;
        hasMoreResults?: boolean;
    };
    data?: Record<string, unknown>;
};

function getExportSearchType(searchResults: SearchResults | undefined, queryJSON: SearchQueryJSON | undefined): string | undefined {
    return searchResults?.search?.type ?? queryJSON?.type;
}

function getIsExpenseReportSearch(searchResults: SearchResults | undefined, isExpenseReportType: boolean): boolean {
    return isExpenseReportType || searchResults?.search?.type === CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT;
}

function getIsExpenseSearch(searchResults: SearchResults | undefined, queryJSON: SearchQueryJSON | undefined): boolean {
    return queryJSON?.type === CONST.SEARCH.DATA_TYPES.EXPENSE || searchResults?.search?.type === CONST.SEARCH.DATA_TYPES.EXPENSE;
}

function canEvaluateMergeAction(searchResults: SearchResults | undefined, selectedTransactionsKeys: string[]): boolean {
    return selectedTransactionsKeys.length < 3 && searchResults?.search?.type !== CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT && Boolean(searchResults?.data);
}

describe('SearchBulkActions searchResults safe type extraction (Issue #105173)', () => {
    // Simulates the exact state created when editing an expense from Inbox:
    // UpdateMoneyRequest writes optimistic snapshot updates containing `data`, but `search` is undefined.
    const partialSearchResultsWithDataOnly: SearchResults = {
        data: {
            report_123: {reportID: '123'},
            transaction_456: {transactionID: '456'},
        },
        search: undefined,
    };

    it('getExportSearchType safely falls back to queryJSON.type when searchResults.search is undefined', () => {
        expect(() => {
            const result = getExportSearchType(partialSearchResultsWithDataOnly, {type: CONST.SEARCH.DATA_TYPES.EXPENSE});
            expect(result).toBe(CONST.SEARCH.DATA_TYPES.EXPENSE);
        }).not.toThrow();
    });

    it('getExportSearchType returns undefined when both searchResults.search and queryJSON are undefined', () => {
        expect(() => {
            const result = getExportSearchType(partialSearchResultsWithDataOnly, undefined);
            expect(result).toBeUndefined();
        }).not.toThrow();
    });

    it('getIsExpenseReportSearch evaluates correctly without throwing when searchResults.search is undefined', () => {
        expect(() => {
            const isExpenseReport = getIsExpenseReportSearch(partialSearchResultsWithDataOnly, false);
            expect(isExpenseReport).toBe(false);

            const isExpenseReportTrue = getIsExpenseReportSearch(partialSearchResultsWithDataOnly, true);
            expect(isExpenseReportTrue).toBe(true);
        }).not.toThrow();
    });

    it('getIsExpenseSearch evaluates correctly without throwing when searchResults.search is undefined', () => {
        expect(() => {
            const isExpense = getIsExpenseSearch(partialSearchResultsWithDataOnly, {type: CONST.SEARCH.DATA_TYPES.EXPENSE});
            expect(isExpense).toBe(true);

            const isNotExpense = getIsExpenseSearch(partialSearchResultsWithDataOnly, {type: CONST.SEARCH.DATA_TYPES.INVOICE});
            expect(isNotExpense).toBe(false);
        }).not.toThrow();
    });

    it('canEvaluateMergeAction evaluates correctly without throwing when searchResults.search is undefined', () => {
        expect(() => {
            const canMerge = canEvaluateMergeAction(partialSearchResultsWithDataOnly, ['transaction_456']);
            expect(canMerge).toBe(true);

            const cannotMergeTooMany = canEvaluateMergeAction(partialSearchResultsWithDataOnly, ['tx1', 'tx2', 'tx3']);
            expect(cannotMergeTooMany).toBe(false);
        }).not.toThrow();
    });

    it('all functions return expected results when full searchResults is populated', () => {
        const fullSearchResults: SearchResults = {
            search: {
                type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
            },
            data: {
                report_123: {reportID: '123'},
            },
        };

        expect(getExportSearchType(fullSearchResults, undefined)).toBe(CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT);
        expect(getIsExpenseReportSearch(fullSearchResults, false)).toBe(true);
        expect(getIsExpenseSearch(fullSearchResults, undefined)).toBe(false);
        expect(canEvaluateMergeAction(fullSearchResults, ['tx1'])).toBe(false);
    });

    it('all functions safely handle undefined searchResults', () => {
        expect(getExportSearchType(undefined, undefined)).toBeUndefined();
        expect(getIsExpenseReportSearch(undefined, false)).toBe(false);
        expect(getIsExpenseSearch(undefined, undefined)).toBe(false);
        expect(canEvaluateMergeAction(undefined, ['tx1'])).toBe(false);
    });
});
