import {render, screen, within} from '@testing-library/react-native';
import React from 'react';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import InsightsDashboard from '@pages/Insights/InsightsDashboard';
import CONST from '@src/CONST';

jest.mock('@hooks/useResponsiveLayout');
jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));
jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: (key: string) => key,
    })),
);
jest.mock('@hooks/useThemeStyles', () =>
    jest.fn(() => ({
        flex1: {},
        flexRow: {},
        flexGrow1: {},
        flexShrink0: {},
        alignItemsCenter: {},
        gap2: {},
        pb3: {},
        pb5: {},
        centeredContentWidthLimiter: {},
        insightsPageControlsContainer: {},
        insightsDashboardScrollView: {},
        insightsDashboardLayout: () => ({}),
        insightsChartGrid: () => ({}),
        insightsChartColumn: () => ({}),
    })),
);
jest.mock('@hooks/useLayoutSpacing', () =>
    jest.fn(() => ({
        pageGutter: {},
    })),
);
jest.mock('@hooks/useTheme', () => jest.fn(() => ({})));
jest.mock('@hooks/usePermissions', () =>
    jest.fn(() => ({
        isBetaEnabled: () => false,
    })),
);
jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyExpensifyIcons: () => ({}),
}));
jest.mock('@hooks/useScrollEventEmitter', () => jest.fn(() => jest.fn()));
jest.mock('@components/Navigation/TabBarBottomContent/useTabRootScrollProps', () => jest.fn(() => ({})));
jest.mock('@components/Navigation/TabBarBottomContent/useTabRootScreenWrapperProps', () => jest.fn(() => ({})));
jest.mock('@hooks/useCurrentUserPersonalDetails', () => jest.fn(() => ({login: 'test@example.com'})));
jest.mock('@hooks/useOnyx', () => jest.fn(() => [{}, {status: 'loaded'}]));
jest.mock('@pages/Insights/hooks/useInsightsFilters', () =>
    jest.fn(() => ({
        filters: {policyIDs: [], date: {preset: 'last_month'}, groupBy: 'month', groupCurrency: 'USD'},
        defaultFilters: {},
        isResolved: true,
        setFilters: jest.fn(),
    })),
);
jest.mock('@pages/Insights/hooks/useInsightsExport', () =>
    jest.fn(() => ({
        headerRef: {current: null},
        controlsRef: {current: null},
        contentRef: {current: null},
        isExporting: false,
        isLoading: false,
        exportDashboard: jest.fn(),
        captureContext: {},
    })),
);
jest.mock('@hooks/useMultipleSnapshots', () => jest.fn(() => ({})));
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
}));
jest.mock('@components/ScreenWrapper', () => {
    const {View} = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({children, testID}: any) => <View testID={testID}>{children}</View>;
});
jest.mock('@components/ScrollView', () => {
    const {View} = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({children, testID}: any) => <View testID={testID ?? 'insights-scroll-view'}>{children}</View>;
});
jest.mock('@components/Navigation/TopBar', () => {
    const {Text} = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({breadcrumbLabel}: any) => <Text testID="top-bar-header">{breadcrumbLabel}</Text>;
});

const mockUseResponsiveLayout = jest.mocked(useResponsiveLayout);

function buildLayout({shouldUseNarrowLayout, isInLandscapeMode}: {shouldUseNarrowLayout: boolean; isInLandscapeMode: boolean}): ReturnType<typeof useResponsiveLayout> {
    return {
        shouldUseNarrowLayout,
        isSmallScreenWidth: shouldUseNarrowLayout,
        isInNarrowPaneModal: false,
        isExtraSmallScreenHeight: false,
        isMediumScreenWidth: false,
        isLargeScreenWidth: !shouldUseNarrowLayout,
        isExtraLargeScreenWidth: false,
        isExtraSmallScreenWidth: false,
        isSmallScreen: shouldUseNarrowLayout,
        onboardingIsMediumOrLargerScreenWidth: !shouldUseNarrowLayout,
        isInLandscapeMode,
    };
}

describe('InsightsDashboard scroll header in landscape', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders header inside ScrollView when in landscape mode on narrow layout', () => {
        mockUseResponsiveLayout.mockReturnValue(buildLayout({shouldUseNarrowLayout: true, isInLandscapeMode: true}));

        render(
            <InsightsDashboard
                dashboardID={CONST.INSIGHTS_DASHBOARDS.TOTAL_SPEND}
                accessibleDashboards={[CONST.INSIGHTS_DASHBOARDS.TOTAL_SPEND]}
            />,
        );

        const scrollView = screen.getByTestID('insights-scroll-view');
        expect(within(scrollView).getByTestID('top-bar-header')).toBeTruthy();
    });

    it('renders header outside ScrollView when not in landscape mode', () => {
        mockUseResponsiveLayout.mockReturnValue(buildLayout({shouldUseNarrowLayout: true, isInLandscapeMode: false}));

        render(
            <InsightsDashboard
                dashboardID={CONST.INSIGHTS_DASHBOARDS.TOTAL_SPEND}
                accessibleDashboards={[CONST.INSIGHTS_DASHBOARDS.TOTAL_SPEND]}
            />,
        );

        const scrollView = screen.getByTestID('insights-scroll-view');
        expect(within(scrollView).queryByTestID('top-bar-header')).toBeNull();
        expect(screen.getByTestID('top-bar-header')).toBeTruthy();
    });
});
