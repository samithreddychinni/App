/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/unbound-method */
import type ClipboardType from '../../src/libs/Clipboard';
import ClipboardNative from '../../src/libs/Clipboard/index.native';

const ClipboardWeb = jest.requireActual<{default: typeof ClipboardType}>('../../src/libs/Clipboard/index.ts').default;

describe('Clipboard', () => {
    describe('Clipboard (Web)', () => {
        const originalClipboard = navigator.clipboard;
        let originalExecCommand: typeof document.execCommand;

        beforeEach(() => {
            jest.clearAllMocks();
            originalExecCommand = document.execCommand;
        });

        afterEach(() => {
            Object.defineProperty(navigator, 'clipboard', {
                value: originalClipboard,
                writable: true,
                configurable: true,
            });
            document.execCommand = originalExecCommand;
        });

        it('resolves to true when navigator.clipboard.writeText succeeds', async () => {
            const writeTextMock = jest.fn(() => Promise.resolve());
            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: writeTextMock},
                writable: true,
                configurable: true,
            });

            const result = await ClipboardWeb.setString('test string');

            expect(result).toBe(true);
            expect(writeTextMock).toHaveBeenCalledWith('test string');
        });

        it('catches NotAllowedError and falls back to execCommand copy', async () => {
            const writeTextMock = jest.fn(() => Promise.reject(new DOMException("Failed to execute 'writeText' on 'Clipboard': Document is not focused.", 'NotAllowedError')));
            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: writeTextMock},
                writable: true,
                configurable: true,
            });

            const execCommandMock = jest.fn(() => true);
            document.execCommand = execCommandMock;

            const result = await ClipboardWeb.setString('recovery-codes-1234');

            expect(writeTextMock).toHaveBeenCalledWith('recovery-codes-1234');
            expect(execCommandMock).toHaveBeenCalledWith('copy');
            expect(result).toBe(true);
        });

        it('returns false without unhandled rejection when both writeText and execCommand fail', async () => {
            const writeTextMock = jest.fn(() => Promise.reject(new DOMException("Failed to execute 'writeText' on 'Clipboard': Document is not focused.", 'NotAllowedError')));
            Object.defineProperty(navigator, 'clipboard', {
                value: {writeText: writeTextMock},
                writable: true,
                configurable: true,
            });

            const execCommandMock = jest.fn(() => false);
            document.execCommand = execCommandMock;

            const result = await ClipboardWeb.setString('test');

            expect(result).toBe(false);
        });

        it('falls back to execCommand when navigator.clipboard is undefined', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                writable: true,
                configurable: true,
            });

            const execCommandMock = jest.fn(() => true);
            document.execCommand = execCommandMock;

            const result = await ClipboardWeb.setString('fallback string');

            expect(execCommandMock).toHaveBeenCalledWith('copy');
            expect(result).toBe(true);
        });
    });

    describe('Clipboard (Native)', () => {
        it('resolves to true after setting string', async () => {
            const result = await ClipboardNative.setString('native string');
            expect(result).toBe(true);
        });
    });
});
