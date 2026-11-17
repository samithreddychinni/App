import {render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import ScreenWrapperStatusContext from '@components/ScreenWrapper/ScreenWrapperStatusContext';
import WorkspaceRoomsTable from '@components/Tables/WorkspaceRoomsTable';
import type {WorkspaceRoomRowData} from '@components/Tables/WorkspaceRoomsTable/WorkspaceRoomsTableRow';

import ONYXKEYS from '@src/ONYXKEYS';

import {PortalProvider} from '@gorhom/portal';
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

TestHelper.setupApp();

let mockIsOffline = false;
jest.mock('@hooks/useNetwork', () => ({
    __esModule: true,
    default: () => ({isOffline: mockIsOffline}),
}));

jest.mock('@hooks/useResponsiveLayout', () => ({
    __esModule: true,
    default: jest.fn(() => ({shouldUseNarrowLayout: false, isSmallScreenWidth: false, isMediumScreenWidth: false})),
}));

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
    },
}));

const POLICY_ID = 'policy123';
const SCREEN_WRAPPER_STATUS = {didScreenTransitionEnd: true, isSafeAreaTopPaddingApplied: true, isSafeAreaBottomPaddingApplied: true};

const mockRooms: WorkspaceRoomRowData[] = [
    {
        keyForList: 'room1',
        reportID: 'room1',
        name: '#admins',
        memberCount: 1,
        action: jest.fn(),
    },
    {
        keyForList: 'room2',
        reportID: 'room2',
        name: '#announce',
        memberCount: 1,
        action: jest.fn(),
    },
];

function renderTable() {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <PortalProvider>
                <NavigationContainer>
                    <ScreenWrapperStatusContext.Provider value={SCREEN_WRAPPER_STATUS}>
                        <WorkspaceRoomsTable
                            rooms={mockRooms}
                            policyID={POLICY_ID}
                        />
                    </ScreenWrapperStatusContext.Provider>
                </NavigationContainer>
            </PortalProvider>
        </ComposeProviders>,
    );
}

describe('WorkspaceRoomsTable', () => {
    beforeEach(async () => {
        mockIsOffline = false;
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('renders TableLoadingState when online and roomsMetadata is not loaded', async () => {
        mockIsOffline = false;
        renderTable();
        await waitForBatchedUpdatesWithAct();

        // When online and not loaded, Table.LoadingState is shown (ActivityIndicator present)
        expect(screen.queryByText('#admins')).toBeNull();
        expect(screen.queryByText('#announce')).toBeNull();
    });

    it('bypasses TableLoadingState and renders rooms when offline even if roomsMetadata is not loaded', async () => {
        mockIsOffline = true;
        renderTable();
        await waitForBatchedUpdatesWithAct();

        // When offline, table renders optimistic / cached rooms instead of loading skeleton
        expect(screen.getByText('#admins')).toBeTruthy();
        expect(screen.getByText('#announce')).toBeTruthy();
    });

    it('renders rooms when online and roomsMetadata is loaded', async () => {
        mockIsOffline = false;
        await Onyx.set(ONYXKEYS.POLICY_ROOMS_METADATA, {
            [POLICY_ID]: {
                isLoaded: true,
                isLoading: false,
            },
        });
        await waitForBatchedUpdatesWithAct();

        renderTable();
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByText('#admins')).toBeTruthy();
        expect(screen.getByText('#announce')).toBeTruthy();
    });
});
