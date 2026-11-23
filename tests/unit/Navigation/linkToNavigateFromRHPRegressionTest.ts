import {TurboModuleRegistry} from 'react-native';

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
    },
}));

const originalGetEnforcing = TurboModuleRegistry.getEnforcing;
jest.spyOn(TurboModuleRegistry, 'getEnforcing').mockImplementation((name: string) => {
    if (name === 'ReactNativeHybridApp') {
        return {} as any;
    }
    return originalGetEnforcing(name);
});

import linkTo from '@libs/Navigation/helpers/linkTo';
import NAVIGATORS from '@src/NAVIGATORS';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {NavigationState} from '@react-navigation/native';
import type {RootNavigatorParamList} from '@libs/Navigation/types';
import createMock from '../../utils/createMock';

describe('Regression proof: Navigation.navigate from RHP pushes TAB_NAVIGATOR above RHP', () => {
    it('dispatches PUSH instead of dismissing RHP when calling navigate to SEARCH_ROOT', () => {
        // Given a root navigation state with Workspace Members in TAB_NAVIGATOR and Member Details in RIGHT_MODAL_NAVIGATOR
        const currentState = createMock<NavigationState<RootNavigatorParamList>>({
            routes: [
                {name: NAVIGATORS.TAB_NAVIGATOR, key: 'tab-workspaces'},
                {name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR, key: 'rhp-member-details'},
            ],
            index: 1,
            key: 'root',
            routeNames: [NAVIGATORS.TAB_NAVIGATOR, NAVIGATORS.RIGHT_MODAL_NAVIGATOR],
            stale: false,
            type: 'stack',
        });

        const dispatchedActions: any[] = [];
        const mockNavigation = {
            dispatch: jest.fn((action) => dispatchedActions.push(action)),
            getState: () => currentState,
            getRootState: () => currentState,
        };

        const targetRoute = ROUTES.SEARCH_ROOT.getRoute({
            query: 'type:chat from:12345',
            rawQuery: 'type:chat from:12345',
        });

        // When navigating to Search using plain Navigation.navigate
        linkTo(mockNavigation as any, targetRoute, undefined, undefined, false);

        // Then linkTo/index.ts:241-244 overrides the action to PUSH
        expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
        const action = dispatchedActions[0];
        
        // Proof of regression: action.type is PUSH (not a tab switch or modal dismissal)
        expect(action.type).toBe(CONST.NAVIGATION.ACTION_TYPE.PUSH);
        expect(action.payload.name).toBe(NAVIGATORS.TAB_NAVIGATOR);

        // Resulting stack: [TAB_NAVIGATOR, RIGHT_MODAL_NAVIGATOR, TAB_NAVIGATOR]
        // Browser Back pops the top TAB_NAVIGATOR, returning the user to RIGHT_MODAL_NAVIGATOR (Member Details)
        // rather than the underlying Workspace Members page.
    });

    it('does not dispatch PUSH when RHP is already dismissed before navigating', () => {
        // Given root navigation state after RHP is dismissed (only TAB_NAVIGATOR exists)
        const currentState = createMock<NavigationState<RootNavigatorParamList>>({
            routes: [
                {name: NAVIGATORS.TAB_NAVIGATOR, key: 'tab-workspaces'},
            ],
            index: 0,
            key: 'root',
            routeNames: [NAVIGATORS.TAB_NAVIGATOR],
            stale: false,
            type: 'stack',
        });

        const dispatchedActions: any[] = [];
        const mockNavigation = {
            dispatch: jest.fn((action) => dispatchedActions.push(action)),
            getState: () => currentState,
            getRootState: () => currentState,
        };

        const targetRoute = ROUTES.SEARCH_ROOT.getRoute({
            query: 'type:chat from:12345',
            rawQuery: 'type:chat from:12345',
        });

        // When navigating after modal dismissal (dismissModal + afterTransition)
        linkTo(mockNavigation as any, targetRoute, undefined, undefined, false);

        expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
        const action = dispatchedActions[0];

        // It does not push a new TAB_NAVIGATOR above an RHP
        expect(action.type).not.toBe(CONST.NAVIGATION.ACTION_TYPE.PUSH);
    });
});
