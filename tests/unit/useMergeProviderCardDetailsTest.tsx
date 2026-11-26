import {act, renderHook} from '@testing-library/react-native';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import useMergeProviderCardDetails from '@pages/workspace/merge/useMergeProviderCardDetails';
import type {MergeProviderCardDescriptor} from '@pages/workspace/merge/types';
import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';
import createRandomPolicy from '../utils/collections/policies';

jest.mock('@expensify/react-native-hybrid-app', () => ({isHybridApp: () => false}));

const mockShowConfirmModal = jest.fn();
let mockIsOffline = false;

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string, param?: string) => (param !== undefined ? `${key}:${param}` : key),
    datetimeToRelative: () => '2 hours ago',
    getLocalDateFromDatetime: jest.fn(),
}));

jest.mock('@hooks/useNetwork', () => () => ({
    isOffline: mockIsOffline,
}));

jest.mock('@hooks/useThemeStyles', () => () => ({
    link: {},
    fontSizeLabel: {},
}));

jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyExpensifyIcons: (iconNames: string[]) => {
        const icons: Record<string, string> = {};
        for (const name of iconNames) {
            icons[name] = `icon-${name}`;
        }
        return icons;
    },
}));

jest.mock('@hooks/useConfirmModal', () => () => ({
    showConfirmModal: mockShowConfirmModal,
}));

jest.mock('@libs/actions/connections', () => ({
    removePolicyConnection: jest.fn(),
    syncConnection: jest.fn(),
}));

jest.mock('@libs/merge/MergeUtils', () => ({
    ...jest.requireActual('@libs/merge/MergeUtils'),
    showMergeManualSyncLimitModalIfReached: jest.fn(() => false),
}));

const policy: Policy = {...createRandomPolicy(1, CONST.POLICY.TYPE.CORPORATE), id: 'policy-1'};

function buildCard(overrides: Partial<MergeProviderCardDescriptor> = {}): MergeProviderCardDescriptor {
    return {
        key: 'bamboohr',
        category: CONST.POLICY.CONNECTIONS.CATEGORY.HR,
        connectionName: CONST.POLICY.CONNECTIONS.NAME.MERGE_HR,
        displayName: 'BambooHR',
        icon: 'bamboohr-icon',
        isConnected: true,
        isSyncInProgress: false,
        hasError: false,
        needsReconnect: false,
        ...overrides,
    };
}

describe('useMergeProviderCardDetails', () => {
    const handleConnect = jest.fn();
    const showReadOnlyModal = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsOffline = false;
    });

    it('shows Manage connection with Key icon between Sync now and Disconnect for healthy Merge connections', () => {
        const card = buildCard();
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        expect(result.current.overflowMenu).toHaveLength(3);
        const [syncNow, manageConnection, disconnect] = result.current.overflowMenu;

        expect(syncNow.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_SYNC_NOW);
        expect(syncNow.text).toBe('workspace.merge.syncNow');

        expect(manageConnection.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_MANAGE_CONNECTION);
        expect(manageConnection.text).toBe('workspace.merge.manageConnection');
        expect(manageConnection.icon).toBe('icon-Key');
        expect(manageConnection.disabled).toBe(false);
        expect(manageConnection.shouldCallAfterModalHide).toBe(true);

        expect(disconnect.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_DISCONNECT);
        expect(disconnect.text).toBe('workspace.merge.disconnect');
    });

    it('opens confirmation modal and invokes handleConnect on confirm', async () => {
        mockShowConfirmModal.mockResolvedValueOnce({action: ModalActions.CONFIRM});
        const card = buildCard();
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        const manageConnectionItem = result.current.overflowMenu[1];
        await act(async () => {
            manageConnectionItem.onSelected?.();
        });

        expect(mockShowConfirmModal).toHaveBeenCalledTimes(1);
        expect(mockShowConfirmModal).toHaveBeenCalledWith({
            title: 'workspace.merge.manageConnectionTitle:BambooHR',
            prompt: 'workspace.merge.manageConnectionPrompt:BambooHR',
            confirmText: 'common.continue',
            cancelText: 'common.cancel',
        });
        expect(handleConnect).toHaveBeenCalledTimes(1);
    });

    it('does not invoke handleConnect when confirmation modal is dismissed or cancelled', async () => {
        mockShowConfirmModal.mockResolvedValueOnce({action: ModalActions.CANCEL});
        const card = buildCard();
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        const manageConnectionItem = result.current.overflowMenu[1];
        await act(async () => {
            manageConnectionItem.onSelected?.();
        });

        expect(mockShowConfirmModal).toHaveBeenCalledTimes(1);
        expect(handleConnect).not.toHaveBeenCalled();
    });

    it('omits Manage connection when Merge connection needs reconnect', () => {
        const card = buildCard({needsReconnect: true});
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        expect(result.current.overflowMenu).toHaveLength(2);
        const [reconnect, disconnect] = result.current.overflowMenu;

        expect(reconnect.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_RECONNECT);
        expect(reconnect.text).toBe('workspace.merge.reconnect');
        expect(disconnect.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_DISCONNECT);
    });

    it('omits Manage connection for non-Merge connections like Gusto', () => {
        const card = buildCard({connectionName: CONST.POLICY.CONNECTIONS.NAME.GUSTO, displayName: 'Gusto'});
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        expect(result.current.overflowMenu).toHaveLength(2);
        const [syncNow, disconnect] = result.current.overflowMenu;

        expect(syncNow.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_SYNC_NOW);
        expect(disconnect.sentryLabel).toBe(CONST.SENTRY_LABEL.WORKSPACE.CONNECTIONS.MERGE_MENU_DISCONNECT);
    });

    it('disables Manage connection when offline', () => {
        mockIsOffline = true;
        const card = buildCard();
        const {result} = renderHook(() =>
            useMergeProviderCardDetails({
                card,
                policy,
                handleConnect,
                canWriteMoreFeatures: true,
                showReadOnlyModal,
            }),
        );

        const manageConnection = result.current.overflowMenu[1];
        expect(manageConnection.disabled).toBe(true);
    });
});
