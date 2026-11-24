import {clearPolicyCategoriesLoadingState, getPolicyCategories} from '@libs/actions/Policy/Category';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {canMemberRead} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PolicyCategories} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useRef} from 'react';

import useNetwork from './useNetwork';
import useOnyx from './useOnyx';

const hasPolicyCategoriesSelector = (policyCategories: OnyxEntry<PolicyCategories>) => policyCategories !== undefined;

/**
 * Fetches a policy's categories on demand when a category picker mounts, so a lazy-loaded account does not show only
 * the category already on the expense.
 *
 * The guard is the RAM-only loading state written by `getPolicyCategories`, not "we already tried once": a read that
 * failed leaves `hasOnceLoaded` false, so the next mount or reconnect retries it. Gating on the collection existing
 * would not work either, since a partial collection holding just the selected category is indistinguishable from a
 * complete one. `isLoading` is applied optimistically, so concurrent pickers for the same policy do not each fire a
 * redundant `GetPolicyCategories` read (`API.read` does not dedupe in flight reads).
 */
function useLoadPolicyCategories(policyID: string | undefined) {
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${getNonEmptyStringOnyxID(policyID)}`);
    const [currentUserLogin] = useOnyx(ONYXKEYS.SESSION, {selector: (session) => session?.email});
    const [loadingState] = useOnyx(`${ONYXKEYS.COLLECTION.RAM_ONLY_POLICY_CATEGORIES_LOADING_STATE}${getNonEmptyStringOnyxID(policyID)}`);
    const [hasCategories = false] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${getNonEmptyStringOnyxID(policyID)}`, {selector: hasPolicyCategoriesSelector});
    const isLoading = !!loadingState?.isLoading;
    const hasOnceLoaded = !!loadingState?.hasOnceLoaded;
    const canReadCategories = canMemberRead(policy, currentUserLogin ?? '', CONST.POLICY.POLICY_FEATURE.CATEGORIES);

    // The policyID this instance has already dispatched a read for. A failed read clears `isLoading` without setting
    // `hasOnceLoaded`, which would otherwise re-satisfy the effect's guard and retry in a tight loop. Scoping the
    // attempt to this instance keeps the retry cadence at "next time a picker opens" (or the next reconnect below).
    const requestedPolicyIDRef = useRef<string>(undefined);

    const {isOffline} = useNetwork({
        onReconnect: () => {
            if (!policyID || hasOnceLoaded || !canReadCategories) {
                return;
            }
            // A read cut off by the disconnect never gets a response, so its `failureData` never applies and
            // `isLoading` would stay true for the rest of the session. Clear it so the effect below can retry.
            requestedPolicyIDRef.current = undefined;
            clearPolicyCategoriesLoadingState(policyID);
        },
    });

    useEffect(() => {
        if (isOffline || !policyID || isLoading || hasOnceLoaded || requestedPolicyIDRef.current === policyID || !canReadCategories) {
            return;
        }
        requestedPolicyIDRef.current = policyID;
        getPolicyCategories(policyID);
    }, [policyID, isOffline, isLoading, hasOnceLoaded, canReadCategories]);

    // True only while the read is unsettled and there is nothing to render yet, so the picker shows a skeleton instead
    // of an empty list. The `policyID` check mirrors the effect's guard: with no policyID no read is ever dispatched,
    // so the absent loading state would otherwise keep the skeleton up forever.
    const isLoadingCompletePolicyCategories = !!policyID && !isOffline && !hasOnceLoaded && canReadCategories && (isLoading || loadingState === undefined);
    const isLoadingPolicyCategories = isLoadingCompletePolicyCategories && !hasCategories;

    return {isLoadingPolicyCategories, isLoadingCompletePolicyCategories};
}

export default useLoadPolicyCategories;
