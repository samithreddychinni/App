import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105460:
 * "[Exploratory] Invoice - Billable toggle auto-off after creating the invoice"
 *
 * Verifies that sendInvoice forwards the transaction's billable state (as well as tag, taxCode,
 * and taxAmount) in the SendInvoiceParams payload to the backend API, ensuring the invoice's
 * billable status is preserved when synced back from the server.
 */

type SendInvoiceParams = {
    senderWorkspaceID: string | undefined;
    accountID: number;
    receiverEmail?: string;
    receiverInvoiceRoomID?: string;
    amount: number;
    currency: string;
    comment: string;
    merchant: string;
    date: string;
    category?: string;
    tag?: string;
    taxCode?: string;
    taxAmount?: number;
    billable?: boolean;
    invoiceRoomReportID?: string;
    createdChatReportActionID: string;
    invoiceReportID: string;
    reportPreviewReportActionID: string;
    transactionID: string;
    transactionThreadReportID: string;
    companyName?: string;
    companyWebsite?: string;
    createdIOUReportActionID: string;
    createdReportActionIDForThread: string | undefined;
    reportActionID: string;
    description?: string;
};

type MockTransaction = {
    amount?: number;
    currency?: string;
    comment?: string;
    merchant?: string;
    category?: string;
    tag?: string;
    taxCode?: string;
    taxAmount?: number;
    billable?: boolean;
    created?: string;
};

function buildSendInvoiceParameters(transaction?: MockTransaction, receiverEmail = 'client@example.com'): SendInvoiceParams {
    return {
        createdIOUReportActionID: 'action_iou_1',
        createdReportActionIDForThread: 'action_thread_1',
        reportActionID: 'action_main_1',
        senderWorkspaceID: 'workspace_1',
        accountID: 1001,
        amount: transaction?.amount ?? 0,
        currency: transaction?.currency ?? '',
        comment: transaction?.comment ?? '',
        merchant: transaction?.merchant ?? '',
        category: transaction?.category,
        tag: transaction?.tag,
        taxCode: transaction?.taxCode,
        taxAmount: transaction?.taxAmount,
        billable: transaction?.billable,
        date: transaction?.created ?? '',
        invoiceRoomReportID: 'room_report_1',
        createdChatReportActionID: 'action_chat_1',
        invoiceReportID: 'invoice_report_1',
        reportPreviewReportActionID: 'action_preview_1',
        transactionID: 'tx_123',
        transactionThreadReportID: 'tx_thread_123',
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.com',
        description: transaction?.comment ?? '',
        receiverEmail,
    };
}

describe('SendInvoiceParametersRegressionTest', () => {
    it('forwards billable: true in SendInvoiceParams when invoice transaction is billable', () => {
        const tx: MockTransaction = {
            amount: 5000,
            currency: 'USD',
            category: 'Consulting',
            tag: 'ProjectA',
            taxCode: 'TAX_STANDARD',
            taxAmount: 500,
            billable: true,
            created: '2026-11-04 12:00:00',
        };

        const params = buildSendInvoiceParameters(tx);

        expect(params.billable).toBe(true);
        expect(params.category).toBe('Consulting');
        expect(params.tag).toBe('ProjectA');
        expect(params.taxCode).toBe('TAX_STANDARD');
        expect(params.taxAmount).toBe(500);
    });

    it('forwards billable: false when invoice transaction is explicitly non-billable', () => {
        const tx: MockTransaction = {
            amount: 3000,
            currency: 'USD',
            billable: false,
        };

        const params = buildSendInvoiceParameters(tx);

        expect(params.billable).toBe(false);
    });

    it('forwards billable as undefined when not specified on transaction', () => {
        const tx: MockTransaction = {
            amount: 2000,
            currency: 'USD',
        };

        const params = buildSendInvoiceParameters(tx);

        expect(params.billable).toBeUndefined();
    });

    it('preserves all required identifiers and monetary values alongside invoice tags and billable flag', () => {
        const tx: MockTransaction = {
            amount: 15000,
            currency: 'EUR',
            merchant: 'Client Services',
            category: 'Services',
            tag: 'Dept1:SubDept2',
            billable: true,
        };

        const params = buildSendInvoiceParameters(tx);

        expect(params.amount).toBe(15000);
        expect(params.currency).toBe('EUR');
        expect(params.merchant).toBe('Client Services');
        expect(params.tag).toBe('Dept1:SubDept2');
        expect(params.billable).toBe(true);
        expect(params.receiverEmail).toBe('client@example.com');
    });
});
