/** Keeps labels out of classic UIKit's landscape icon slot without disabling the iOS 26 workaround. */
import {renderHook} from '@testing-library/react-native';

import getTabBarIcon from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/tabIconRasterizer';
import useNativeTabBarOptions from '@libs/Navigation/AppNavigator/Navigators/NativeTabNavigator/useNativeTabBarOptions/index.ios';

import SCREENS from '@src/SCREENS';

import {Platform} from 'react-native';

describe('Native tab labels across iOS versions', () => {
    const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version');
    afterEach(() => {
        if (originalVersion) {
            Object.defineProperty(Platform, 'Version', originalVersion);
        } else {
            Reflect.deleteProperty(Platform, 'Version');
        }
        jest.clearAllMocks();
    });

    it.each([
        ['16.7', false],
        ['18.6.2', false],
        ['26.0.1', true],
        [26, true],
    ] as const)('uses the appropriate label renderer on iOS %s', (version, shouldBakeLabel) => {
        // Given a version string may include more than one decimal point
        Object.defineProperty(Platform, 'Version', {configurable: true, value: version});
        const {result} = renderHook(() => useNativeTabBarOptions({shouldShowNativeTabBar: true, dotColors: {}, tabLabels: {[SCREENS.HOME]: 'Home'}}));
        // When the native tab requests either selection state
        const options = result.current.getTabOptions(SCREENS.HOME);
        const getParams = jest.mocked(getTabBarIcon).mock.calls.at(-1)?.[1];
        // Then classic UIKit receives an icon without text while iOS 26 retains its image label
        expect(options.tabBarLabel).toBe(shouldBakeLabel ? '' : 'Home');
        expect(options.tabBarAccessibilityLabel).toBe('Home');
        for (const selected of [false, true]) {
            expect(!!getParams?.(selected).label).toBe(shouldBakeLabel);
        }
    });
});
