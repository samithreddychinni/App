import {describe, expect, it} from '@jest/globals';

/**
 * Tests for the composer visibility check in ComposerWithSuggestions.
 * Verifies that the RHP's own modal visibility state does not block keypress focus,
 * while overlay modals and non-modal screen overlays continue to be respected.
 */

describe('ComposerWithSuggestions checkComposerVisibility logic', () => {
    function computeIsComposerCoveredUp({
        isFocused,
        isEmojiPickerVisible,
        isMenuVisible,
        willAlertModalBecomeVisible,
        isTopmostRouteModalScreen,
        areAllModalsHidden,
        modalIsVisible,
    }: {
        isFocused: boolean;
        isEmojiPickerVisible: boolean;
        isMenuVisible: boolean;
        willAlertModalBecomeVisible: boolean;
        isTopmostRouteModalScreen: boolean;
        areAllModalsHidden: boolean;
        modalIsVisible: boolean;
    }): boolean {
        const isCoveredByModal = isTopmostRouteModalScreen ? !areAllModalsHidden : modalIsVisible;
        return !isFocused || isEmojiPickerVisible || isMenuVisible || isCoveredByModal || willAlertModalBecomeVisible;
    }

    it('allows focus in RHP when no overlay modal is open', () => {
        // In RHP: modal.isVisible is true (AuthScreens.tsx), but areAllModalsHidden is true (no popups)
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: true,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: false,
            isTopmostRouteModalScreen: true,
            areAllModalsHidden: true,
            modalIsVisible: true,
        });
        expect(isCoveredUp).toBe(false);
    });

    it('blocks focus in RHP when an overlay modal or popover is open', () => {
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: true,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: false,
            isTopmostRouteModalScreen: true,
            areAllModalsHidden: false, // Overlay modal is open
            modalIsVisible: true,
        });
        expect(isCoveredUp).toBe(true);
    });

    it('blocks focus in RHP when alert modal will become visible', () => {
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: true,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: true,
            isTopmostRouteModalScreen: true,
            areAllModalsHidden: true,
            modalIsVisible: true,
        });
        expect(isCoveredUp).toBe(true);
    });

    it('blocks focus when the screen is not focused', () => {
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: false,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: false,
            isTopmostRouteModalScreen: true,
            areAllModalsHidden: true,
            modalIsVisible: true,
        });
        expect(isCoveredUp).toBe(true);
    });

    it('falls back to modal.isVisible when not on a modal screen (central pane)', () => {
        // When RHP is open on top of central pane: modal.isVisible is true, isTopmostRouteModalScreen is false
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: true,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: false,
            isTopmostRouteModalScreen: false,
            areAllModalsHidden: true,
            modalIsVisible: true,
        });
        expect(isCoveredUp).toBe(true);
    });

    it('allows focus in central pane when no modal is open', () => {
        const isCoveredUp = computeIsComposerCoveredUp({
            isFocused: true,
            isEmojiPickerVisible: false,
            isMenuVisible: false,
            willAlertModalBecomeVisible: false,
            isTopmostRouteModalScreen: false,
            areAllModalsHidden: true,
            modalIsVisible: false,
        });
        expect(isCoveredUp).toBe(false);
    });
});
