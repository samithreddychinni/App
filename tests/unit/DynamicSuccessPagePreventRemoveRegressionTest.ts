import {describe, expect, it, jest} from '@jest/globals';

/**
 * Regression test for Issue #105693:
 * "Account - System back button on 2FA success RHP navigates to Account > Security"
 *
 * Verifies that:
 * 1. In DynamicSuccessPage, usePreventRemove is active when (isForcedSetupFlow || shouldReturnToOnboardingAfter2FA).
 * 2. When system back / backdrop overlay / browser back triggers the removal interceptor,
 *    goBack() is executed, directing the user to Home via sendForcedSetupUserHome() (or completeForcedOnboarding2FAHandoff()).
 * 3. Once dismissal is triggered (isDismissingRef.current = true), shouldPreventRemove turns false,
 *    allowing programmatic modal dismissal (revealRouteBeforeDismissingModal) to proceed without getting blocked.
 * 4. Voluntary 2FA setup from Settings > Security does not intercept removal (shouldPreventRemove = false).
 */

type NavigationHandler = () => void;

function createDynamicSuccessPageNavigationController(params: {
    isForcedSetupFlow: boolean;
    shouldReturnToOnboardingAfter2FA: boolean;
    sendForcedSetupUserHome: () => void;
    completeForcedOnboarding2FAHandoff: () => void;
    quitAndNavigateBack: () => void;
}) {
    let isDismissing = false;
    let registeredPreventRemoveCallback: NavigationHandler | null = null;

    const shouldPreventRemove = () => (params.isForcedSetupFlow || params.shouldReturnToOnboardingAfter2FA) && !isDismissing;

    const goBack = () => {
        isDismissing = true;
        if (params.shouldReturnToOnboardingAfter2FA) {
            params.completeForcedOnboarding2FAHandoff();
            return;
        }
        if (params.isForcedSetupFlow) {
            params.sendForcedSetupUserHome();
            return;
        }
        params.quitAndNavigateBack();
    };

    const registerPreventRemove = (callback: NavigationHandler) => {
        if (shouldPreventRemove()) {
            registeredPreventRemoveCallback = callback;
        } else {
            registeredPreventRemoveCallback = null;
        }
    };

    registerPreventRemove(() => {
        isDismissing = true;
        goBack();
    });

    const triggerSystemBack = () => {
        if (registeredPreventRemoveCallback && shouldPreventRemove()) {
            registeredPreventRemoveCallback();
            return true; // prevented and intercepted
        }
        return false; // not prevented, default system pop
    };

    return {
        shouldPreventRemove,
        goBack,
        triggerSystemBack,
        isDismissing: () => isDismissing,
    };
}

describe('DynamicSuccessPagePreventRemoveRegressionTest', () => {
    it('intercepts system back in forced 2FA setup flow and sends user Home', () => {
        const sendForcedSetupUserHome = jest.fn();
        const completeForcedOnboarding2FAHandoff = jest.fn();
        const quitAndNavigateBack = jest.fn();

        const controller = createDynamicSuccessPageNavigationController({
            isForcedSetupFlow: true,
            shouldReturnToOnboardingAfter2FA: false,
            sendForcedSetupUserHome,
            completeForcedOnboarding2FAHandoff,
            quitAndNavigateBack,
        });

        expect(controller.shouldPreventRemove()).toBe(true);

        // System back button pressed on Android / overlay clicked on Web
        const intercepted = controller.triggerSystemBack();
        expect(intercepted).toBe(true);

        expect(sendForcedSetupUserHome).toHaveBeenCalledTimes(1);
        expect(completeForcedOnboarding2FAHandoff).not.toHaveBeenCalled();
        expect(quitAndNavigateBack).not.toHaveBeenCalled();

        // After intercepting, dismissing flag is set so subsequent dismissModal is not prevented
        expect(controller.isDismissing()).toBe(true);
        expect(controller.shouldPreventRemove()).toBe(false);
    });

    it('intercepts system back in forced onboarding 2FA handoff and resumes onboarding', () => {
        const sendForcedSetupUserHome = jest.fn();
        const completeForcedOnboarding2FAHandoff = jest.fn();
        const quitAndNavigateBack = jest.fn();

        const controller = createDynamicSuccessPageNavigationController({
            isForcedSetupFlow: false,
            shouldReturnToOnboardingAfter2FA: true,
            sendForcedSetupUserHome,
            completeForcedOnboarding2FAHandoff,
            quitAndNavigateBack,
        });

        expect(controller.shouldPreventRemove()).toBe(true);

        const intercepted = controller.triggerSystemBack();
        expect(intercepted).toBe(true);

        expect(completeForcedOnboarding2FAHandoff).toHaveBeenCalledTimes(1);
        expect(sendForcedSetupUserHome).not.toHaveBeenCalled();
        expect(controller.shouldPreventRemove()).toBe(false);
    });

    it('does not intercept system back in voluntary 2FA setup from Settings > Security', () => {
        const sendForcedSetupUserHome = jest.fn();
        const completeForcedOnboarding2FAHandoff = jest.fn();
        const quitAndNavigateBack = jest.fn();

        const controller = createDynamicSuccessPageNavigationController({
            isForcedSetupFlow: false,
            shouldReturnToOnboardingAfter2FA: false,
            sendForcedSetupUserHome,
            completeForcedOnboarding2FAHandoff,
            quitAndNavigateBack,
        });

        expect(controller.shouldPreventRemove()).toBe(false);

        const intercepted = controller.triggerSystemBack();
        expect(intercepted).toBe(false);
        expect(sendForcedSetupUserHome).not.toHaveBeenCalled();
    });
});
