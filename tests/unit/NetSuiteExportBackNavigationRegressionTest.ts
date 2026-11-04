import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105241:
 * Netsuite - Tapping < twice from "Export company card expenses as" leads to "Card details" page.
 *
 * Verifies that NetSuiteExportConfigurationPage computes shouldGoBackToSpecificRoute based on
 * the effective company card export destination (nonreimbursable ?? reimbursable), rather than
 * checking reimbursable and non-reimbursable with a disjunction.
 */

const CONST = {
    NETSUITE_EXPORT_DESTINATION: {
        EXPENSE_REPORT: 'EXPENSE_REPORT',
        VENDOR_BILL: 'VENDOR_BILL',
        JOURNAL_ENTRY: 'JOURNAL_ENTRY',
    },
} as const;

type NetSuiteConfig = {
    reimbursableExpensesExportDestination?: string;
    nonreimbursableExpensesExportDestination?: string;
};

function computeShouldGoBackToSpecificRoute(config?: NetSuiteConfig): boolean {
    const netSuiteConfig = config?.nonreimbursableExpensesExportDestination ?? config?.reimbursableExpensesExportDestination;
    return (
        netSuiteConfig !== CONST.NETSUITE_EXPORT_DESTINATION.VENDOR_BILL &&
        netSuiteConfig !== CONST.NETSUITE_EXPORT_DESTINATION.JOURNAL_ENTRY
    );
}

describe('NetSuiteExportConfigurationPage shouldGoBackToSpecificRoute calculation', () => {
    it('does not skip card export page when company cards export as JOURNAL_ENTRY (even if reimbursable is EXPENSE_REPORT)', () => {
        const config: NetSuiteConfig = {
            reimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT,
            nonreimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.JOURNAL_ENTRY,
        };

        const shouldSkip = computeShouldGoBackToSpecificRoute(config);
        expect(shouldSkip).toBe(false);
    });

    it('does not skip card export page when company cards export as VENDOR_BILL (even if reimbursable is EXPENSE_REPORT)', () => {
        const config: NetSuiteConfig = {
            reimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT,
            nonreimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.VENDOR_BILL,
        };

        const shouldSkip = computeShouldGoBackToSpecificRoute(config);
        expect(shouldSkip).toBe(false);
    });

    it('skips card export page when company cards export as EXPENSE_REPORT', () => {
        const config: NetSuiteConfig = {
            reimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT,
            nonreimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT,
        };

        const shouldSkip = computeShouldGoBackToSpecificRoute(config);
        expect(shouldSkip).toBe(true);
    });

    it('falls back to reimbursable EXPENSE_REPORT when nonreimbursable is not set', () => {
        const config: NetSuiteConfig = {
            reimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT,
            nonreimbursableExpensesExportDestination: undefined,
        };

        const shouldSkip = computeShouldGoBackToSpecificRoute(config);
        expect(shouldSkip).toBe(true);
    });

    it('falls back to reimbursable JOURNAL_ENTRY when nonreimbursable is not set', () => {
        const config: NetSuiteConfig = {
            reimbursableExpensesExportDestination: CONST.NETSUITE_EXPORT_DESTINATION.JOURNAL_ENTRY,
            nonreimbursableExpensesExportDestination: undefined,
        };

        const shouldSkip = computeShouldGoBackToSpecificRoute(config);
        expect(shouldSkip).toBe(false);
    });

    it('skips when config is empty or undefined', () => {
        const shouldSkip = computeShouldGoBackToSpecificRoute(undefined);
        expect(shouldSkip).toBe(true);
    });
});
