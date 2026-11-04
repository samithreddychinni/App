import {describe, expect, it, jest} from '@jest/globals';

/**
 * Regression test for Issue #105756:
 * Unable to create a new Expense from Reports > More > Create Expense.
 *
 * Verifies that buildConfirmAction does not allow a stale `formError` in closure to silently block
 * form submission when the synchronous `validate()` check passes with `{errorKey: null}`.
 * When validation succeeds, `formError` must be cleared and `onConfirm` / `onSendMoney` must execute.
 */

type ValidationResult = {
    errorKey: string | null;
    shouldSetDidConfirmSplit?: boolean;
} | null;

type ConfirmActionParams = {
    iouType: string;
    hasInvoicingDetails: boolean;
    transactionID?: string;
    routeError?: string;
    formError?: string;
    isDelegateAccessRestricted: boolean;
    validate: (paymentMethod?: string) => ValidationResult;
    setFormError: (errorKey: string | null) => void;
    setDidConfirmSplit: (didConfirm: boolean) => void;
    showDelegateNoAccessModal: () => void;
    onConfirm?: () => void;
    onSendMoney?: (paymentMethod?: string) => void;
};

const CONST = {
    IOU: {
        TYPE: {
            SUBMIT: 'submit',
            CREATE: 'create',
            SPLIT: 'split',
            PAY: 'pay',
            INVOICE: 'invoice',
        },
        PAYMENT_TYPE: {
            ELSEWHERE: 'elsewhere',
        },
    },
} as const;

function buildTestConfirmAction({
    iouType,
    hasInvoicingDetails,
    transactionID,
    routeError,
    formError,
    isDelegateAccessRestricted,
    validate,
    setFormError,
    setDidConfirmSplit,
    showDelegateNoAccessModal,
    onConfirm,
    onSendMoney,
}: ConfirmActionParams) {
    return (paymentMethod?: string) => {
        const result = validate(paymentMethod);
        if (!result) {
            return;
        }

        if (result.errorKey) {
            if (result.shouldSetDidConfirmSplit) {
                setDidConfirmSplit(true);
            }
            setFormError(result.errorKey);
            return;
        }

        // Clear any previous form errors once validation succeeds
        if (formError) {
            setFormError('');
        }

        if (iouType === CONST.IOU.TYPE.INVOICE && !hasInvoicingDetails && transactionID && !routeError) {
            return;
        }

        if (iouType !== CONST.IOU.TYPE.PAY) {
            onConfirm?.();
            return;
        }

        // PAY branch
        if (!paymentMethod) {
            return;
        }
        if (isDelegateAccessRestricted) {
            showDelegateNoAccessModal();
            return;
        }
        onSendMoney?.(paymentMethod);
    };
}

describe('ConfirmAction formError regression tests (Issue #105756)', () => {
    it('clears formError and calls onConfirm when validation succeeds even if formError was non-empty', () => {
        const onConfirm = jest.fn();
        const setFormError = jest.fn();
        const validate = jest.fn(() => ({errorKey: null}));

        const action = buildTestConfirmAction({
            iouType: CONST.IOU.TYPE.CREATE,
            hasInvoicingDetails: true,
            formError: 'violations.tagOutOfPolicy',
            isDelegateAccessRestricted: false,
            validate,
            setFormError,
            setDidConfirmSplit: jest.fn(),
            showDelegateNoAccessModal: jest.fn(),
            onConfirm,
        });

        action();

        expect(validate).toHaveBeenCalledTimes(1);
        expect(setFormError).toHaveBeenCalledWith('');
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('sets formError and does not call onConfirm when validate returns an errorKey', () => {
        const onConfirm = jest.fn();
        const setFormError = jest.fn();
        const validate = jest.fn(() => ({errorKey: 'common.error.fieldRequired'}));

        const action = buildTestConfirmAction({
            iouType: CONST.IOU.TYPE.CREATE,
            hasInvoicingDetails: true,
            formError: '',
            isDelegateAccessRestricted: false,
            validate,
            setFormError,
            setDidConfirmSplit: jest.fn(),
            showDelegateNoAccessModal: jest.fn(),
            onConfirm,
        });

        action();

        expect(validate).toHaveBeenCalledTimes(1);
        expect(setFormError).toHaveBeenCalledWith('common.error.fieldRequired');
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('clears formError and calls onSendMoney on PAY branch when validation succeeds and payment method is provided', () => {
        const onSendMoney = jest.fn();
        const setFormError = jest.fn();
        const validate = jest.fn(() => ({errorKey: null}));

        const action = buildTestConfirmAction({
            iouType: CONST.IOU.TYPE.PAY,
            hasInvoicingDetails: true,
            formError: 'iou.error.invalidMerchant',
            isDelegateAccessRestricted: false,
            validate,
            setFormError,
            setDidConfirmSplit: jest.fn(),
            showDelegateNoAccessModal: jest.fn(),
            onSendMoney,
        });

        action(CONST.IOU.PAYMENT_TYPE.ELSEWHERE);

        expect(setFormError).toHaveBeenCalledWith('');
        expect(onSendMoney).toHaveBeenCalledWith(CONST.IOU.PAYMENT_TYPE.ELSEWHERE);
    });
});
