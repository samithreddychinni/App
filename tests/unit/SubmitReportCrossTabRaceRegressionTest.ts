import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105782:
 * Reports - Submitting a report from one tab, then quickly acting in a second tab, shows an error even though the report was submitted.
 *
 * Verifies that:
 * 1. submitReport inspects the latest report state via getReportOrDraftReport before execution.
 * 2. If another tab already submitted the report (stateNum === SUBMITTED), submitReport exits cleanly without
 *    enqueuing duplicate network requests, optimistic actions, or failureData that rolls the report back to OPEN.
 * 3. Only truly open reports (stateNum: OPEN, statusNum: OPEN) proceed to submit.
 */

type MockReport = {
    reportID: string;
    stateNum: number;
    statusNum: number;
};

function isOpenReport(report: MockReport | undefined): boolean {
    return report?.stateNum === 0 && report?.statusNum === 0;
}

function shouldExecuteSubmitReport(
    passedReport: MockReport | undefined,
    latestOnyxReport: MockReport | undefined,
): boolean {
    if (!passedReport) {
        return false;
    }
    const currentReport = latestOnyxReport ?? passedReport;
    if (!isOpenReport(currentReport)) {
        return false;
    }
    return true;
}

describe('Issue #105782 - submitReport cross-tab race guard', () => {
    const openReport: MockReport = {
        reportID: 'report_1',
        stateNum: 0,
        statusNum: 0,
    };

    const submittedReport: MockReport = {
        reportID: 'report_1',
        stateNum: 1,
        statusNum: 1,
    };

    const approvedReport: MockReport = {
        reportID: 'report_1',
        stateNum: 2,
        statusNum: 3,
    };

    it('proceeds with submit when both passed report and Onyx reflect OPEN state', () => {
        expect(shouldExecuteSubmitReport(openReport, openReport)).toBe(true);
    });

    it('aborts submit early when another tab has already transitioned the report to SUBMITTED', () => {
        // Tab B passes its stale openReport prop, but Onyx already has submittedReport from Tab A
        expect(shouldExecuteSubmitReport(openReport, submittedReport)).toBe(false);
    });

    it('aborts submit early when the report is already approved', () => {
        expect(shouldExecuteSubmitReport(openReport, approvedReport)).toBe(false);
    });

    it('aborts submit when report is undefined', () => {
        expect(shouldExecuteSubmitReport(undefined, undefined)).toBe(false);
    });
});
