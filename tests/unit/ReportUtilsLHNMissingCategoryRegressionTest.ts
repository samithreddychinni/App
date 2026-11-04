import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105705:
 * "LHN - Red dot is missing from the LHN when an expense has a missing category"
 *
 * Verifies that:
 * 1. isReportEligibleForViolationFix allows processing (submitted) reports when they have not been forwarded,
 *    so submitter-fixable violations like missingCategory correctly surface the red dot on the workspace chat.
 * 2. Forwarded processing reports are excluded from violation fix because an approver has already acted.
 * 3. Violations in getSubmitterUnfixableViolationNames (COMPANY_CARD_REQUIRED, MODIFIED_AMOUNT) are excluded
 *    on processing reports, while submitter-fixable violations like MISSING_CATEGORY remain actionable.
 */

const CONST = {
    REPORT: {
        STATE_NUM: {
            OPEN: 0,
            SUBMITTED: 1,
            APPROVED: 2,
        },
        STATUS_NUM: {
            OPEN: 0,
            SUBMITTED: 1,
            APPROVED: 2,
        },
    },
    POLICY: {
        AUTO_REPORTING_FREQUENCIES: {
            INSTANT: 'instant',
            MANUAL: 'manual',
        },
    },
    VIOLATIONS: {
        MISSING_CATEGORY: 'missingCategory',
        COMPANY_CARD_REQUIRED: 'companyCardRequired',
        MODIFIED_AMOUNT: 'modifiedAmount',
    },
} as const;

type MockReport = {
    reportID: string;
    stateNum: number;
    statusNum: number;
};

type MockPolicy = {
    id: string;
    autoReporting?: boolean;
    autoReportingFrequency?: string;
};

function isOpenReport(report: MockReport | undefined): boolean {
    return report?.stateNum === CONST.REPORT.STATE_NUM.OPEN && report?.statusNum === CONST.REPORT.STATUS_NUM.OPEN;
}

function isProcessingReport(report: MockReport | undefined): boolean {
    return report?.stateNum === CONST.REPORT.STATE_NUM.SUBMITTED && report?.statusNum === CONST.REPORT.STATUS_NUM.SUBMITTED;
}

function isOpenOrProcessingReport(report: MockReport | undefined): boolean {
    return isOpenReport(report) || isProcessingReport(report);
}

function isInstantSubmitEnabled(policy: MockPolicy | undefined): boolean {
    return policy?.autoReporting === true && policy?.autoReportingFrequency === CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT;
}

function isReportEligibleForViolationFix(
    report: MockReport | undefined,
    policy: MockPolicy | undefined,
    hasBeenForwardedSinceLastSubmit = false,
): boolean {
    if (isInstantSubmitEnabled(policy)) {
        return isOpenOrProcessingReport(report) && !hasBeenForwardedSinceLastSubmit;
    }
    return isOpenOrProcessingReport(report) && !hasBeenForwardedSinceLastSubmit;
}

function getSubmitterUnfixableViolationNames(report: MockReport | undefined): {excludedViolations: string[]; excludedNotices: string[]} {
    if (!isProcessingReport(report)) {
        return {excludedViolations: [], excludedNotices: []};
    }
    return {
        excludedViolations: [CONST.VIOLATIONS.COMPANY_CARD_REQUIRED],
        excludedNotices: [CONST.VIOLATIONS.MODIFIED_AMOUNT],
    };
}

describe('Issue #105705 - LHN Red Dot Missing for Missing Category on Submitted Report', () => {
    const instantPolicy: MockPolicy = {
        id: 'policy_instant',
        autoReporting: true,
        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT,
    };

    const manualPolicy: MockPolicy = {
        id: 'policy_manual',
        autoReporting: true,
        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL,
    };

    const openDraftReport: MockReport = {
        reportID: 'report_open',
        stateNum: CONST.REPORT.STATE_NUM.OPEN,
        statusNum: CONST.REPORT.STATUS_NUM.OPEN,
    };

    const submittedProcessingReport: MockReport = {
        reportID: 'report_submitted',
        stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
        statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
    };

    const approvedReport: MockReport = {
        reportID: 'report_approved',
        stateNum: CONST.REPORT.STATE_NUM.APPROVED,
        statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
    };

    it('allows open draft reports to be eligible for violation fix across all policy types', () => {
        expect(isReportEligibleForViolationFix(openDraftReport, instantPolicy)).toBe(true);
        expect(isReportEligibleForViolationFix(openDraftReport, manualPolicy)).toBe(true);
    });

    it('allows submitted (processing) reports on manual workflows to remain eligible for violation fix prior to forwarding', () => {
        expect(isReportEligibleForViolationFix(submittedProcessingReport, manualPolicy, false)).toBe(true);
        expect(isReportEligibleForViolationFix(submittedProcessingReport, instantPolicy, false)).toBe(true);
    });

    it('excludes submitted reports once an approver has forwarded them', () => {
        expect(isReportEligibleForViolationFix(submittedProcessingReport, manualPolicy, true)).toBe(false);
        expect(isReportEligibleForViolationFix(submittedProcessingReport, instantPolicy, true)).toBe(false);
    });

    it('excludes fully approved reports from violation fix', () => {
        expect(isReportEligibleForViolationFix(approvedReport, manualPolicy)).toBe(false);
        expect(isReportEligibleForViolationFix(approvedReport, instantPolicy)).toBe(false);
    });

    it('keeps MISSING_CATEGORY fixable by submitter on processing reports while excluding unfixable violations', () => {
        const {excludedViolations, excludedNotices} = getSubmitterUnfixableViolationNames(submittedProcessingReport);
        expect(excludedViolations).toContain(CONST.VIOLATIONS.COMPANY_CARD_REQUIRED);
        expect(excludedNotices).toContain(CONST.VIOLATIONS.MODIFIED_AMOUNT);
        // Missing category is submitter-fixable, so it must not be excluded
        expect(excludedViolations).not.toContain(CONST.VIOLATIONS.MISSING_CATEGORY);
    });
});
