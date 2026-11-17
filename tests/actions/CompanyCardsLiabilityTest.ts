import {setWorkspaceCompanyCardTransactionLiability} from '@libs/actions/CompanyCards';
import {WRITE_COMMANDS} from '@libs/API/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
    },
}));

const POLICY_ID = 'A1B2C3D4E5F60718';
const DOMAIN_ACCOUNT_ID = 1234567;
const FEED = CONST.COMPANY_CARD.FEED_BANK_NAME.VISA;

describe('actions/CompanyCards setWorkspaceCompanyCardTransactionLiability', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('targets the feed-owning domain account when restricting deletion on a domain feed', () => {
        // Given a domain feed, whose settings live on the +@domain account rather than the workspace account
        const apiWriteSpy = jest.spyOn(require('@libs/API'), 'write').mockImplementation(() => Promise.resolve());

        // When an admin turns off deleting transactions for that feed
        setWorkspaceCompanyCardTransactionLiability(DOMAIN_ACCOUNT_ID, POLICY_ID, FEED, CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.RESTRICT);

        // Then the domainAccountID is forwarded to the backend, so the setting is written to the correct account, and the optimistic Onyx write targets that same account.
        expect(apiWriteSpy).toHaveBeenCalledWith(
            WRITE_COMMANDS.SET_COMPANY_CARD_TRANSACTION_LIABILITY,
            expect.objectContaining({
                policyID: POLICY_ID,
                bankName: FEED,
                liabilityType: CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.RESTRICT,
                domainAccountID: DOMAIN_ACCOUNT_ID,
            }),
            expect.objectContaining({
                optimisticData: expect.arrayContaining([
                    expect.objectContaining({
                        key: `${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${DOMAIN_ACCOUNT_ID}`,
                        value: {
                            settings: {
                                companyCards: {
                                    [FEED]: {
                                        liabilityType: CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.RESTRICT,
                                        pendingFields: {
                                            liabilityType: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                                        },
                                        errorFields: {
                                            liabilityType: null,
                                        },
                                    },
                                },
                            },
                        },
                    }),
                ]),
                successData: expect.arrayContaining([
                    expect.objectContaining({
                        key: `${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${DOMAIN_ACCOUNT_ID}`,
                        value: {
                            settings: {
                                companyCards: {
                                    [FEED]: {
                                        pendingFields: {
                                            liabilityType: null,
                                        },
                                    },
                                },
                            },
                        },
                    }),
                ]),
            }),
        );
    });

    it('restores the previous liabilityType and populates errorFields on failure', () => {
        const apiWriteSpy = jest.spyOn(require('@libs/API'), 'write').mockImplementation(() => Promise.resolve());
        const oldLiabilityType = CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.ALLOW;
        const newLiabilityType = CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.RESTRICT;

        setWorkspaceCompanyCardTransactionLiability(DOMAIN_ACCOUNT_ID, POLICY_ID, FEED, newLiabilityType, oldLiabilityType);

        expect(apiWriteSpy).toHaveBeenCalledWith(
            WRITE_COMMANDS.SET_COMPANY_CARD_TRANSACTION_LIABILITY,
            expect.anything(),
            expect.objectContaining({
                failureData: expect.arrayContaining([
                    expect.objectContaining({
                        key: `${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${DOMAIN_ACCOUNT_ID}`,
                        value: {
                            settings: {
                                companyCards: {
                                    [FEED]: {
                                        liabilityType: oldLiabilityType,
                                        pendingFields: {
                                            liabilityType: null,
                                        },
                                        errorFields: {
                                            liabilityType: expect.any(Object),
                                        },
                                    },
                                },
                            },
                        },
                    }),
                ]),
            }),
        );
    });
});
