/** Separates rule-based approval routing from the legacy employee-list contract. */
import {getForwardsToFromRules} from '@libs/PolicyUtils/approvals';
import {buildApprovalWorkflowRules, convertApprovalWorkflowToPolicyEmployees} from '@libs/WorkflowUtils';

import CONST from '@src/CONST';
import type {Policy, Rule} from '@src/types/onyx';
import type ApprovalWorkflow from '@src/types/onyx/ApprovalWorkflow';

import createMock from '../utils/createMock';

const workflow = createMock<ApprovalWorkflow>({
    members: [{email: 'submitter@example.com'}],
    approvers: [{email: 'first@example.com', approvalLimit: 5000, overLimitForwardsTo: 'over@example.com'}, {email: 'second@example.com'}],
    isDefault: false,
});
const policy = createMock<Policy>({id: 'policy'});

describe('Over-limit routing contract', () => {
    it.each([
        [-4999, ['first@example.com', 'second@example.com']],
        [-5000, ['first@example.com', 'second@example.com']],
        [-5001, ['first@example.com', 'over@example.com', 'second@example.com']],
    ])('routes total %s through %j with rules enabled', (reportTotal, expected) => {
        // Given the rules path can represent an over-limit step within one workflow
        const rules = Object.fromEntries(
            buildApprovalWorkflowRules(workflow).map((rule, index) => [`rule_${index}`, createMock<Rule>({...rule, scope: CONST.RULES.SCOPE.POLICY, scopeID: policy.id})]),
        );
        const chain: string[] = [];
        let currentApproverEmail: string | undefined;
        // When every approval evaluates the generated rules, as the next approver would
        for (let step = 0; step < 5; step++) {
            const next = getForwardsToFromRules(policy, {submitterEmail: 'submitter@example.com', currentApproverEmail, reportTotal: Number(reportTotal)}, rules)?.forwardsTo;
            if (!next) {
                break;
            }
            chain.push(next);
            currentApproverEmail = next;
        }
        // Then the over-limit approver does not replace the second approver on this path
        expect(chain).toEqual(expected);
        expect(Object.keys(rules).length).toBeGreaterThan(0);
    });

    it('does not rewrite another employee global forwarding target in the legacy save path', () => {
        // Given an over-limit approver may participate in a separate workflow
        const overLimitApprover = 'over@example.com';
        const employees = {[overLimitApprover]: {email: 'over@example.com', forwardsTo: 'unrelated@example.com'}};
        // When the employee-list path serializes this workflow
        const changes = convertApprovalWorkflowToPolicyEmployees({approvalWorkflow: workflow, previousEmployeeList: employees, type: CONST.APPROVAL_WORKFLOW.TYPE.CREATE});
        // Then its existing global forwarding contract is preserved until product and backend agree on a change
        expect(changes['over@example.com']).toBeUndefined();
        expect(employees['over@example.com'].forwardsTo).toBe('unrelated@example.com');
    });
});
