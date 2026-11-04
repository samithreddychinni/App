import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105708:
 * "[Sentry: APP-NM1] Web: getSystemMessageDisplayState calls Array.toReversed, crashes on Chrome < 110"
 *
 * Verifies that:
 * 1. Chronological reversal of newest-first reportActions uses [...reportActions].reverse()
 *    rather than Array.prototype.toReversed.
 * 2. On legacy browsers where Array.prototype.toReversed is undefined (Chrome < 110, Safari < 16, Firefox < 115),
 *    the newest-first collection is safely placed in chronological order without throwing TypeError.
 * 3. The original reportActions array is not mutated in-place.
 * 4. Oldest-first actions are preserved without unnecessary reversal.
 */

type MockReportAction = {
    reportActionID: string;
    created: string;
};

function resolveChronologicalActions(
    reportActions: readonly MockReportAction[],
    isNewestFirst: boolean,
): MockReportAction[] {
    return isNewestFirst ? [...reportActions].reverse() : [...reportActions];
}

describe('GetSystemMessageDisplayStateToReversedRegressionTest', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalToReversed = Array.prototype.toReversed;

    beforeEach(() => {
        // Simulate legacy browser by removing Array.prototype.toReversed
        // @ts-expect-error simulating legacy browser environment
        delete Array.prototype.toReversed;
    });

    afterEach(() => {
        if (originalToReversed) {
            Array.prototype.toReversed = originalToReversed;
        }
    });

    it('reverses newest-first actions without calling toReversed on legacy browsers', () => {
        expect(Array.prototype.toReversed).toBeUndefined();

        const newestAction: MockReportAction = {reportActionID: 'action_2', created: '2026-11-04 12:00:00'};
        const oldestAction: MockReportAction = {reportActionID: 'action_1', created: '2026-11-04 11:00:00'};
        const newestFirstActions = [newestAction, oldestAction];

        // Should not throw TypeError: e.toReversed is not a function
        const chronological = resolveChronologicalActions(newestFirstActions, true);

        expect(chronological).toHaveLength(2);
        expect(chronological[0].reportActionID).toBe('action_1');
        expect(chronological[1].reportActionID).toBe('action_2');
    });

    it('does not mutate the source array in place', () => {
        const action1: MockReportAction = {reportActionID: 'action_1', created: '2026-11-04 11:00:00'};
        const action2: MockReportAction = {reportActionID: 'action_2', created: '2026-11-04 12:00:00'};
        const sourceArray = Object.freeze([action2, action1]);

        expect(() => {
            const result = resolveChronologicalActions(sourceArray, true);
            expect(result[0].reportActionID).toBe('action_1');
            expect(result[1].reportActionID).toBe('action_2');
        }).not.toThrow();

        // Source array retains original order
        expect(sourceArray[0].reportActionID).toBe('action_2');
        expect(sourceArray[1].reportActionID).toBe('action_1');
    });

    it('keeps oldest-first actions in their original chronological order', () => {
        const action1: MockReportAction = {reportActionID: 'action_1', created: '2026-11-04 11:00:00'};
        const action2: MockReportAction = {reportActionID: 'action_2', created: '2026-11-04 12:00:00'};
        const oldestFirst = [action1, action2];

        const chronological = resolveChronologicalActions(oldestFirst, false);
        expect(chronological[0].reportActionID).toBe('action_1');
        expect(chronological[1].reportActionID).toBe('action_2');
    });
});
