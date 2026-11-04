/** Existing-account merge failures must explain the next step while preserving specific security errors. */
import {AddWorkEmail, MergeIntoAccountAndLogin} from '@libs/actions/Session';
import * as API from '@libs/API';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type RequestSpy = jest.SpiedFunction<typeof API.makeRequestWithSideEffects>;

describe('Blocked work-email merge guidance', () => {
    let request: RequestSpy;
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));
    beforeEach(() => {
        request = jest.spyOn(API, 'makeRequestWithSideEffects');
    });
    afterEach(async () => {
        jest.restoreAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('sets existing-account guidance during initial onboarding without a task report', async () => {
        // Given the work email already belongs to a validated account
        request.mockResolvedValue({jsonCode: CONST.JSON_CODE.EXP_ERROR, message: CONST.WORK_EMAIL_VALIDATED_PUBLIC_DOMAIN_ERROR});
        // When the regular onboarding path adds the email
        AddWorkEmail('work@example.com');
        await waitForBatchedUpdates();
        // Then it receives the same guidance as Concierge task onboarding
        expect(await getOnyxValue(ONYXKEYS.ONBOARDING_ERROR_MESSAGE_TRANSLATION_KEY)).toBe('onboarding.mergeBlockScreen.validatedPublicDomainSubtitle');
    });

    it.each([
        [CONST.JSON_CODE.EXP_ERROR, CONST.WORK_EMAIL_VALIDATED_PUBLIC_DOMAIN_ERROR, 'onboarding.mergeBlockScreen.validatedPublicDomainSubtitle'],
        [501, CONST.WORK_EMAIL_VALIDATED_PUBLIC_DOMAIN_ERROR, 'onboarding.mergeBlockScreen.validatedPublicDomainSubtitle'],
        [CONST.JSON_CODE.EXP_ERROR, 'Unexpected merge failure', undefined],
        [501, '', undefined],
        [CONST.JSON_CODE.EXP_ERROR, CONST.MERGE_ACCOUNT_2FA_ERROR, 'onboarding.workEmail2FAError'],
        [501, CONST.MERGE_ACCOUNT_SINGLE_SIGN_ON_ERROR, 'onboarding.singleSignOnError'],
    ])('shows the right reason for blocked merge code %s and message %s', async (jsonCode, message, expected) => {
        // Given a blocked response may communicate its state through Onyx rather than a single error code
        request.mockResolvedValue({
            jsonCode,
            message,
            onyxData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.NVP_ONBOARDING, value: {isMergingAccountBlocked: true, isMergeAccountStepCompleted: true}}],
        });
        // When validating the existing work account
        const result = await MergeIntoAccountAndLogin('work@example.com', '123456', 1);
        await waitForBatchedUpdates();
        // Then known errors get guidance and unclassified errors retain the generic fallback, without authenticating
        expect(result.didMerge).toBe(false);
        expect(await getOnyxValue(ONYXKEYS.ONBOARDING_ERROR_MESSAGE_TRANSLATION_KEY)).toBe(expected);
    });

    it('keeps invalid-code feedback instead of telling the user to merge', async () => {
        // Given a wrong security code can be corrected on the current screen
        request.mockResolvedValue({jsonCode: CONST.JSON_CODE.EXP_ERROR, message: CONST.MERGE_ACCOUNT_INVALID_CODE_ERROR});
        // When the validation is rejected
        await MergeIntoAccountAndLogin('work@example.com', '000001', 1);
        await waitForBatchedUpdates();
        // Then the specific code error remains available
        expect(await getOnyxValue(ONYXKEYS.ONBOARDING_ERROR_MESSAGE_TRANSLATION_KEY)).toBe('contacts.genericFailureMessages.validateSecondaryLogin');
    });
});
