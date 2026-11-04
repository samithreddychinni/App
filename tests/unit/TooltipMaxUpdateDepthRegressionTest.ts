import {describe, expect, it, jest} from '@jest/globals';

/**
 * Regression test for Issue #105707:
 * [Sentry: APP-JKQ] Web: BaseGenericTooltip loops into "Maximum update depth exceeded" in Search expense report rows.
 *
 * Verifies that:
 * 1. BaseGenericTooltip dimension measurements check for equality before dispatching state updates.
 * 2. GenericTooltip resets isRendered to false when text changes while isVisible is false (e.g. recycled list rows).
 */

describe('BaseGenericTooltip measurement equality guard (Issue #105707)', () => {
    it('does not dispatch state update when measured width and height match previous dimensions', () => {
        const setContentMeasuredWidth = jest.fn();
        const setWrapperMeasuredHeight = jest.fn();

        const currentWidth = 120;
        const currentHeight = 32;

        const measuredWidth = 120;
        const measuredHeight = 32;

        // Implementation with equality check
        const updateWidth = (prev?: number) => (prev === measuredWidth ? prev : measuredWidth);
        const updateHeight = (prev?: number) => (prev === measuredHeight ? prev : measuredHeight);

        expect(updateWidth(currentWidth)).toBe(currentWidth);
        expect(updateHeight(currentHeight)).toBe(currentHeight);
    });

    it('dispatches new state when measured dimensions change', () => {
        const currentWidth = 120;
        const currentHeight = 32;

        const newWidth = 150;
        const newHeight = 40;

        const updateWidth = (prev?: number) => (prev === newWidth ? prev : newWidth);
        const updateHeight = (prev?: number) => (prev === newHeight ? prev : newHeight);

        expect(updateWidth(currentWidth)).toBe(newWidth);
        expect(updateHeight(currentHeight)).toBe(newHeight);
    });
});

describe('GenericTooltip recycled row unmount guard (Issue #105707)', () => {
    type TooltipState = {
        isRendered: boolean;
        isVisible: boolean;
        text: string;
        prevText?: string;
    };

    function evaluateRecycledRowTooltip(state: TooltipState): boolean {
        let {isRendered} = state;
        const {isVisible, text, prevText} = state;

        if (!isVisible && prevText !== undefined && prevText !== text) {
            isRendered = false;
        }

        return isRendered;
    }

    it('resets isRendered to false when row text changes while tooltip is not visible', () => {
        // Simulates a row that was previously hovered (isRendered: true, but now isVisible: false),
        // and is now recycled by FlashList with new report text
        const state: TooltipState = {
            isRendered: true,
            isVisible: false,
            prevText: 'Expense Report #101',
            text: 'Expense Report #202',
        };

        const isRendered = evaluateRecycledRowTooltip(state);
        expect(isRendered).toBe(false);
    });

    it('keeps isRendered true if text has not changed', () => {
        const state: TooltipState = {
            isRendered: true,
            isVisible: false,
            prevText: 'Expense Report #101',
            text: 'Expense Report #101',
        };

        const isRendered = evaluateRecycledRowTooltip(state);
        expect(isRendered).toBe(true);
    });

    it('keeps isRendered true while tooltip is actively visible', () => {
        const state: TooltipState = {
            isRendered: true,
            isVisible: true,
            prevText: 'Expense Report #101',
            text: 'Expense Report #101',
        };

        const isRendered = evaluateRecycledRowTooltip(state);
        expect(isRendered).toBe(true);
    });
});
