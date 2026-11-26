import {renderHook} from '@testing-library/react-native';

import useConnectedAccountingIntegration from '@pages/workspace/accounting/useConnectedAccountingIntegration';

import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';
import type {ConnectionName} from '@src/types/onyx/Policy';

import createRandomPolicy from '../utils/collections/policies';

const mockSyncConnection = jest.fn();
let mockConnectedIntegration: ConnectionName | undefined;
let mockSynchronizationError: string | undefined;
let mockIsAuthenticationError = false;

jest.mock('@expensify/react-native-hybrid-app', () => ({isHybridApp: () => false}));
jest.mock('@hooks/useCardFeeds', () => () => [undefined]);
jest.mock('@hooks/useCardsLists', () => () => [undefined]);
jest.mock('@hooks/useConfirmModal', () => () => ({showConfirmModal: jest.fn()}));
jest.mock('@hooks/useEnvironment', () => () => ({environment: 'development'}));
jest.mock('@hooks/useExpensifyCardFeeds', () => () => ({}));
jest.mock('@hooks/useHasReusablePoliciesConnectedTo', () => () => false);
jest.mock('@hooks/useLazyAsset', () => ({useMemoizedLazyExpensifyIcons: () => ({})}));
jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
    datetimeToRelative: () => '',
    getLocalDateFromDatetime: jest.fn(),
    dateFnsLocale: undefined,
}));
jest.mock('@hooks/useNetwork', () => () => ({isOffline: false}));
jest.mock('@hooks/useOnyx', () => () => [undefined]);
jest.mock('@hooks/usePermissions', () => () => ({isBetaEnabled: () => false}));
jest.mock('@hooks/usePolicyFeatureWriteAccess', () => () => ({canWrite: true, showReadOnlyModal: jest.fn()}));
jest.mock('@hooks/useThemeStyles', () => () => ({}));
jest.mock('@hooks/useWorkspaceAccountID', () => () => undefined);
jest.mock('@libs/AccountingUtils', () => ({
    getQBORefreshTokenExpiryDate: () => undefined,
    getQBORefreshTokenExpiryStatus: () => undefined,
}));
jest.mock('@libs/actions/connections', () => ({
    isAuthenticationError: () => mockIsAuthenticationError,
    isConnectionInProgress: () => false,
    isConnectionUnverified: () => false,
    removePolicyConnection: jest.fn(),
    // Lazy wrapper so mockSyncConnection is resolved at call time
    syncConnection: (...args: unknown[]) => {
        mockSyncConnection(...args);
    },
}));
jest.mock('@libs/CardUtils', () => ({isExpensifyCardFullySetUp: () => false}));
jest.mock('@libs/DateUtils', () => ({formatToLongDateInUTC: jest.fn()}));
jest.mock('@libs/Environment/Environment', () => ({
    getEnvironmentURL: () => Promise.resolve(''),
    getOldDotURLFromEnvironment: () => '',
}));
jest.mock('@components/TextLink', () => ({__esModule: true, default: () => null}));
jest.mock('@libs/PolicyUtils', () => ({
    areSettingsInErrorFields: () => false,
    findCurrentXeroOrganization: () => undefined,
    getConnectedIntegration: () => mockConnectedIntegration,
    getCurrentSageIntacctEntityName: () => '',
    getCurrentXeroOrganizationName: () => '',
    getIntegrationLastSuccessfulDate: () => undefined,
    getXeroTenants: () => [],
    hasAccountingConnections: () => true,
    hasSupportedOnlyOnOldDotIntegration: () => false,
    settingsPendingAction: () => undefined,
    shouldShowReimbursableExportDestinationAccountError: () => false,
    shouldShowSyncError: () => false,
}));
jest.mock('@navigation/Navigation', () => ({__esModule: true, default: {navigate: jest.fn()}}));
jest.mock('@userActions/Policy/Policy', () => ({openPolicyExpensifyCardsPage: jest.fn()}));
jest.mock('@pages/workspace/accounting/AccountingContext', () => ({
    useAccountingActions: () => ({startIntegrationFlow: jest.fn()}),
    useAccountingState: () => ({activeIntegration: undefined}),
}));
jest.mock('@pages/workspace/accounting/certinia/utils', () => ({
    getCertiniaSelectedCompanyID: () => undefined,
    isCertiniaFFAConnection: () => false,
}));
jest.mock('@pages/workspace/accounting/utils', () => ({
    getAccountingIntegrationData: () => undefined,
    getAccountingIntegrationDisplayName: () => '',
    getSynchronizationErrorMessage: () => mockSynchronizationError,
    isIntuitEnterpriseSuiteConnection: () => false,
}));

