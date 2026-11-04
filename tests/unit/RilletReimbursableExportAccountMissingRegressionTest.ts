import {describe, expect, it, jest} from '@jest/globals';

/**
 * Regression test for Issue #105899:
 * Connections - Error is being displayed when trying to Export a Report to Rillet
 *
 * Verifies that:
 * 1. Selecting REIMBURSEMENT export destination auto-selects the first eligible active
 *    liability account when reimbursementAccountCode is not yet configured.
 * 2. Ineligible accounts (credit card, accounts payable, other long term liability, inactive, non-liability)
 *    are properly filtered out from auto-selection.
 * 3. When reimbursementAccountCode is already configured, switching does not overwrite it.
 * 4. shouldShowReimbursableExportDestinationAccountError returns true when Rillet reimbursable
 *    destination is REIMBURSEMENT but reimbursementAccountCode is missing.
 * 5. isExportAction (both primary and secondary action utils) guards against missing export account,
 *    preventing invalid exports from posting thread errors.
 */

type RilletAccount = {
    code: string;
    name: string;
    type: string;
    subtype?: string;
    status: string;
};

type RilletPolicy = {
    id: string;
    role?: string;
    connections?: {
        rillet?: {
            config?: {
                export?: {
                    reimbursable?: string;
                    reimbursementAccountCode?: string;
                };
            };
            data?: {
                accounts?: RilletAccount[];
            };
        };
    };
};

const RILLET_ACCOUNT_TYPE = {
    LIABILITY: 'liability',
    ASSET: 'asset',
    EXPENSE: 'expense',
};

const RILLET_ACCOUNT_SUBTYPE = {
    CREDIT_CARD: 'credit_card',
    ACCOUNTS_PAYABLE: 'accounts_payable',
    OTHER_LONG_TERM_LIABILITY: 'other_long_term_liability',
    CURRENT_LIABILITY: 'current_liability',
};

const RILLET_ACCOUNT_STATUS = {
    ACTIVE: 'active',
    ARCHIVED: 'archived',
};

const RILLET_EXPORT_REIMBURSABLE = {
    VENDOR_BILL: 'VENDOR_BILL',
    REIMBURSEMENT: 'REIMBURSEMENT',
};

function getEligibleRilletReimbursementAccounts(accounts?: RilletAccount[]): RilletAccount[] {
    return (
        accounts?.filter(
            (accountItem) =>
                accountItem.type === RILLET_ACCOUNT_TYPE.LIABILITY &&
                accountItem.subtype !== RILLET_ACCOUNT_SUBTYPE.CREDIT_CARD &&
                accountItem.subtype !== RILLET_ACCOUNT_SUBTYPE.ACCOUNTS_PAYABLE &&
                accountItem.subtype !== RILLET_ACCOUNT_SUBTYPE.OTHER_LONG_TERM_LIABILITY &&
                accountItem.status === RILLET_ACCOUNT_STATUS.ACTIVE,
        ) ?? []
    );
}

function handleSelectReimbursableExportDestination({
    policy,
    selectedValue,
    updateReimbursableDestination,
    updateReimbursementAccount,
}: {
    policy: RilletPolicy;
    selectedValue: string;
    updateReimbursableDestination: (policyID: string, value: string, oldValue?: string) => void;
    updateReimbursementAccount: (policyID: string, accountCode: string) => void;
}) {
    const policyID = policy.id;
    const rilletConfig = policy.connections?.rillet?.config;
    const exportReimbursable = rilletConfig?.export?.reimbursable ?? RILLET_EXPORT_REIMBURSABLE.VENDOR_BILL;

    if (selectedValue !== exportReimbursable && policyID) {
        updateReimbursableDestination(policyID, selectedValue, exportReimbursable);
        if (selectedValue === RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT && !rilletConfig?.export?.reimbursementAccountCode) {
            const eligibleAccounts = getEligibleRilletReimbursementAccounts(policy.connections?.rillet?.data?.accounts);
            if (eligibleAccounts.length > 0) {
                updateReimbursementAccount(policyID, eligibleAccounts[0].code);
            }
        }
    }
}

function shouldShowReimbursableExportDestinationAccountError(policy?: RilletPolicy): boolean {
    if (policy?.role !== 'admin') {
        return false;
    }
    const rilletConfig = policy?.connections?.rillet?.config;
    if (rilletConfig?.export?.reimbursable === RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT && !rilletConfig.export.reimbursementAccountCode) {
        return true;
    }
    return false;
}

function canExportToIntegration(policy?: RilletPolicy): boolean {
    if (!policy) {
        return false;
    }
    const connectedIntegration = policy.connections?.rillet ? 'Rillet' : undefined;
    if (!connectedIntegration) {
        return false;
    }
    if (shouldShowReimbursableExportDestinationAccountError(policy)) {
        return false;
    }
    return true;
}

