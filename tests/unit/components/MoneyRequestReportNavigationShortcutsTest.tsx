import {describe, expect, it, jest} from '@jest/globals';

/**
 * Tests for keyboard shortcut registration and active gating in MoneyRequestReportNavigation.
 */

type ShortcutCallback = (event?: {defaultPrevented?: boolean}) => void;
type ShortcutConfig = {captureOnInputs?: boolean; isActive?: boolean};

describe('MoneyRequestReportNavigation keyboard shortcuts logic', () => {
    function setupShortcuts({
        isWeb,
        isFocused,
        isModalOpenOnTop,
        shouldDisplayNavigationArrows,
        hidePrevButton,
        hideNextButton,
        onPrev,
        onNext,
    }: {
        isWeb: boolean;
        isFocused: boolean;
        isModalOpenOnTop: boolean;
        shouldDisplayNavigationArrows: boolean;
        hidePrevButton: boolean;
        hideNextButton: boolean;
        onPrev: () => void;
        onNext: () => void;
    }) {
        const isArrowKeyNavigationActive = isWeb && isFocused && !isModalOpenOnTop && shouldDisplayNavigationArrows;

        const leftShortcut = {
            callback: (event?: {defaultPrevented?: boolean}) => {
                if (event?.defaultPrevented || hidePrevButton) {
                    return;
                }
                onPrev();
            },
            config: {captureOnInputs: false, isActive: isArrowKeyNavigationActive && !hidePrevButton},
        };

        const rightShortcut = {
            callback: (event?: {defaultPrevented?: boolean}) => {
                if (event?.defaultPrevented || hideNextButton) {
                    return;
                }
                onNext();
            },
            config: {captureOnInputs: false, isActive: isArrowKeyNavigationActive && !hideNextButton},
        };

        return {leftShortcut, rightShortcut};
    }

    it('enables both shortcuts when in the middle of search results on web', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const {leftShortcut, rightShortcut} = setupShortcuts({
            isWeb: true,
            isFocused: true,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: false,
            onPrev,
            onNext,
        });

        expect(leftShortcut.config.isActive).toBe(true);
        expect(rightShortcut.config.isActive).toBe(true);
        expect(leftShortcut.config.captureOnInputs).toBe(false);
        expect(rightShortcut.config.captureOnInputs).toBe(false);

        leftShortcut.callback();
        expect(onPrev).toHaveBeenCalledTimes(1);

        rightShortcut.callback();
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables previous shortcut at the first report (hidePrevButton: true)', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const {leftShortcut, rightShortcut} = setupShortcuts({
            isWeb: true,
            isFocused: true,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: true,
            hideNextButton: false,
            onPrev,
            onNext,
        });

        expect(leftShortcut.config.isActive).toBe(false);
        expect(rightShortcut.config.isActive).toBe(true);

        leftShortcut.callback();
        expect(onPrev).not.toHaveBeenCalled();

        rightShortcut.callback();
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables next shortcut at the last report (hideNextButton: true)', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const {leftShortcut, rightShortcut} = setupShortcuts({
            isWeb: true,
            isFocused: true,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: true,
            onPrev,
            onNext,
        });

        expect(leftShortcut.config.isActive).toBe(true);
        expect(rightShortcut.config.isActive).toBe(false);

        rightShortcut.callback();
        expect(onNext).not.toHaveBeenCalled();
    });

    it('disables shortcuts when a modal is open on top', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const {leftShortcut, rightShortcut} = setupShortcuts({
            isWeb: true,
            isFocused: true,
            isModalOpenOnTop: true, // Modal/popover on top
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: false,
            onPrev,
            onNext,
        });

        expect(leftShortcut.config.isActive).toBe(false);
        expect(rightShortcut.config.isActive).toBe(false);
    });

    it('disables shortcuts when screen is not focused or not on web', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const notFocused = setupShortcuts({
            isWeb: true,
            isFocused: false,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: false,
            onPrev,
            onNext,
        });
        expect(notFocused.leftShortcut.config.isActive).toBe(false);

        const notWeb = setupShortcuts({
            isWeb: false,
            isFocused: true,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: false,
            onPrev,
            onNext,
        });
        expect(notWeb.leftShortcut.config.isActive).toBe(false);
    });

    it('ignores defaultPrevented events', () => {
        const onPrev = jest.fn();
        const onNext = jest.fn();

        const {leftShortcut} = setupShortcuts({
            isWeb: true,
            isFocused: true,
            isModalOpenOnTop: false,
            shouldDisplayNavigationArrows: true,
            hidePrevButton: false,
            hideNextButton: false,
            onPrev,
            onNext,
        });

        leftShortcut.callback({defaultPrevented: true});
        expect(onPrev).not.toHaveBeenCalled();
    });
});