const policy: Policy = {...createRandomPolicy(1, CONST.POLICY.TYPE.CORPORATE), id: 'policy-1'};

const zohoBooksPolicy: Policy = {
    ...policy,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The hook only reads the entity list and the selected entity, so the rest of the connection config is left out.
    connections: {
        [CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS]: {
            config: {subsidiaryID: 'org-1'},
            data: {
                organizations: [
                    {id: 'org-1', name: 'Organization One', currency: 'USD'},
                    {id: 'org-2', name: 'Organization Two', currency: 'USD'},
                ],
            },
        },
    } as Policy['connections'],
};

const netSuitePolicy: Policy = {
    ...policy,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The hook only reads the selected subsidiary and the subsidiary list, so the rest of the connection config is left out.
    connections: {
        [CONST.POLICY.CONNECTIONS.NAME.NETSUITE]: {
            options: {
                config: {subsidiary: 'Subsidiary One'},
                data: {
                    subsidiaryList: [
                        {internalID: '1', name: 'Subsidiary One'},
                        {internalID: '2', name: 'Subsidiary Two'},
                    ],
                },
            },
        },
    } as Policy['connections'],
};

const campfirePolicy: Policy = {
    ...policy,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The hook only reads the entity list and the selected entity, so the rest of the connection config is left out.
    connections: {
        [CONST.POLICY.CONNECTIONS.NAME.CAMPFIRE]: {
            config: {subsidiaryID: 'subsidiary-1'},
            data: {
                subsidiaries: [
                    {id: 'subsidiary-1', name: 'Subsidiary One', currency: 'USD'},
                    {id: 'subsidiary-2', name: 'Subsidiary Two', currency: 'USD'},
                ],
            },
        },
    } as Policy['connections'],
};

const DIGITS_COMPANY_NAME = 'Acme Inc.';

const digitsPolicy: Policy = {
    ...policy,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The hook only reads the connected company, so the rest of the connection is left out.
    connections: {
        [CONST.POLICY.CONNECTIONS.NAME.DIGITS]: {
            data: {company: {id: 'company-1', name: DIGITS_COMPANY_NAME, currency: CONST.CURRENCY.USD}},
        },
    } as Policy['connections'],
};

function createNetSuitePolicy(netSuiteConnection: Record<string, unknown>): Policy {
    return {
        ...policy,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The hook only reads the auth type of the NetSuite connection, so the rest of the connection is left out.
        connections: {[CONST.POLICY.CONNECTIONS.NAME.NETSUITE]: netSuiteConnection} as Policy['connections'],
    };
}

const netSuiteOAuthPolicy = createNetSuitePolicy({accountID: 'TSTDRV123', config: {authType: CONST.NETSUITE_CONFIG.TOKEN_INPUT.AUTH_TYPE.OAUTH2}});
const netSuiteTBAPolicy = createNetSuitePolicy({accountID: 'TSTDRV123', tokenID: 'token-id', tokenSecret: 'token-secret', config: {}});

const credentialsMenuTextKeys = new Set(['workspace.accounting.enterCredentials', 'workspace.accounting.reconnect', 'workspace.accounting.updateCredentials']);

function getCredentialsItemText(policyToRender: Policy) {
    const {result} = renderHook(() => useConnectedAccountingIntegration(policyToRender));
    return result.current.overflowMenu.find((item) => credentialsMenuTextKeys.has(item.text))?.text;
}

function getSettingsMenuItemDescriptions(policyToRender: Policy) {
    const {result} = renderHook(() => useConnectedAccountingIntegration(policyToRender));
    return result.current.connectionDetails?.settingsMenuItems.map((item) => item.description);
}

function getSettingsMenuItem(policyToRender: Policy, description: string) {
    const {result} = renderHook(() => useConnectedAccountingIntegration(policyToRender));
    return result.current.connectionDetails?.settingsMenuItems.find((item) => item.description === description);
}

function getSettingsMenuItemTitles(policyToRender: Policy) {
    const {result} = renderHook(() => useConnectedAccountingIntegration(policyToRender));
    return result.current.connectionDetails?.settingsMenuItems.map((item) => item.title);
}

