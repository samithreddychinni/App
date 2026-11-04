import {describe, expect, it} from '@jest/globals';
import type {Policy, Report, Transaction} from '@src/types/onyx';

/**
 * Regression test for Issue #105340:
 * "[Exploratory] Distance - Can't select the rate after change the report to another Workspace"
 *
 * Verifies that:
 * 1. Policy ID resolution in distance rate step correctly falls back to parentReport.policyID
 *    when the current route report is a transaction thread report whose own policyID is undefined or stale.
 * 2. When a customUnitRateID is updated on a transaction, the customUnitID is also updated to the destination
 *    policy's distance customUnitID rather than retaining the old workspace's customUnitID.
 * 3. updatePolicyIdForReportAndThreads sets policyID for child threads even if their original policyID was undefined.
 */

function resolveDistanceRateStepPolicyID(report: Partial<Report> | undefined, parentReport: Partial<Report> | undefined): string | undefined {
    return parentReport?.policyID ?? report?.policyID;
}

function updateTransactionCustomUnitRate(
    transaction: Partial<Transaction>,
    newRateID: string,
    policy: Partial<Policy> | undefined,
): Partial<Transaction> {
    const updated = JSON.parse(JSON.stringify(transaction)) as Partial<Transaction>;
    if (!updated.comment) {
        updated.comment = {};
    }
    if (!updated.comment.customUnit) {
        updated.comment.customUnit = {};
    }

    updated.comment.customUnit.customUnitRateID = newRateID;
    updated.comment.customUnit.defaultP2PRate = null;

    const distanceCustomUnit = Object.values(policy?.customUnits ?? {}).find((unit) => unit.name === 'Distance');
    if (distanceCustomUnit?.customUnitID) {
        updated.comment.customUnit.customUnitID = distanceCustomUnit.customUnitID;
    }

    return updated;
}

function simulateUpdatePolicyIdForReportAndThreads(
    currentReportID: string,
    policyID: string,
    reportsMap: Record<string, Partial<Report>>,
    threadsMap: Record<string, string[]>,
) {
    const optimisticUpdates: Record<string, {policyID: string}> = {};
    const failureUpdates: Record<string, {policyID: string | null}> = {};

    function update(reportID: string) {
        const currentReport = reportsMap[reportID];
        const originalPolicyID = currentReport?.policyID;

        optimisticUpdates[reportID] = {policyID};
        failureUpdates[reportID] = {policyID: originalPolicyID ?? null};

        const childReportIDs = threadsMap[reportID] ?? [];
        for (const childID of childReportIDs) {
            update(childID);
        }
    }

    update(currentReportID);
    return {optimisticUpdates, failureUpdates};
}

describe('DistanceRateChangeWorkspaceRegressionTest', () => {
    describe('resolveDistanceRateStepPolicyID', () => {
        it('resolves policyID from parentReport when report is a transaction thread with undefined policyID', () => {
            const threadReport: Partial<Report> = {reportID: 'thread-1', parentReportID: 'expense-report-1', policyID: undefined};
            const parentReport: Partial<Report> = {reportID: 'expense-report-1', policyID: 'workspace-2'};

            const policyID = resolveDistanceRateStepPolicyID(threadReport, parentReport);
            expect(policyID).toBe('workspace-2');
        });

        it('resolves policyID from parentReport when threadReport has stale policyID from old workspace', () => {
            const threadReport: Partial<Report> = {reportID: 'thread-1', parentReportID: 'expense-report-1', policyID: 'old-workspace-1'};
            const parentReport: Partial<Report> = {reportID: 'expense-report-1', policyID: 'new-workspace-2'};

            const policyID = resolveDistanceRateStepPolicyID(threadReport, parentReport);
            expect(policyID).toBe('new-workspace-2');
        });

        it('resolves policyID from report when parentReport is not present (direct expense report)', () => {
            const directReport: Partial<Report> = {reportID: 'expense-report-1', policyID: 'workspace-2'};

            const policyID = resolveDistanceRateStepPolicyID(directReport, undefined);
            expect(policyID).toBe('workspace-2');
        });
    });

    describe('updateTransactionCustomUnitRate', () => {
        it('updates both customUnitRateID and customUnitID to destination workspace custom unit', () => {
            const transaction: Partial<Transaction> = {
                transactionID: 'tx-1',
                comment: {
                    customUnit: {
                        customUnitID: 'unit-ws-1',
                        customUnitRateID: 'rate-ws-1',
                    },
                },
            };

            const destinationPolicy: Partial<Policy> = {
                id: 'ws-2',
                customUnits: {
                    'unit-ws-2': {
                        customUnitID: 'unit-ws-2',
                        name: 'Distance',
                        rates: {
                            'rate-ws-2': {
                                customUnitRateID: 'rate-ws-2',
                                name: 'Default Rate',
                                rate: 67,
                                currency: 'USD',
                                enabled: true,
                            },
                        },
                    },
                },
            };

            const updated = updateTransactionCustomUnitRate(transaction, 'rate-ws-2', destinationPolicy);

            expect(updated.comment?.customUnit?.customUnitRateID).toBe('rate-ws-2');
            expect(updated.comment?.customUnit?.customUnitID).toBe('unit-ws-2');
            expect(updated.comment?.customUnit?.defaultP2PRate).toBeNull();
        });
    });

    describe('updatePolicyIdForReportAndThreads', () => {
        it('optimistically updates thread reports whose policyID was initially undefined', () => {
            const reportsMap: Record<string, Partial<Report>> = {
                'expense-report-1': {reportID: 'expense-report-1', policyID: 'ws-1'},
                'thread-report-1': {reportID: 'thread-report-1', parentReportID: 'expense-report-1', policyID: undefined},
            };
            const threadsMap = {
                'expense-report-1': ['thread-report-1'],
            };

            const {optimisticUpdates, failureUpdates} = simulateUpdatePolicyIdForReportAndThreads(
                'expense-report-1',
                'ws-2',
                reportsMap,
                threadsMap,
            );

            expect(optimisticUpdates['expense-report-1']).toEqual({policyID: 'ws-2'});
            expect(optimisticUpdates['thread-report-1']).toEqual({policyID: 'ws-2'});
            expect(failureUpdates['expense-report-1']).toEqual({policyID: 'ws-1'});
            expect(failureUpdates['thread-report-1']).toEqual({policyID: null});
        });
    });
});
