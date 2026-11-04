/** Runs validation-code paste, navigation and native digit-pad events through the production handlers. */
import {act, cleanup, render} from '@testing-library/react-native';

import type {BaseTextInputProps, BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';
import ValidateCodeInput from '@components/ValidateCodeInput';
import type {ValidateCodeInputHandle, ValidateCodeInputProps} from '@components/ValidateCodeInput';

import type useAccessibilityAnnouncement from '@hooks/useAccessibilityAnnouncement';
import type useNetwork from '@hooks/useNetwork';

import type {TextInputKeyPressEvent} from 'react-native';

import React, {createRef} from 'react';

import createMock from '../utils/createMock';

const mockCaptureCodeInputProps = jest.fn<void, [BaseTextInputProps]>();
let mockInput: BaseTextInputRef | null;
let mockFocused = true;
let mockOffline = false;

jest.mock('@hooks/useNetwork', () => () => ({isOffline: mockOffline}) satisfies Pick<ReturnType<typeof useNetwork>, 'isOffline'>);
jest.mock('@hooks/useAccessibilityAnnouncement', () => jest.fn<ReturnType<typeof useAccessibilityAnnouncement>, Parameters<typeof useAccessibilityAnnouncement>>());
jest.mock('@hooks/useLocalize', () => () => ({translate: (key: string) => key}));
jest.mock('@components/TextInput', () => {
    const ReactMock = jest.requireActual<typeof React>('react');
    function MockCodeInput(props: BaseTextInputProps) {
        const {ref: inputRef} = props;
        ReactMock.useLayoutEffect(() => {
            mockCaptureCodeInputProps(props);
        });
        ReactMock.useLayoutEffect(() => {
            if (typeof inputRef === 'function') {
                inputRef(mockInput);
                return () => inputRef(null);
            }
            return undefined;
        }, [inputRef]);
        return null;
    }
    return {__esModule: true, default: MockCodeInput};
});

function getCodeInputProps() {
    const props = mockCaptureCodeInputProps.mock.calls.at(-1)?.[0];
    expect(props).toBeDefined();
    if (!props) {
        throw new Error('ValidateCodeInput did not render its backing input');
    }
    return props;
}

function pasteCode(text: string) {
    const event = new Event('paste', {bubbles: true, cancelable: true});
    // jsdom does not supply ClipboardEvent/DataTransfer. Only this clipboard contribution is substituted.
    Object.defineProperty(event, 'clipboardData', {value: {getData: (format: string) => (format === 'text/plain' ? text : '')}});
    act(() => document.dispatchEvent(event));
    return event;
}

function pressCodeKey(key: string, shiftKey?: boolean, nativeShiftKey?: boolean) {
    const props = getCodeInputProps();
    expect(props.onKeyPress).toBeDefined();
    const preventDefault = jest.fn<ReturnType<TextInputKeyPressEvent['preventDefault']>, Parameters<TextInputKeyPressEvent['preventDefault']>>();
    const nativeEvent = Object.assign(createMock<TextInputKeyPressEvent['nativeEvent']>({key}), nativeShiftKey === undefined ? {} : {shiftKey: nativeShiftKey});
    const event = Object.assign(createMock<TextInputKeyPressEvent>({nativeEvent, preventDefault}), shiftKey === undefined ? {} : {shiftKey});
    act(() => props.onKeyPress?.(event));
    return preventDefault;
}

describe('ValidateCodeInput production events', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFocused = true;
        mockOffline = false;
        // The native fixture helper retains the DOM methods and focused-state contribution used by the real handlers.
        const inputMethods: Pick<BaseTextInputRef, 'focus' | 'blur'> = Object.assign(document.createElement('input'), {isFocused: () => mockFocused});
        mockInput = createMock<BaseTextInputRef>(inputMethods);
    });
    afterEach(() => cleanup());

    it('trims focused numeric paste and removes the listener when unmounted', () => {
        // Given a focused code field and whitespace from a copied email
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        const {unmount} = render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                onChangeText={onChangeText}
            />,
        );
        // When the real document paste handler receives a code
        const event = pasteCode(' 123456\n');
        // Then the input consumes it as digits, and a detached field no longer consumes paste
        expect(event.defaultPrevented).toBe(true);
        expect(onChangeText).toHaveBeenLastCalledWith('123456');
        unmount();
        onChangeText.mockClear();
        expect(pasteCode('654321').defaultPrevented).toBe(false);
        expect(onChangeText).not.toHaveBeenCalled();
    });

    it.each(['unfocused', 'absent', 'no-focus-method'])('ignores paste for an %s ref', (condition) => {
        // Given no evidence that the backing input currently owns focus
        mockFocused = false;
        if (condition === 'absent') {
            mockInput = null;
        } else if (condition === 'no-focus-method') {
            const inputMethods: Pick<BaseTextInputRef, 'focus' | 'blur'> = document.createElement('input');
            mockInput = createMock<BaseTextInputRef>(inputMethods);
        }
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                onChangeText={onChangeText}
            />,
        );
        // When a numeric document paste occurs
        const event = pasteCode('123456');
        // Then the production focus helper prevents the field from consuming another field's paste
        expect(event.defaultPrevented).toBe(false);
        expect(onChangeText).not.toHaveBeenCalled();
    });

    it.each(['abc', '  ', '12x34'])('rejects focused invalid paste %s', (text) => {
        // Given a focused code input
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                onChangeText={onChangeText}
            />,
        );
        // When clipboard content is not a numeric code
        const event = pasteCode(text);
        // Then default paste is consumed without introducing invalid digits
        expect(event.defaultPrevented).toBe(true);
        expect(onChangeText).not.toHaveBeenCalled();
    });

    it('uses only outer Shift+Tab and leaves boundary Tab navigation to the browser', () => {
        // Given the first of three code slots
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                maxLength={3}
                onChangeText={onChangeText}
            />,
        );
        // When Shift+Tab would leave the input, and a native-only shift flag accompanies forward Tab
        expect(pressCodeKey('Tab', true)).not.toHaveBeenCalled();
        expect(pressCodeKey('Tab', undefined, true)).toHaveBeenCalledTimes(1);
        // Then typing goes into slot two because native shiftKey is not an outer browser modifier
        act(() => getCodeInputProps().onChangeText?.('7'));
        expect(onChangeText).toHaveBeenLastCalledWith(' 7 ');
        expect(pressCodeKey('Tab')).not.toHaveBeenCalled();
        expect(pressCodeKey('Tab', true)).toHaveBeenCalledTimes(1);
        act(() => getCodeInputProps().onChangeText?.('8'));
        expect(onChangeText).toHaveBeenLastCalledWith(' 8 ');
    });

    it('retains arrow movement and backspace replacement at the focused slot', () => {
        // Given an existing three-digit code that should remain editable
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                value="123"
                maxLength={3}
                shouldSubmitOnComplete={false}
                onChangeText={onChangeText}
            />,
        );
        // When arrows reach the middle slot and backspace deletes that digit
        pressCodeKey('ArrowRight');
        pressCodeKey('ArrowRight');
        pressCodeKey('ArrowLeft');
        pressCodeKey('Backspace');
        // Then surrounding digits remain in their original slots
        expect(onChangeText).toHaveBeenLastCalledWith('1 3');
    });

    it('accepts the native digit-pad producer and retains imperative editing handles', () => {
        // Given a disabled keyboard driven by lastPressedDigit
        const onChangeText = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onChangeText']>>, Parameters<NonNullable<ValidateCodeInputProps['onChangeText']>>>();
        const ref = createRef<ValidateCodeInputHandle>();
        const {rerender} = render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                ref={ref}
                isDisableKeyboard
                autoFocus={false}
                value="12"
                onChangeText={onChangeText}
            />,
        );
        // When the native pad sends its backspace key and the caller resets the input
        rerender(
            <ValidateCodeInput
                autoComplete="one-time-code"
                ref={ref}
                isDisableKeyboard
                autoFocus={false}
                value="12"
                lastPressedDigit="<1"
                onChangeText={onChangeText}
            />,
        );
        expect(onChangeText).toHaveBeenCalledWith('');
        expect(ref.current).not.toBeNull();
        act(() => ref.current?.focus());
        act(() => ref.current?.focusLastSelected());
        act(() => ref.current?.resetFocus());
        act(() => ref.current?.blur());
        onChangeText.mockClear();
        act(() => ref.current?.clear());
        // Then the public handle still clears through the real callback
        expect(onChangeText).toHaveBeenLastCalledWith('');
        expect(onChangeText).toHaveBeenCalledTimes(1);
    });

    it('blocks offline Enter and submits the current value after reconnect', () => {
        // Given an offline field whose code is not submitted automatically
        mockOffline = true;
        const onFulfill = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onFulfill']>>, Parameters<NonNullable<ValidateCodeInputProps['onFulfill']>>>();
        const {rerender} = render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                value="123"
                shouldSubmitOnComplete={false}
                onFulfill={onFulfill}
            />,
        );
        // When Enter is pressed offline and again after reconnect
        pressCodeKey('Enter');
        expect(onFulfill).not.toHaveBeenCalled();
        mockOffline = false;
        rerender(
            <ValidateCodeInput
                autoComplete="one-time-code"
                value="123"
                shouldSubmitOnComplete={false}
                onFulfill={onFulfill}
            />,
        );
        pressCodeKey('Enter');
        // Then only the online attempt reaches the submission callback
        expect(onFulfill).toHaveBeenCalledTimes(1);
        expect(onFulfill).toHaveBeenCalledWith('123');
    });

    it('submits a completed code once and blurs the backing input', () => {
        // Given an incomplete code and a real backing focus handle
        const onFulfill = jest.fn<ReturnType<NonNullable<ValidateCodeInputProps['onFulfill']>>, Parameters<NonNullable<ValidateCodeInputProps['onFulfill']>>>();
        const blur = mockInput ? jest.spyOn(mockInput, 'blur') : undefined;
        const {rerender} = render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                value="12"
                maxLength={3}
                onFulfill={onFulfill}
            />,
        );
        // When the final digit arrives
        rerender(
            <ValidateCodeInput
                autoComplete="one-time-code"
                value="123"
                maxLength={3}
                onFulfill={onFulfill}
            />,
        );
        // Then completion submits exactly once and releases focus
        expect(onFulfill).toHaveBeenCalledTimes(1);
        expect(onFulfill).toHaveBeenCalledWith('123');
        expect(blur).toHaveBeenCalled();
    });
});

