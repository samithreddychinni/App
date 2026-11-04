/** Diagnoses the proposed missing-preloadedRoutes mechanism without claiming to reproduce the production crash. */
import RightModalRouter from '@navigation/AppNavigator/createRightModalNavigator/RightModalRouter';
import {clearPreservedNavigatorStates, setPreservedNavigatorState} from '@navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';

import type {ParamListBase, StackNavigationState} from '@react-navigation/native';

import {StackRouter} from '@react-navigation/native';

import createMock from '../utils/createMock';

const config = {routeNames: ['First', 'Second'], routeParamList: {}, routeGetIdList: {}};
const changes = {...config, routeKeyChanges: []};

describe('Preserved stack state diagnosis', () => {
    afterEach(() => clearPreservedNavigatorStates());

    it('confirms that a complete preserved stack does not crash when route names change', () => {
        // Given snapshots produced by StackRouter include its preload array
        const stack = StackRouter({});
        const state = stack.getInitialState(config);
        setPreservedNavigatorState('parent', state);
        const router = RightModalRouter({parentRoute: {key: 'parent', name: 'Parent'}});
        // When the custom router restores that valid snapshot
        const restored = router.getInitialState(config);
        // Then no normalization is necessary and route-name changes remain safe
        expect(restored).toBe(state);
        expect(() => router.getStateForRouteNamesChange(restored, changes)).not.toThrow();
    });

    it('demonstrates the crash only after deliberately removing the preload array', () => {
        // Given a deliberately malformed snapshot, whose production origin still needs to be identified
        const stack = StackRouter({});
        const state = stack.getInitialState(config);
        const {preloadedRoutes, ...withoutPreloads} = state;
        setPreservedNavigatorState('parent', createMock<StackNavigationState<ParamListBase>>(withoutPreloads));
        const router = RightModalRouter({parentRoute: {key: 'parent', name: 'Parent'}});
        // When route-name reconciliation reads that malformed state
        const restored = router.getInitialState(config);
        // Then it reproduces the undefined filter mechanism, rather than proving this caused APP-KC9
        expect(preloadedRoutes).toEqual([]);
        expect(() => router.getStateForRouteNamesChange(restored, changes)).toThrow();
    });

    it('shows why always marking preserved states stale can change the active route', () => {
        // Given a valid preserved stack focused before its last route
        const router = StackRouter({});
        const state = {
            ...router.getInitialState(config),
            index: 0,
            routes: [
                {key: 'first', name: 'First'},
                {key: 'second', name: 'Second'},
            ],
        };
        // When the proposed unconditional rehydration treats it as stale
        const restored = router.getRehydratedState({...state, stale: true}, config);
        // Then it focuses the last route, so this proposal needs a narrower restoration contract
        expect(restored.index).toBe(1);
        expect(state.index).toBe(0);
    });
});
