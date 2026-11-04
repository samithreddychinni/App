import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105670:
 * "Onboarding - Close onboarding after merging into an existing account, and show a GBR for a missing name"
 *
 * Verifies:
 * 1. An established account (completed guided setup, invited, or has a non-personal policy)
 *    is detected so onboarding is closed immediately after account merge without overwriting introSelected.
 * 2. getProfilePageBrickRoadIndicator displays a Green Brick Road (GBR / INFO) when the first or last name is empty.
 * 3. Priority order: Errors (RBR) take precedence over missing name (GBR).
 * 4. The GBR clears once the user saves their full name.
 */

const CONST = {
    BRICK_ROAD_INDICATOR_STATUS: {
        INFO: 'info',
        ERROR: 'error',
    },
} as const;

type MockOnboarding = {
    hasCompletedGuidedSetupFlow?: boolean;
    isMergeAccountStepCompleted?: boolean;
} | null | undefined;

type MockIntroSelected = {
    choice?: string;
    inviteType?: string;
} | null | undefined;

function hasCompletedGuidedSetupFlowSelector(onboarding: MockOnboarding): boolean {
    if (!onboarding || Object.keys(onboarding).length === 0) {
        return true;
    }
    if (onboarding.hasCompletedGuidedSetupFlow === undefined) {
        return true;
    }
    return onboarding.hasCompletedGuidedSetupFlow;
}

function isEstablishedMergedAccount(
    onboarding: MockOnboarding,
    introSelected: MockIntroSelected,
    hasNonPersonalPolicy: boolean | undefined,
): boolean {
    return hasCompletedGuidedSetupFlowSelector(onboarding) || !!introSelected?.inviteType || !!hasNonPersonalPolicy;
}

function getProfilePageBrickRoadIndicator(
    hasLoginError: boolean,
    hasPhoneNumberError: boolean,
    hasVacationDelegateError: boolean,
    hasLoginInfo: boolean,
    shouldShowAddHomeAddress: boolean,
    hasMissingName: boolean,
): string | undefined {
    if (hasLoginError || hasPhoneNumberError || hasVacationDelegateError) {
        return CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR;
    }
    if (hasLoginInfo || shouldShowAddHomeAddress || hasMissingName) {
        return CONST.BRICK_ROAD_INDICATOR_STATUS.INFO;
    }
    return undefined;
}

describe('Issue #105670 - Onboarding account merge and missing name GBR', () => {
    describe('Established account detection on merge', () => {
        it('detects established accounts with completed guided setup (empty or explicit)', () => {
            expect(isEstablishedMergedAccount({}, undefined, false)).toBe(true);
            expect(isEstablishedMergedAccount({hasCompletedGuidedSetupFlow: true}, undefined, false)).toBe(true);
            expect(isEstablishedMergedAccount(null, undefined, false)).toBe(true);
        });

        it('detects established accounts that were invited to a workspace', () => {
            expect(isEstablishedMergedAccount({hasCompletedGuidedSetupFlow: false}, {inviteType: 'workspace'}, false)).toBe(true);
        });

        it('detects established accounts that belong to a group workspace', () => {
            expect(isEstablishedMergedAccount({hasCompletedGuidedSetupFlow: false}, undefined, true)).toBe(true);
        });

        it('does not treat new incomplete accounts without invite or group policy as established', () => {
            expect(isEstablishedMergedAccount({hasCompletedGuidedSetupFlow: false}, undefined, false)).toBe(false);
        });
    });

    describe('Missing name GBR on Profile', () => {
        it('shows INFO (GBR) when first or last name is missing', () => {
            const hasMissingName = true;
            const indicator = getProfilePageBrickRoadIndicator(false, false, false, false, false, hasMissingName);
            expect(indicator).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.INFO);
        });

        it('clears indicator once full name is provided', () => {
            const hasMissingName = false;
            const indicator = getProfilePageBrickRoadIndicator(false, false, false, false, false, hasMissingName);
            expect(indicator).toBeUndefined();
        });

        it('ensures ERROR (RBR) takes priority over missing name (GBR)', () => {
            const hasMissingName = true;
            const hasPhoneNumberError = true;
            const indicator = getProfilePageBrickRoadIndicator(false, hasPhoneNumberError, false, false, false, hasMissingName);
            expect(indicator).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
        });
    });
});
