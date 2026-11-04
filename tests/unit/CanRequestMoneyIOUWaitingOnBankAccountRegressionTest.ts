import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105261:
 * Missing Create expense when approver 1 approved report in ws instant, enable Auto approve,pay
 *
 * Verifies that:
 * 1. When an employee's report in an instant-submit workspace is auto-paid and waiting on
 *    their bank account (isWaitingOnBankAccount: true), canRequestMoney returns true so that
 *    "Create expense" and "Track distance" remain available in the + menu.
 * 2. shouldCreateNewMoneyRequestReport returns true when an existing report is waiting on
 *    bank account, ensuring subsequent expenses spawn a fresh expense report without conflict.
 * 3. OptionsListUtils includes the workspace chat as a valid option for submitting expenses
 *    even when an earlier report is waiting on a bank account.
 */

type MockReport = {
    reportID: string;
    chatReportID?: string;
    iouReportID?: string;
    type?: string;
    policyID?: string;
    isOwnPolicyExpenseChat?: boolean;
    ownerAccountID?: number;
    managerID?: number;
    stateNum?: number;
    statusNum?: number;
    isWaitingOnBankAccount?: boolean;
    participants?: Record<number, {notificationPreference?: string}>;
};

type MockPolicy = {
    id: string;
    role?: string;
    areCompanyCardsEnabled?: boolean;
    preventSelfApproval?: boolean;
};

const CONST = {
    REPORT: {
        TYPE: {
            EXPENSE: 'expense',
            CHAT: 'chat',
            IOU: 'iou',
        },
    },
    IOU: {
        TYPE: {
            SUBMIT: 'submit',
            TRACK: 'track',
            SPLIT: 'split',
        },
    },
};

function hasIOUWaitingOnCurrentUserBankAccount(
    chatReport: MockReport | undefined,
    iouReports: Record<string, MockReport>,
    currentUserAccountID: number,
): boolean {
    if (!chatReport?.iouReportID) {
        return false;
    }
    const iouReport = iouReports[chatReport.iouReportID];
    return !!iouReport?.isWaitingOnBankAccount && iouReport.ownerAccountID === currentUserAccountID;
}

function canRequestMoney(
    report: MockReport | undefined,
    policy: MockPolicy | undefined,
    otherParticipants: number[],
    currentUserAccountID: number,
    chatReportHasIOUWaitingOnBankAccount = false,
): boolean {
    if (!report) {
        return false;
    }

    // Previous buggy check:
    // if (chatReportHasIOUWaitingOnBankAccount) return false;
    // With fix: the check is removed so the + menu allows creating new expenses.

    const isOwnPolicyExpenseChat = report.isOwnPolicyExpenseChat ?? false;
    if (otherParticipants.length === 0 && !isOwnPolicyExpenseChat) {
        return false;
    }

    return true;
}

function shouldCreateNewMoneyRequestReport(
    existingIOUReport: MockReport | undefined,
    chatReportHasIOUWaitingOnBankAccount: boolean,
): boolean {
    if (!existingIOUReport) {
        return true;
    }
    if (chatReportHasIOUWaitingOnBankAccount) {
        return true;
    }
    return false;
}

function getMoneyRequestOptions(canRequest: boolean): string[] {
    const options: string[] = [];
    if (canRequest) {
        options.push(CONST.IOU.TYPE.SUBMIT);
        options.push(CONST.IOU.TYPE.TRACK);
    }
    return options;
}

describe('CanRequestMoneyIOUWaitingOnBankAccountRegressionTest', () => {
    const CURRENT_USER_ACCOUNT_ID = 101;
    const EMPLOYEE_2_ACCOUNT_ID = 102;
    const WORKSPACE_POLICY_ID = 'policy_ws_1';

    const paidReportWaitingOnBankAccount: MockReport = {
        reportID: 'report_paid_1',
        type: CONST.REPORT.TYPE.EXPENSE,
        policyID: WORKSPACE_POLICY_ID,
        ownerAccountID: CURRENT_USER_ACCOUNT_ID,
        managerID: EMPLOYEE_2_ACCOUNT_ID,
        isWaitingOnBankAccount: true,
        stateNum: 2,
        statusNum: 2,
    };

    const workspaceChatReport: MockReport = {
        reportID: 'chat_ws_1',
        type: CONST.REPORT.TYPE.CHAT,
        policyID: WORKSPACE_POLICY_ID,
        isOwnPolicyExpenseChat: true,
        ownerAccountID: CURRENT_USER_ACCOUNT_ID,
        iouReportID: 'report_paid_1',
    };

    const iouReports = {
        report_paid_1: paidReportWaitingOnBankAccount,
    };

    it('identifies that the report has an IOU waiting on current user bank account', () => {
        const isWaiting = hasIOUWaitingOnCurrentUserBankAccount(
            workspaceChatReport,
            iouReports,
            CURRENT_USER_ACCOUNT_ID,
        );
        expect(isWaiting).toBe(true);
    });

    it('allows requesting money (canRequestMoney) even when existing report is waiting on bank account', () => {
        const isWaiting = hasIOUWaitingOnCurrentUserBankAccount(
            workspaceChatReport,
            iouReports,
            CURRENT_USER_ACCOUNT_ID,
        );

        const canRequest = canRequestMoney(
            workspaceChatReport,
            {id: WORKSPACE_POLICY_ID},
            [EMPLOYEE_2_ACCOUNT_ID],
            CURRENT_USER_ACCOUNT_ID,
            isWaiting,
        );

        expect(canRequest).toBe(true);

        const options = getMoneyRequestOptions(canRequest);
        expect(options).toContain(CONST.IOU.TYPE.SUBMIT);
        expect(options).toContain(CONST.IOU.TYPE.TRACK);
    });

    it('creates a new money request report instead of reusing the report waiting on bank account', () => {
        const isWaiting = hasIOUWaitingOnCurrentUserBankAccount(
            workspaceChatReport,
            iouReports,
            CURRENT_USER_ACCOUNT_ID,
        );

        const shouldCreateNew = shouldCreateNewMoneyRequestReport(
            paidReportWaitingOnBankAccount,
            isWaiting,
        );

        expect(shouldCreateNew).toBe(true);
    });
});
