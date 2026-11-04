import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105756:
 * Unable to create a new Expense from Reports > More > Create Expense.
 *
 * Verifies that getIsViolationFixed correctly marks `tagOutOfPolicy` violations as fixed for
 * multi-level tags (e.g. 'Department:Engineering') by parsing tag hierarchies, rather than
 * indexing `tagList.tags?.[tag]` with the full colon-separated string.
 */

type PolicyTag = {
    name: string;
    enabled: boolean;
};

type PolicyTagList = {
    name: string;
    tags: Record<string, PolicyTag>;
};

type PolicyTagLists = Record<string, PolicyTagList>;

function getTagArrayFromName(tagName: string): string[] {
    return tagName.split(':');
}

function hasMatchingTag(policyTagLists: PolicyTagLists | undefined, transactionTag: string): boolean {
    if (!policyTagLists || !transactionTag) {
        return false;
    }

    const transactionTagArray = getTagArrayFromName(transactionTag);

    return transactionTagArray.some((tag) => {
        const tagName = tag.trim();
        return Object.values(policyTagLists).some((tagList) => {
            if (!tagList?.tags) {
                return false;
            }
            return Object.values(tagList.tags).some((policyTag) => policyTag.name === tagName && policyTag.enabled);
        });
    });
}

function hasEnabledTags(tags?: Record<string, PolicyTag>): boolean {
    return Object.values(tags ?? {}).some((tag) => tag.enabled);
}

function checkIsTagOutOfPolicyFixed(tag: string | undefined, policyTagLists: PolicyTagLists | undefined): boolean {
    if (!tag) {
        return true;
    }
    if (!policyTagLists) {
        return false;
    }
    const hasAnyEnabledTags = Object.values(policyTagLists).some((tagList) => hasEnabledTags(tagList.tags));
    if (!hasAnyEnabledTags) {
        return true;
    }
    return hasMatchingTag(policyTagLists, tag);
}

describe('ViolationsUtils tagOutOfPolicy multi-level tag fix check (Issue #105756)', () => {
    const policyTagLists: PolicyTagLists = {
        departments: {
            name: 'Department',
            tags: {
                Engineering: {name: 'Engineering', enabled: true},
                Marketing: {name: 'Marketing', enabled: true},
                Deprecated: {name: 'Deprecated', enabled: false},
            },
        },
        projects: {
            name: 'Project',
            tags: {
                Alpha: {name: 'Alpha', enabled: true},
                Beta: {name: 'Beta', enabled: false},
            },
        },
    };

    it('correctly marks multi-level tag as fixed when tags are enabled', () => {
        // Multi-level tag string formatted with colon
        const multiLevelTag = 'Engineering:Alpha';
        const isFixed = checkIsTagOutOfPolicyFixed(multiLevelTag, policyTagLists);
        expect(isFixed).toBe(true);
    });

    it('marks single level tag as fixed when present and enabled', () => {
        const singleTag = 'Marketing';
        const isFixed = checkIsTagOutOfPolicyFixed(singleTag, policyTagLists);
        expect(isFixed).toBe(true);
    });

    it('returns false when tag is not in policy', () => {
        const invalidTag = 'Finance:Unknown';
        const isFixed = checkIsTagOutOfPolicyFixed(invalidTag, policyTagLists);
        expect(isFixed).toBe(false);
    });

    it('returns false when tag is disabled in policy', () => {
        const disabledTag = 'Deprecated:Beta';
        const isFixed = checkIsTagOutOfPolicyFixed(disabledTag, policyTagLists);
        expect(isFixed).toBe(false);
    });

    it('returns true when tag is empty or undefined', () => {
        expect(checkIsTagOutOfPolicyFixed('', policyTagLists)).toBe(true);
        expect(checkIsTagOutOfPolicyFixed(undefined, policyTagLists)).toBe(true);
    });
});
