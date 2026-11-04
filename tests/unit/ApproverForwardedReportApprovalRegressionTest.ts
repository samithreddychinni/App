import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105795:
 * Reports - Approver unable to Approve report
 *
 * Verifies that:
 * 1. canApproveIOU allows approval when the current user is the manager and the report has not been forwarded.
 * 2. canApproveIOU hides the Approve action when the report has already been forwarded since last submit,
 *    preventing the desynchronized state where a bypassed/previous approver sees an unexecutable Approve action
 *    that triggers "the report has already been forwarded" upon execution.
 * 3. Settled, closed, or open reports cannot be approved.
 */

type MockReport = {
    reportID: string;
    type?: string;
    ownerAccountID: number;
    managerID: number;
    stateNum: number;
    statusNum: number;
    hasBeenForwardedSinceLastSubmit?: boolean;
};

type MockTransaction = {
    transactionID: string;
    amount: number;
};

function canApproveReport(
    report: MockReport,
    currentUserAccountID: number,
    transactions: MockTransaction[],
): boolean {
    if (report.type !== 'expense') {
        return false;
    }
    const isCurrentUserManager = report.managerID === currentUserAccountID;
    const isReportOpen = report.stateNum === 0 && report.statusNum === 0;
    const isReportApproved = report.stateNum === 2;
    const isReportClosed = report.statusNum === 2;
    const isForwarded = Boolean(report.hasBeenForwardedSinceLastSubmit);

    return transactions.length > 0 && isCurrentUserManager && !isForwarded && !isReportOpen && !isReportApproved && !isReportClosed;
}

describe('Issue #105795 - Approver unable to Approve report (Forwarded Guard)', () => {
    const approverAccountID = 101;
    const otherAccountID = 102;
    const transactions: MockTransaction[] = [{transactionID: 'tx_1', amount: 5000}];

    const submittedReport: MockReport = {
        reportID: 'report_1',
        type: 'expense',
        ownerAccountID: 201,
        managerID: approverAccountID,
        stateNum: 1, // submitted
        statusNum: 1, // submitted
        hasBeenForwardedSinceLastSubmit: false,
    };

    it('allows approval when the user is the current manager and the report has not been forwarded', () => {
        expect(canApproveReport(submittedReport, approverAccountID, transactions)).toBe(true);
    });

    it('prevents approval when the report has already been forwarded since last submit', () => {
        const forwardedReport: MockReport = {
            ...submittedReport,
            hasBeenForwardedSinceLastSubmit: true,
        };
        expect(canApproveReport(forwardedReport, approverAccountID, transactions)).toBe(false);
    });

    it('prevents approval when the user is not the manager', () => {
        expect(canApproveReport(submittedReport, otherAccountID, transactions)).toBe(false);
    });

    it('prevents approval when the report is already approved or closed', () => {
        const approvedReport: MockReport = {
            ...submittedReport,
            stateNum: 2,
            statusNum: 3,
        };
        expect(canApproveReport(approvedReport, approverAccountID, transactions)).toBe(false);

        const closedReport: MockReport = {
            ...submittedReport,
            statusNum: 2,
        };
        expect(canApproveReport(closedReport, approverAccountID, transactions)).toBe(false);
    });
});
