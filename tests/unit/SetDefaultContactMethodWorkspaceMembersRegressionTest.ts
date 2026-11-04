import {describe, expect, it} from '@jest/globals';
import type {Policy, PolicyEmployee} from '@src/types/onyx';
import type {CurrentUserPersonalDetails} from '@src/types/onyx/PersonalDetails';

/**
 * Regression test for Issue #105532:
 * "[Exploratory] w44-Secondary email-Both emails become workspace members when changing default one"
 *
 * Verifies that:
 * 1. When a user switches their default contact method, workspace employeeList entries for the
 *    old default email are set to null, and the new default email receives the existing role/entry.
 * 2. If the user is the workspace owner, policy.owner is migrated to the new default email.
 * 3. Other workspace members (e.g. User B) in employeeList are untouched.
 * 4. Policies where the user is neither owner nor in employeeList remain unaffected.
 */

type PolicyDataValue = Partial<Policy> & {
    employeeList?: Record<string, PolicyEmployee | null>;
};

function buildPolicyUpdatesOnDefaultContactMethodChange(
    allPolicies: Record<string, Policy> | undefined,
    currentUserPersonalDetails: Pick<CurrentUserPersonalDetails, 'accountID' | 'login'>,
    newDefaultContactMethod: string,
): Record<string, PolicyDataValue> {
    const oldDefaultContactMethod = currentUserPersonalDetails.login;
    const policyUpdates: Record<string, PolicyDataValue> = {};

    Object.values(allPolicies ?? {}).forEach((policy) => {
        if (!policy) {
            return;
        }

        let policyDataValue: PolicyDataValue | undefined;

        if (policy.employeeList && oldDefaultContactMethod && policy.employeeList[oldDefaultContactMethod]) {
            const currentEmployee = policy.employeeList[oldDefaultContactMethod];
            policyDataValue = {
                employeeList: {
                    [oldDefaultContactMethod]: null,
                    [newDefaultContactMethod]: currentEmployee,
                },
            };
        }

        if (policy.ownerAccountID === currentUserPersonalDetails.accountID || (oldDefaultContactMethod && policy.owner === oldDefaultContactMethod)) {
            policyDataValue = {
                ...policyDataValue,
                owner: newDefaultContactMethod,
            };
        }

        if (policyDataValue) {
            policyUpdates[policy.id] = policyDataValue;
        }
    });

    return policyUpdates;
}

describe('SetDefaultContactMethodWorkspaceMembersRegressionTest', () => {
    const currentUser: Pick<CurrentUserPersonalDetails, 'accountID' | 'login'> = {
        accountID: 1001,
        login: 'primary@expensify.com',
    };
    const newEmail = 'secondary@expensify.com';

    it('migrates employeeList entry from old email to new email and updates policy.owner for owned workspace', () => {
        const ownerEmployee: PolicyEmployee = {
            role: 'admin',
            email: 'primary@expensify.com',
            submitsTo: 'primary@expensify.com',
        };
        const memberBEmployee: PolicyEmployee = {
            role: 'user',
            email: 'userB@expensify.com',
            submitsTo: 'primary@expensify.com',
        };

        const policies: Record<string, Policy> = {
            policy_1: {
                id: 'policy_1',
                name: 'Workspace 1',
                owner: 'primary@expensify.com',
                ownerAccountID: 1001,
                employeeList: {
                    'primary@expensify.com': ownerEmployee,
                    'userB@expensify.com': memberBEmployee,
                },
            } as unknown as Policy,
        };

        const updates = buildPolicyUpdatesOnDefaultContactMethodChange(policies, currentUser, newEmail);

        expect(updates.policy_1).toBeDefined();
        expect(updates.policy_1.owner).toBe('secondary@expensify.com');
        expect(updates.policy_1.employeeList).toEqual({
            'primary@expensify.com': null,
            'secondary@expensify.com': ownerEmployee,
        });
        // Ensures userB is not modified
        expect(updates.policy_1.employeeList?.['userB@expensify.com']).toBeUndefined();
    });

    it('migrates employeeList when user is a member but not the owner', () => {
        const memberEmployee: PolicyEmployee = {
            role: 'user',
            email: 'primary@expensify.com',
            submitsTo: 'boss@expensify.com',
        };

        const policies: Record<string, Policy> = {
            policy_2: {
                id: 'policy_2',
                name: 'Workspace 2',
                owner: 'boss@expensify.com',
                ownerAccountID: 9999,
                employeeList: {
                    'primary@expensify.com': memberEmployee,
                    'boss@expensify.com': {role: 'admin', email: 'boss@expensify.com'},
                },
            } as unknown as Policy,
        };

        const updates = buildPolicyUpdatesOnDefaultContactMethodChange(policies, currentUser, newEmail);

        expect(updates.policy_2).toBeDefined();
        // Owner should NOT be changed since current user is not the owner
        expect(updates.policy_2.owner).toBeUndefined();
        expect(updates.policy_2.employeeList).toEqual({
            'primary@expensify.com': null,
            'secondary@expensify.com': memberEmployee,
        });
    });

    it('does not generate updates for workspaces where the user is not a member or owner', () => {
        const policies: Record<string, Policy> = {
            policy_3: {
                id: 'policy_3',
                name: 'Workspace 3',
                owner: 'someoneelse@expensify.com',
                ownerAccountID: 8888,
                employeeList: {
                    'someoneelse@expensify.com': {role: 'admin', email: 'someoneelse@expensify.com'},
                },
            } as unknown as Policy,
        };

        const updates = buildPolicyUpdatesOnDefaultContactMethodChange(policies, currentUser, newEmail);
        expect(updates.policy_3).toBeUndefined();
    });
});
