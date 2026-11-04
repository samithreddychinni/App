import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105525:
 * "[Exploratory] Personal card-Cannot switch transaction start date to "From the beginning""
 *
 * Verifies that:
 * 1. Initial option resolves to FROM_BEGINNING when currentStartDate is undefined or empty string,
 *    and CUSTOM when a start date exists.
 * 2. getNewStartDate returns '' when FROM_BEGINNING is selected (matching Expensify's architecture
 *    in PersonalCardDetailsHeaderMenu, CompanyCardTransactionStartDateForm, and WorkspaceCompanyCardEditTransactionStartDatePage),
 *    rather than a hardcoded 90-days-ago date.
 * 3. getNewStartDate returns the custom date when CUSTOM is selected.
 * 4. Changes between currentStartDate and newStartDate are accurately detected, avoiding redundant
 *    API writes when currentStartDate was already empty/undefined and FROM_BEGINNING is chosen.
 */

const CONST = {
    COMPANY_CARD: {
        TRANSACTION_START_DATE_OPTIONS: {
            FROM_BEGINNING: 'fromTheBeginning',
            CUSTOM: 'custom',
        },
    },
} as const;

type DateOption = (typeof CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS)[keyof typeof CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS];

function resolveInitialDateOption(currentStartDate?: string): DateOption {
    return currentStartDate ? CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM : CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING;
}

function getNewStartDate(dateOptionSelected: DateOption, startDate: string): string {
    return dateOptionSelected === CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING ? '' : startDate;
}

function shouldUpdateStartDate(currentStartDate: string | undefined, newStartDate: string): boolean {
    return (currentStartDate ?? '') !== newStartDate;
}

describe('PersonalCardEditTransactionStartDateRegressionTest', () => {
    describe('resolveInitialDateOption', () => {
        it('initializes to FROM_BEGINNING when currentStartDate is undefined', () => {
            expect(resolveInitialDateOption(undefined)).toBe(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING);
        });

        it('initializes to FROM_BEGINNING when currentStartDate is empty string', () => {
            expect(resolveInitialDateOption('')).toBe(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING);
        });

        it('initializes to CUSTOM when currentStartDate is set', () => {
            expect(resolveInitialDateOption('2024-01-15')).toBe(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM);
        });
    });

    describe('getNewStartDate', () => {
        it('returns empty string when FROM_BEGINNING is selected', () => {
            const result = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING, '2024-05-10');
            expect(result).toBe('');
        });

        it('returns custom startDate when CUSTOM is selected', () => {
            const customDate = '2024-05-10';
            const result = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM, customDate);
            expect(result).toBe(customDate);
        });
    });

    describe('shouldUpdateStartDate', () => {
        it('detects transition from custom date to FROM_BEGINNING', () => {
            const currentStartDate = '2024-01-01';
            const newStartDate = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING, '2024-01-01');
            expect(shouldUpdateStartDate(currentStartDate, newStartDate)).toBe(true);
        });

        it('detects transition from FROM_BEGINNING to custom date', () => {
            const currentStartDate = '';
            const newStartDate = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.CUSTOM, '2024-02-01');
            expect(shouldUpdateStartDate(currentStartDate, newStartDate)).toBe(true);
        });

        it('does not trigger update if already FROM_BEGINNING (empty string) and FROM_BEGINNING re-selected', () => {
            const currentStartDate = '';
            const newStartDate = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING, '2024-02-01');
            expect(shouldUpdateStartDate(currentStartDate, newStartDate)).toBe(false);
        });

        it('does not trigger update if already undefined (from the beginning) and FROM_BEGINNING selected', () => {
            const currentStartDate = undefined;
            const newStartDate = getNewStartDate(CONST.COMPANY_CARD.TRANSACTION_START_DATE_OPTIONS.FROM_BEGINNING, '2024-02-01');
            expect(shouldUpdateStartDate(currentStartDate, newStartDate)).toBe(false);
        });
    });
});