describe('Web magic-code capture navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFocused = true;
        mockOffline = false;
        const input = Object.assign(document.createElement('input'), {isFocused: () => mockFocused});
        document.body.appendChild(input);
        input.focus();
        const inputMethods: Pick<BaseTextInputRef, 'focus' | 'blur'> = input;
        mockInput = createMock<BaseTextInputRef>(inputMethods);
    });
    afterEach(() => {
        cleanup();
        document.body.replaceChildren();
    });

    it('consumes in-range Tab before the document focus trap, including key repeat', () => {
        // Given one focused DOM input represents all six slots
        const onChangeText = jest.fn();
        render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                autoFocus
                onChangeText={onChangeText}
            />,
        );
        const trap = jest.fn();
        document.addEventListener('keydown', trap, true);
        const forward = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
        const backward = new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true});
        // When two keys arrive before React can render, followed by one backward key
        act(() => {
            document.activeElement?.dispatchEvent(forward);
            document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
            document.activeElement?.dispatchEvent(backward);
        });
        act(() => getCodeInputProps().onChangeText?.('7'));
        // Then the resulting digit belongs to slot two and neither Tab reaches the trap
        expect(forward.defaultPrevented).toBe(true);
        expect(backward.defaultPrevented).toBe(true);
        expect(trap).not.toHaveBeenCalled();
        expect(onChangeText).toHaveBeenLastCalledWith(' 7    ');
        document.removeEventListener('keydown', trap, true);
    });

    it('leaves boundary and modified Tabs to the browser and removes its listener', () => {
        // Given the first slot is selected
        const {unmount} = render(
            <ValidateCodeInput
                autoComplete="one-time-code"
                autoFocus
                maxLength={2}
            />,
        );
        const dispatch = (shiftKey = false, ctrlKey = false) => {
            const event = new KeyboardEvent('keydown', {key: 'Tab', shiftKey, ctrlKey, bubbles: true, cancelable: true});
            act(() => document.activeElement?.dispatchEvent(event));
            return event.defaultPrevented;
        };
        // When leaving either boundary, using a browser shortcut, or typing after unmount
        expect(dispatch(true)).toBe(false);
        expect(dispatch(false, true)).toBe(false);
        expect(dispatch()).toBe(true);
        expect(dispatch()).toBe(false);
        unmount();
        // Then detached inputs have no active navigation listener
        expect(dispatch(true)).toBe(false);
    });
});
