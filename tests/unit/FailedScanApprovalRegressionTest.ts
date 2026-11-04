/** An approver needs at least one complete expense, including when other expenses failed SmartScan. */
import getReportPreviewAction from '@libs/ReportPreviewActionUtils';
import {isApproveAction} from '@libs/ReportPrimaryActionUtils';
import {canApproveIOU} from '@libs/ReportUtils';
import {hasOnlyUnsettledOrPendingExpenses} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import type {Policy, Report, Transaction} from '@src/types/onyx';

import createMock from '../utils/createMock';

const report = createMock<Report>({
    reportID: '100',
    type: CONST.REPORT.TYPE.EXPENSE,
    ownerAccountID: 1,
    managerID: 2,
    stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
    statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
});
const policy = createMock<Policy>({id: 'policy', type: CONST.POLICY.TYPE.CORPORATE, approvalMode: CONST.POLICY.APPROVAL_MODE.ADVANCED});
const failed = createMock<Transaction>({
    transactionID: '1',
    reportID: '100',
    iouRequestType: CONST.IOU.REQUEST_TYPE.SCAN,
    amount: 0,
    merchant: CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT,
    created: '2026-11-01',
    receipt: {state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED},
});
const complete = createMock<Transaction>({transactionID: '2', reportID: '100', amount: -100, merchant: 'Coffee', created: '2026-11-01'});

describe('Approve after failed SmartScan', () => {
    it.each([
        [[failed], false],
        [[failed, complete], true],
        [[{...failed, modifiedAmount: -100, modifiedMerchant: 'Coffee'}], true],
        [[{...complete, status: CONST.TRANSACTION.STATUS.PENDING}], false],
        [[], false],
    ] as const)('keeps header and report-list approval consistent for %j', (expenses, canApprove) => {
        // Given a submitted report whose receipts may be incomplete or manually corrected
        const transactions = [...expenses];
        // When both action sources evaluate it for the assigned approver
        const header = isApproveAction(report, transactions, 2, undefined, policy);
        const list = canApproveIOU(report, policy, undefined, 2, transactions);
        const preview = getReportPreviewAction({
            report,
            policy,
            transactions,
            currentUserAccountID: 2,
            currentUserLogin: 'approver@example.com',
            ownerLogin: 'owner@example.com',
            isReportArchived: false,
            bankAccountList: {},
            reportMetadata: undefined,
            rules: undefined,
        });
        // Then one complete expense permits approval, while an empty or wholly unfinished report does not
        expect(header).toBe(canApprove);
        expect(list).toBe(canApprove);
        expect(preview === CONST.REPORT.REPORT_PREVIEW_ACTIONS.APPROVE).toBe(canApprove);
    });

    it('does not mistake an empty report for unfinished expenses', () => {
        // Given no transactions have loaded
        const transactions: Transaction[] = [];
        // When the shared guard runs
        const unfinished = hasOnlyUnsettledOrPendingExpenses(transactions, report);
        // Then its callers retain their own empty-report handling
        expect(unfinished).toBe(false);
    });
});
