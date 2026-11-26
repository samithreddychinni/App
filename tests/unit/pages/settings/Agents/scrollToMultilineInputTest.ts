import type {ScrollWithKeyboard} from '@hooks/useKeyboardDrivenScroll/types';
import scrollToMultilineInputNative from '@pages/settings/Agents/scrollToMultilineInput/index.native';

// Import the web implementation explicitly: Jest resolves the platform-split module to index.native.ts.
const scrollToMultilineInputWeb = jest.requireActual<{default: typeof scrollToMultilineInputNative}>('@pages/settings/Agents/scrollToMultilineInput/index.ts').default;

describe('scrollToMultilineInput', () => {
    const mockScrollWithKeyboard: ScrollWithKeyboard = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('native implementation', () => {
        it('calls scrollWithKeyboard with inputTopOffset when shouldScrollToMultilineInput is true', () => {
            scrollToMultilineInputNative(mockScrollWithKeyboard, true, 150);

            expect(mockScrollWithKeyboard).toHaveBeenCalledTimes(1);
            expect(mockScrollWithKeyboard).toHaveBeenCalledWith(150);
        });

        it('does not call scrollWithKeyboard when shouldScrollToMultilineInput is false', () => {
            scrollToMultilineInputNative(mockScrollWithKeyboard, false, 150);

            expect(mockScrollWithKeyboard).not.toHaveBeenCalled();
        });
    });

    describe('web implementation', () => {
        it('does not call scrollWithKeyboard even when shouldScrollToMultilineInput is true', () => {
            scrollToMultilineInputWeb(mockScrollWithKeyboard, true, 150);

            expect(mockScrollWithKeyboard).not.toHaveBeenCalled();
        });
    });
});
