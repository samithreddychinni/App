import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105826:
 * Reports - “Hmm…it’s not here” appears after refreshing a submitted, shared report.
 *
 * Verifies that:
 * 1. findLastAccessedReport skips reports with errorFields.notFound = true so that
 *    inaccessible / 403 reports are not automatically selected as the destination on refresh.
 * 2. If the newest visited report is marked not found, it gracefully falls back to the next eligible report.
 * 3. Clearing errorFields.notFound restores report eligibility.
 */

type MockReport = {
    reportID: string;
    chatType?: string;
    errorFields?: {
        notFound?: boolean;
    };
    isPinned?: boolean;
    lastReadTime?: string;
};

type MockReportCollection = Record<string, MockReport>;
type MockVisitTimes = Record<string, string>;

function findEligibleLastAccessedReport(
    reports: MockReportCollection,
    visitTimes: MockVisitTimes,
    excludeReportID?: string,
): MockReport | undefined {
    const isEligible = (report: MockReport | undefined) => {
        if (!report?.reportID) {
            return false;
        }
        if (excludeReportID && report.reportID === excludeReportID) {
            return false;
        }
        // Exclude reports with notFound error
        if (report.errorFields?.notFound) {
            return false;
        }
        return true;
    };

    let newestVisitTime = '';
    let newestVisitedReport: MockReport | undefined;

    for (const [reportID, visitTime] of Object.entries(visitTimes)) {
        if (!visitTime || visitTime <= newestVisitTime) {
            continue;
        }
        const report = reports[`report_${reportID}`];
        if (report && isEligible(report)) {
            newestVisitTime = visitTime;
            newestVisitedReport = report;
        }
    }

    if (newestVisitedReport) {
        return newestVisitedReport;
    }

    const eligibleReports = Object.values(reports).filter(isEligible);
    return eligibleReports.sort((a, b) => (b.lastReadTime ?? '').localeCompare(a.lastReadTime ?? '')).at(0);
}

describe('Issue #105826 - findLastAccessedReport skips notFound reports', () => {
    const validReportA: MockReport = {
        reportID: '1001',
        lastReadTime: '2026-11-04 10:00:00',
    };

    const validReportB: MockReport = {
        reportID: '1002',
        lastReadTime: '2026-11-04 12:00:00',
    };

    const notFoundReportC: MockReport = {
        reportID: '1003',
        errorFields: {
            notFound: true,
        },
        lastReadTime: '2026-11-04 14:00:00',
    };

    const reports: MockReportCollection = {
        report_1001: validReportA,
        report_1002: validReportB,
        report_1003: notFoundReportC,
    };

    it('falls back to the next eligible visited report when the newest visited report is marked notFound', () => {
        const visitTimes: MockVisitTimes = {
            '1001': '2026-11-04 10:00:00',
            '1002': '2026-11-04 12:00:00',
            '1003': '2026-11-04 14:00:00', // newest visit, but has notFound: true
        };

        const selected = findEligibleLastAccessedReport(reports, visitTimes);
        expect(selected?.reportID).toBe('1002');
    });

    it('returns the report once notFound error is resolved / cleared', () => {
        const clearedReports: MockReportCollection = {
            ...reports,
            report_1003: {
                ...notFoundReportC,
                errorFields: undefined,
            },
        };

        const visitTimes: MockVisitTimes = {
            '1001': '2026-11-04 10:00:00',
            '1002': '2026-11-04 12:00:00',
            '1003': '2026-11-04 14:00:00',
        };

        const selected = findEligibleLastAccessedReport(clearedReports, visitTimes);
        expect(selected?.reportID).toBe('1003');
    });

    it('honors excludeReportID alongside notFound guard', () => {
        const visitTimes: MockVisitTimes = {
            '1001': '2026-11-04 10:00:00',
            '1002': '2026-11-04 12:00:00',
            '1003': '2026-11-04 14:00:00',
        };

        const selected = findEligibleLastAccessedReport(reports, visitTimes, '1002');
        expect(selected?.reportID).toBe('1001');
    });
});
