import {act, renderHook} from '@testing-library/react-native';

import Navigation from '@libs/Navigation/Navigation';

import useReceiptPartnerConnectionListings from '@pages/workspace/connections/useReceiptPartnerConnectionListings';

import {openExternalLink} from '@userActions/Link';
import {enablePolicyFeatureForConnection} from '@userActions/Policy/Policy';

import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';

import createRandomPolicy from '../utils/collections/policies';

let mockUberData: {title: string; description: string; icon: undefined; errorFields: Record<string, unknown> | undefined} | undefined = {
    title: 'Uber for Business',
    description: 'Connected',
    icon: undefined,
    errorFields: undefined,
};
let mockUberState = {isUberConnected: false, shouldShowEnterCredentialsError: false, errorFields: undefined as Record<string, unknown> | undefined};

jest.mock('@hooks/useGetReceiptPartnersIntegrationData', () => ({
    __esModule: true,
    default: () => ({
        getReceiptPartnersIntegrationData: () => (mockUberData ? {...mockUberData, errorFields: mockUberState.errorFields} : undefined),
        shouldShowEnterCredentialsError: mockUberState.shouldShowEnterCredentialsError,
        isUberConnected: mockUberState.isUberConnected,
    }),
}));
jest.mock('@hooks/useLocalize', () => () => ({translate: (key: string) => key}));
jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyExpensifyIcons: () => ({}),
}));
jest.mock('@hooks/useNetwork', () => () => ({isOffline: false}));
jest.mock('@hooks/usePolicyFeatureWriteAccess', () => () => ({canWrite: true, showReadOnlyModal: jest.fn()}));
jest.mock('@libs/Navigation/Navigation', () => ({__esModule: true, default: {navigate: jest.fn()}}));
jest.mock('@userActions/Link', () => ({openExternalLink: jest.fn()}));
jest.mock('@userActions/Policy/Policy', () => ({enablePolicyFeatureForConnection: jest.fn()}));

const policy: Policy = {
    ...createRandomPolicy(1, CONST.POLICY.TYPE.CORPORATE),
    id: 'policy-1',
    receiptPartners: {enabled: false, uber: {connectFormData: 'form=data'}},
};

describe('useReceiptPartnerConnectionListings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUberData = {
            title: 'Uber for Business',
            description: 'Connected',
            icon: undefined,
            errorFields: undefined,
        };
        mockUberState = {isUberConnected: false, shouldShowEnterCredentialsError: false, errorFields: undefined};
    });

    it('should mark a connected Uber as broken when its last update failed', () => {
        // Given a connected Uber whose disconnect failed, which leaves errorFields on the connection
        mockUberState = {isUberConnected: true, shouldShowEnterCredentialsError: false, errorFields: {connection: {error: 'Failed'}}};

        // When the listing is built
        const {result} = renderHook(() => useReceiptPartnerConnectionListings(policy));

        // Then the card reads as broken, so the admin sees the failure instead of a healthy status
        expect(result.current.at(0)?.status?.isBroken).toBe(true);
    });

    it('should turn Receipt partners on and open the Uber connect page when "+" is pressed', () => {
        // Given a workspace with Uber not connected
        const {result} = renderHook(() => useReceiptPartnerConnectionListings(policy));

        // When the admin presses "+" on Uber
        act(() => result.current.at(0)?.onConnect?.());

        // Then the feature is turned on and the Uber connect page opens, since Connections has no toggle for the feature
        expect(enablePolicyFeatureForConnection).toHaveBeenCalledWith(policy, CONST.POLICY.MORE_FEATURES.ARE_RECEIPT_PARTNERS_ENABLED);
        expect(openExternalLink).toHaveBeenCalledWith(`${CONST.UBER_CONNECT_URL}?form=data`);
    });

    it('should only open the invite flow for a connection started from the page', () => {
        // Given Uber's connection only shows up once its data loads, without the admin starting it here
        const {rerender, result} = renderHook(() => useReceiptPartnerConnectionListings(policy));
        mockUberState = {...mockUberState, isUberConnected: true};
        rerender({});

        // Then the invite flow stays closed, since the admin didn't just connect
        expect(Navigation.navigate).not.toHaveBeenCalled();

        // When the admin then connects Uber from the page and the connection shows up
        mockUberState = {...mockUberState, isUberConnected: false};
        rerender({});
        act(() => result.current.at(0)?.onConnect?.());
        mockUberState = {...mockUberState, isUberConnected: true};
        rerender({});

        // Then the invite flow opens once, so the admin can invite employees to the new connection
        expect(Navigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('should return documentation receipt listings even when Uber data is not available', () => {
        // Given a policy with no Uber data
        mockUberData = undefined;

        // When the listings are built
        const {result} = renderHook(() => useReceiptPartnerConnectionListings(policy));

        // Then all seven documentation listings are returned
        expect(result.current).toHaveLength(7);
        expect(result.current.map((item) => item.key)).toEqual([
            'lyft',
            'instacart',
            'doordash',
            'americanAirlines',
            'united',
            'delta',
            'kayak',
        ]);
        expect(result.current.every((item) => item.category === CONST.TAB.CONNECTIONS.RECEIPTS)).toBe(true);
    });

    it('should open setup guide external link when pressing "+" on a documentation receipt partner', () => {
        // Given the listings for a workspace
        const {result} = renderHook(() => useReceiptPartnerConnectionListings(policy));

        // When pressing "+" on Lyft
        const lyftListing = result.current.find((item) => item.key === 'lyft');
        act(() => lyftListing?.onConnect?.());

        // Then the external link opens and policy feature is not enabled
        expect(openExternalLink).toHaveBeenCalledWith(CONST.LYFT_HELP_URL);
        expect(enablePolicyFeatureForConnection).not.toHaveBeenCalled();
    });
});