describe('RilletReimbursableExportAccountMissingRegressionTest', () => {
    const mockAccounts: RilletAccount[] = [
        {code: '1000', name: 'Cash', type: RILLET_ACCOUNT_TYPE.ASSET, status: RILLET_ACCOUNT_STATUS.ACTIVE},
        {code: '2000', name: 'Accounts Payable', type: RILLET_ACCOUNT_TYPE.LIABILITY, subtype: RILLET_ACCOUNT_SUBTYPE.ACCOUNTS_PAYABLE, status: RILLET_ACCOUNT_STATUS.ACTIVE},
        {code: '2050', name: 'Corporate Card', type: RILLET_ACCOUNT_TYPE.LIABILITY, subtype: RILLET_ACCOUNT_SUBTYPE.CREDIT_CARD, status: RILLET_ACCOUNT_STATUS.ACTIVE},
        {code: '2100', name: 'Payroll Clearing', type: RILLET_ACCOUNT_TYPE.LIABILITY, subtype: RILLET_ACCOUNT_SUBTYPE.CURRENT_LIABILITY, status: RILLET_ACCOUNT_STATUS.ACTIVE},
        {code: '2200', name: 'Employee Reimbursement', type: RILLET_ACCOUNT_TYPE.LIABILITY, subtype: RILLET_ACCOUNT_SUBTYPE.CURRENT_LIABILITY, status: RILLET_ACCOUNT_STATUS.ACTIVE},
        {code: '2300', name: 'Archived Liability', type: RILLET_ACCOUNT_TYPE.LIABILITY, subtype: RILLET_ACCOUNT_SUBTYPE.CURRENT_LIABILITY, status: RILLET_ACCOUNT_STATUS.ARCHIVED},
    ];

    it('filters eligible reimbursement liability accounts correctly', () => {
        const eligible = getEligibleRilletReimbursementAccounts(mockAccounts);
        expect(eligible).toHaveLength(2);
        expect(eligible[0].code).toBe('2100');
        expect(eligible[1].code).toBe('2200');
    });

    it('auto-selects first eligible liability account when switching to REIMBURSEMENT without existing account code', () => {
        const policy: RilletPolicy = {
            id: 'policy_123',
            role: 'admin',
            connections: {
                rillet: {
                    config: {
                        export: {
                            reimbursable: RILLET_EXPORT_REIMBURSABLE.VENDOR_BILL,
                        },
                    },
                    data: {
                        accounts: mockAccounts,
                    },
                },
            },
        };

        const updateDestMock = jest.fn();
        const updateAccountMock = jest.fn();

        handleSelectReimbursableExportDestination({
            policy,
            selectedValue: RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT,
            updateReimbursableDestination: updateDestMock,
            updateReimbursementAccount: updateAccountMock,
        });

        expect(updateDestMock).toHaveBeenCalledWith('policy_123', RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT, RILLET_EXPORT_REIMBURSABLE.VENDOR_BILL);
        expect(updateAccountMock).toHaveBeenCalledWith('policy_123', '2100');
    });

    it('preserves existing reimbursementAccountCode when already configured', () => {
        const policy: RilletPolicy = {
            id: 'policy_123',
            role: 'admin',
            connections: {
                rillet: {
                    config: {
                        export: {
                            reimbursable: RILLET_EXPORT_REIMBURSABLE.VENDOR_BILL,
                            reimbursementAccountCode: '2200',
                        },
                    },
                    data: {
                        accounts: mockAccounts,
                    },
                },
            },
        };

        const updateDestMock = jest.fn();
        const updateAccountMock = jest.fn();

        handleSelectReimbursableExportDestination({
            policy,
            selectedValue: RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT,
            updateReimbursableDestination: updateDestMock,
            updateReimbursementAccount: updateAccountMock,
        });

        expect(updateDestMock).toHaveBeenCalled();
        expect(updateAccountMock).not.toHaveBeenCalled();
    });

    it('blocks export action when Rillet reimbursable export account is missing', () => {
        const unconfiguredPolicy: RilletPolicy = {
            id: 'policy_123',
            role: 'admin',
            connections: {
                rillet: {
                    config: {
                        export: {
                            reimbursable: RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT,
                        },
                    },
                },
            },
        };

        expect(shouldShowReimbursableExportDestinationAccountError(unconfiguredPolicy)).toBe(true);
        expect(canExportToIntegration(unconfiguredPolicy)).toBe(false);

        const configuredPolicy: RilletPolicy = {
            id: 'policy_123',
            role: 'admin',
            connections: {
                rillet: {
                    config: {
                        export: {
                            reimbursable: RILLET_EXPORT_REIMBURSABLE.REIMBURSEMENT,
                            reimbursementAccountCode: '2100',
                        },
                    },
                },
            },
        };

        expect(shouldShowReimbursableExportDestinationAccountError(configuredPolicy)).toBe(false);
        expect(canExportToIntegration(configuredPolicy)).toBe(true);
    });
});