function getSyncNowItem() {
    const {result} = renderHook(() => useConnectedAccountingIntegration(policy));
    return result.current.overflowMenu.find((item) => item.text === 'workspace.accounting.syncNow');
}

describe('useConnectedAccountingIntegration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConnectedIntegration = undefined;
        mockSynchronizationError = undefined;
        mockIsAuthenticationError = false;
    });

    describe('Sync now menu item', () => {
        it('should call syncConnection with forceDataRefresh true when connected to QBD', () => {
            // Given a workspace connected to QuickBooks Desktop
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.QBD;

            // When the user selects "Sync now"
            getSyncNowItem()?.onSelected?.();

            // Then syncConnection is called with forceDataRefresh true so IS forces a full data refresh from Codat
            expect(mockSyncConnection).toHaveBeenCalledWith(policy, CONST.POLICY.CONNECTIONS.NAME.QBD, true);
        });

        it('should call syncConnection with forceDataRefresh false for non-QBD integrations', () => {
            // Given a workspace connected to QuickBooks Online
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.QBO;

            // When the user selects "Sync now"
            getSyncNowItem()?.onSelected?.();

            // Then syncConnection is called with forceDataRefresh false since only QBD uses Codat's cached data
            expect(mockSyncConnection).toHaveBeenCalledWith(policy, CONST.POLICY.CONNECTIONS.NAME.QBO, false);
        });
    });

    describe('Integration-specific settings row on a failed sync', () => {
        it('should keep the Zoho Books organization row when the last sync failed', () => {
            // Given a workspace connected to Zoho Books with two organizations whose last sync failed
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS;
            mockSynchronizationError = 'Sync failed';

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(zohoBooksPolicy);

            // Then the organization row is still shown, because the selected organization can be what broke the sync and admins need the row to switch it
            expect(descriptions).toContain('workspace.zohoBooks.organization');
        });

        it('should keep the NetSuite subsidiary row when the last sync failed without an authentication error', () => {
            // Given a workspace connected to NetSuite with two subsidiaries whose last sync failed for a reason other than authentication
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
            mockSynchronizationError = 'Sync failed';

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(netSuitePolicy);

            // Then the subsidiary row is still shown, because the selected subsidiary can be what broke the sync and admins need the row to switch it
            expect(descriptions).toContain('workspace.netsuite.subsidiary');
        });

        it('should keep the integration-specific row for other connectors when the last sync failed without an authentication error', () => {
            // Given a workspace connected to Campfire with two entities whose last sync failed for a reason other than authentication
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.CAMPFIRE;
            mockSynchronizationError = 'Sync failed';

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(campfirePolicy);

            // Then the entity row is still shown, since the rule is shared by every connector with an entity selector
            expect(descriptions).toContain('workspace.campfire.entity');
        });

        it('should drop the integration-specific row when the last sync failed with an authentication error', () => {
            // Given a workspace connected to NetSuite whose last sync failed because the credentials are no longer valid
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
            mockSynchronizationError = 'Authentication failed';
            mockIsAuthenticationError = true;

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(netSuitePolicy);

            // Then the subsidiary row is hidden, since switching the subsidiary cannot fix invalid credentials
            expect(descriptions).not.toContain('workspace.netsuite.subsidiary');
        });

        it('should keep the Zoho Books organization row when the last sync failed with an authentication error', () => {
            // Given a workspace connected to Zoho Books with two organizations whose last sync failed because the credentials are no longer valid
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.ZOHO_BOOKS;
            mockSynchronizationError = 'Authentication failed';
            mockIsAuthenticationError = true;

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(zohoBooksPolicy);

            // Then the organization row is still shown, since the authentication rule leaves Zoho Books' existing behavior unchanged
            expect(descriptions).toContain('workspace.zohoBooks.organization');
        });
    });

    describe('Credentials menu item on a NetSuite authentication error', () => {
        beforeEach(() => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
            mockSynchronizationError = 'Authentication failed';
            mockIsAuthenticationError = true;
        });

        it('should say Reconnect for an OAuth connection', () => {
            // Given a NetSuite OAuth connection whose last sync failed to authenticate

            // When the overflow menu is built
            const text = getCredentialsItemText(netSuiteOAuthPolicy);

            // Then the item says Reconnect, because the admin authorizes Expensify again in NetSuite instead of typing new credentials
            expect(text).toBe('workspace.accounting.reconnect');
        });

        it('should keep Enter your credentials for a Token-Based Authentication connection', () => {
            // Given a NetSuite Token-Based Authentication connection whose last sync failed to authenticate

            // When the overflow menu is built
            const text = getCredentialsItemText(netSuiteTBAPolicy);

            // Then the item keeps the Enter your credentials label, since only OAuth connections say Reconnect
            expect(text).toBe('workspace.accounting.enterCredentials');
        });
    });

    describe('Credentials menu item on a working NetSuite connection', () => {
        beforeEach(() => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
        });

        it('should offer Update credentials for an OAuth connection', () => {
            // Given a NetSuite OAuth connection whose last sync succeeded

            // When the overflow menu is built
            const text = getCredentialsItemText(netSuiteOAuthPolicy);

            // Then the item says Update credentials, so the admin can move the connection back to TBA during the OAuth rollout
            expect(text).toBe('workspace.accounting.updateCredentials');
        });

        it('should offer Update credentials for an OAuth connection whose last sync failed without an auth error', () => {
            // Given a NetSuite OAuth connection whose last sync failed for a reason other than authentication
            mockSynchronizationError = 'Sync failed';

            // When the overflow menu is built
            const text = getCredentialsItemText(netSuiteOAuthPolicy);

            // Then the item still says Update credentials, because only an auth error changes it to Reconnect
            expect(text).toBe('workspace.accounting.updateCredentials');
        });

        it('should not offer a credentials item for a Token-Based Authentication connection', () => {
            // Given a working NetSuite Token-Based Authentication connection

            // When the overflow menu is built
            const text = getCredentialsItemText(netSuiteTBAPolicy);

            // Then no credentials item is shown, because a TBA submit on a working connection resets its settings
            expect(text).toBeUndefined();
        });
    });

    describe('Configuration rows for Digits', () => {
        it('should show the Import, Export and Advanced rows', () => {
            // Given a workspace connected to Digits, which now has all three configuration pages
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.DIGITS;

            // When the connected integration's settings rows are built
            const titles = getSettingsMenuItemTitles(policy);

            // Then all three rows show, the same as for Campfire, whose pages Digits copies
            expect(titles).toEqual(expect.arrayContaining(['workspace.accounting.import', 'workspace.accounting.export', 'workspace.accounting.advanced']));
        });
    });

    describe('Entity row for Digits', () => {
        it('should show the connected company in a read-only Entity row', () => {
            // Given a workspace connected to Digits whose sync saved the company the admin signed in to
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.DIGITS;

            // When the connected integration's settings rows are built
            const entityRow = getSettingsMenuItem(digitsPolicy, 'workspace.digits.entity');

            // Then the row names the company and can't be pressed, because a Digits sign-in covers exactly one company and there is nothing to switch to
            expect(entityRow?.title).toBe(DIGITS_COMPANY_NAME);
            expect(entityRow?.interactive).toBe(false);
            expect(entityRow?.onPress).toBeUndefined();
        });

        it('should leave out the Entity row until the first sync saves the company', () => {
            // Given a workspace connected to Digits whose first sync hasn't saved the company yet
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.DIGITS;

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(policy);

            // Then there is no Entity row, so the card never shows a row with an empty company name
            expect(descriptions).not.toContain('workspace.digits.entity');
        });

        it('should drop the Entity row when the last sync failed with an authentication error', () => {
            // Given a workspace connected to Digits whose last sync failed because the Digits access was revoked
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.DIGITS;
            mockSynchronizationError = 'Authentication failed';
            mockIsAuthenticationError = true;

            // When the connected integration's settings rows are built
            const descriptions = getSettingsMenuItemDescriptions(digitsPolicy);

            // Then the Entity row is hidden like other connectors' rows, since the admin has to sign in to Digits again first
            expect(descriptions).not.toContain('workspace.digits.entity');
        });
    });

    describe('Connection identifier rows', () => {
        it('should show read-only NetSuite Account ID and keep it on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
            const policyWithAccount: Policy = {
                ...netSuitePolicy,
                connections: {
                    ...netSuitePolicy.connections,
                    [CONST.POLICY.CONNECTIONS.NAME.NETSUITE]: {
                        ...netSuitePolicy.connections?.[CONST.POLICY.CONNECTIONS.NAME.NETSUITE],
                        accountID: 'TSTDRV12345',
                    },
                } as Policy['connections'],
            };

            const item = getSettingsMenuItem(policyWithAccount, 'workspace.netsuite.accountID');
            expect(item?.title).toBe('TSTDRV12345');
            expect(item?.interactive).toBe(false);
            expect(item?.shouldShowDescriptionOnTop).toBe(true);

            // On authentication error
            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(policyWithAccount);
            expect(descriptions).not.toContain('workspace.netsuite.subsidiary');
            expect(descriptions).toContain('workspace.netsuite.accountID');
        });

        it('should show read-only Sage Intacct Company ID and User ID and keep them on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT;
            const intacctPolicy: Policy = {
                ...policy,
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT]: {
                        config: {
                            credentials: {
                                companyID: 'ACME_CORP',
                                userID: 'admin_sync',
                            },
                        },
                        data: {
                            entities: [{id: '1', name: 'Top Level'}],
                        },
                    },
                } as Policy['connections'],
            };

            const companyItem = getSettingsMenuItem(intacctPolicy, 'common.companyID');
            expect(companyItem?.title).toBe('ACME_CORP');
            expect(companyItem?.interactive).toBe(false);

            const userItem = getSettingsMenuItem(intacctPolicy, 'common.userID');
            expect(userItem?.title).toBe('admin_sync');
            expect(userItem?.interactive).toBe(false);

            // On authentication error
            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(intacctPolicy);
            expect(descriptions).not.toContain('workspace.intacct.entity');
            expect(descriptions).toContain('common.companyID');
            expect(descriptions).toContain('common.userID');
        });

        it('should show read-only QBO Company ID from realmId and keep it on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.QBO;
            const qboPolicy: Policy = {
                ...policy,
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.QBO]: {
                        config: {
                            companyName: 'Acme QBO',
                            realmId: '91303482348',
                        },
                    },
                } as Policy['connections'],
            };

            const item = getSettingsMenuItem(qboPolicy, 'common.companyID');
            expect(item?.title).toBe('91303482348');
            expect(item?.interactive).toBe(false);

            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(qboPolicy);
            expect(descriptions).toContain('common.companyID');
        });

        it('should show read-only QBD Company file and keep it on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.QBD;
            const qbdPolicy: Policy = {
                ...policy,
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.QBD]: {
                        config: {
                            credentials: {
                                companyFileName: 'AcmeBooks.qbw',
                            },
                        },
                    },
                } as Policy['connections'],
            };

            const item = getSettingsMenuItem(qbdPolicy, 'workspace.qbd.companyFile');
            expect(item?.title).toBe('AcmeBooks.qbw');
            expect(item?.interactive).toBe(false);

            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(qbdPolicy);
            expect(descriptions).toContain('workspace.qbd.companyFile');
        });

        it('should show read-only Business Central Environment and keep it on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL;
            const bcPolicy: Policy = {
                ...policy,
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.BUSINESS_CENTRAL]: {
                        config: {
                            credentials: {
                                environmentName: 'Production_US',
                            },
                        },
                    },
                } as Policy['connections'],
            };

            const item = getSettingsMenuItem(bcPolicy, 'common.environmentName');
            expect(item?.title).toBe('Production_US');
            expect(item?.interactive).toBe(false);

            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(bcPolicy);
            expect(descriptions).toContain('common.environmentName');
        });

        it('should show read-only Certinia Salesforce instance URL and keep it on authentication error', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.CERTINIA;
            const certiniaPolicy: Policy = {
                ...policy,
                connections: {
                    [CONST.POLICY.CONNECTIONS.NAME.CERTINIA]: {
                        config: {
                            credentials: {
                                enterpriseUrl: 'https://na139.salesforce.com',
                            },
                        },
                    },
                } as Policy['connections'],
            };

            const item = getSettingsMenuItem(certiniaPolicy, 'workspace.certinia.salesforceInstanceUrl');
            expect(item?.title).toBe('https://na139.salesforce.com');
            expect(item?.interactive).toBe(false);

            mockSynchronizationError = 'Auth failed';
            mockIsAuthenticationError = true;
            const descriptions = getSettingsMenuItemDescriptions(certiniaPolicy);
            expect(descriptions).toContain('workspace.certinia.salesforceInstanceUrl');
        });

        it('should not add identifier rows when stored values are empty or undefined', () => {
            mockConnectedIntegration = CONST.POLICY.CONNECTIONS.NAME.NETSUITE;
            const descriptions = getSettingsMenuItemDescriptions(netSuitePolicy);
            expect(descriptions).not.toContain('workspace.netsuite.accountID');
        });
    });
});
