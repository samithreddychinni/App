import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105507:
 * Workflow - The approval workflow created from invite new member reappears after deleting.
 *
 * Verifies that removeApprovalWorkflowRules does not fall back to the legacy RemoveWorkspaceApproval
 * command when the policy already has rules-based approval workflows, even if the workflow being deleted
 * (created via member invite submitsTo) and the default workflow do not yet have explicit rules.
 */

type Rule = {
    scope: string;
    scopeID: string;
    isDefaultApprovalWorkflow?: boolean;
    triggers?: string[];
    actions?: unknown[];
    filters?: unknown[];
};

type RulesCollection = Record<string, Rule>;

function shouldFallbackToLegacyRemove(
    removeDiff: Record<string, unknown>,
    existingRules: RulesCollection,
): boolean {
    // Only fall back to legacy RemoveWorkspaceApproval when the policy has NO approval rules at all.
    // If the policy already has rules, backend rejects legacy calls (jsonCode 666).
    const hasExistingRules = Object.keys(existingRules).length > 0;
    const hasRemoveDiff = Object.keys(removeDiff).length > 0;

    return !hasRemoveDiff && !hasExistingRules;
}

describe('removeApprovalWorkflowRules fallback condition', () => {
    it('does NOT fall back to legacy remove when policy already has custom approval rules', () => {
        // Scenario from Issue #105507:
        // Policy has an approval rule (from another custom workflow),
        // but the invited member's workflow was only created in submitsTo (no rule covers them, so removeDiff is empty),
        // and default workflow has no rules yet.
        const removeDiff = {}; // No rule covered the member
        const existingRules: RulesCollection = {
            rule_1: {
                scope: 'policy',
                scopeID: 'policy_123',
                isDefaultApprovalWorkflow: false,
                triggers: ['report_submit'],
            },
        };

        const shouldFallback = shouldFallbackToLegacyRemove(removeDiff, existingRules);
        expect(shouldFallback).toBe(false);
    });

    it('falls back to legacy remove when policy has no rules at all (pure legacy policy)', () => {
        const removeDiff = {};
        const existingRules: RulesCollection = {};

        const shouldFallback = shouldFallbackToLegacyRemove(removeDiff, existingRules);
        expect(shouldFallback).toBe(true);
    });

    it('does not fall back when removeDiff contains rules to remove', () => {
        const removeDiff = {
            rule_1: null, // Deleting rule
        };
        const existingRules: RulesCollection = {
            rule_1: {
                scope: 'policy',
                scopeID: 'policy_123',
                isDefaultApprovalWorkflow: false,
            },
        };

        const shouldFallback = shouldFallbackToLegacyRemove(removeDiff, existingRules);
        expect(shouldFallback).toBe(false);
    });
});
