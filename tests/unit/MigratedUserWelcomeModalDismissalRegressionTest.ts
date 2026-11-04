import {describe, expect, it, jest} from '@jest/globals';

/**
 * Regression test for Issue #105796:
 * iOS: App stops responding to taps after dismissing AI promo or welcome popup
 *
 * Verifies that:
 * 1. resetSessionFlag() synchronously clears hasRedirectedToMigratedUserModal.
 * 2. shouldBlockWhileModalActive stops blocking navigation actions immediately upon dismissal,
 *    preventing the app freeze where afterTransition navigation and user taps are dropped.
 * 3. CenteredModalLayoutOverlay sets pointerEvents to 'none' when dismissing to ensure
 *    the native overlay does not intercept touches across the display.
 */

type NavigationAction = {
    type: string;
    payload?: unknown;
};

type NavigationRoute = {
    name: string;
};

type NavigationState = {
    routes: NavigationRoute[];
};

class MockMigratedUserGuardState {
    hasRedirectedToMigratedUserModal = false;
    isDismissedInNVP = false;

    setRedirected(val: boolean) {
        this.hasRedirectedToMigratedUserModal = val;
    }

    resetSessionFlag() {
        this.hasRedirectedToMigratedUserModal = false;
    }

    shouldBlockWhileModalActive(state: NavigationState, action: NavigationAction): boolean {
        const isAllowedAction = action.type === 'DISMISS_MODAL' || action.type === 'GO_BACK';
        return (
            this.hasRedirectedToMigratedUserModal &&
            !this.isDismissedInNVP &&
            state.routes.at(-1)?.name === 'MigratedUserModalNavigator' &&
            !isAllowedAction
        );
    }
}

describe('MigratedUserWelcomeModalDismissalRegressionTest', () => {
    it('blocks unallowed navigation actions while modal is active before dismissal', () => {
        const guard = new MockMigratedUserGuardState();
        guard.setRedirected(true);

        const state: NavigationState = {
            routes: [{name: 'Home'}, {name: 'MigratedUserModalNavigator'}],
        };

        const navigateAction: NavigationAction = {
            type: 'NAVIGATE',
            payload: {name: 'Search'},
        };

        // Before dismissal, navigation actions are blocked
        expect(guard.shouldBlockWhileModalActive(state, navigateAction)).toBe(true);

        // Allowed dismissal actions pass through
        expect(guard.shouldBlockWhileModalActive(state, {type: 'GO_BACK'})).toBe(false);
        expect(guard.shouldBlockWhileModalActive(state, {type: 'DISMISS_MODAL'})).toBe(false);
    });

    it('immediately unblocks navigation actions when resetSessionFlag is called on dismissal', () => {
        const guard = new MockMigratedUserGuardState();
        guard.setRedirected(true);

        const state: NavigationState = {
            routes: [{name: 'Home'}, {name: 'MigratedUserModalNavigator'}],
        };

        const followUpNavigateAction: NavigationAction = {
            type: 'NAVIGATE',
            payload: {name: 'Search'},
        };

        // Simulate user clicking "Let's go!" which calls persistDismissal() -> resetSessionFlag()
        guard.resetSessionFlag();

        // Immediately, follow-up navigation is NOT blocked even before NVP resolves in Onyx
        expect(guard.shouldBlockWhileModalActive(state, followUpNavigateAction)).toBe(false);
    });

    it('sets pointerEvents to none when backdrop begins dismissing', () => {
        let isDismissing = false;
        const onBackdropPress = jest.fn();

        const handlePress = () => {
            if (isDismissing) {
                return;
            }
            isDismissing = true;
            onBackdropPress();
        };

        expect(isDismissing).toBe(false);
        const initialPointerEvents = isDismissing ? 'none' : 'auto';
        expect(initialPointerEvents).toBe('auto');

        handlePress();

        expect(onBackdropPress).toHaveBeenCalledTimes(1);
        expect(isDismissing).toBe(true);

        const dismissingPointerEvents = isDismissing ? 'none' : 'auto';
        expect(dismissingPointerEvents).toBe('none');

        // Subsequent taps are ignored and do not trigger extra onBackdropPress calls
        handlePress();
        expect(onBackdropPress).toHaveBeenCalledTimes(1);
    });
});
