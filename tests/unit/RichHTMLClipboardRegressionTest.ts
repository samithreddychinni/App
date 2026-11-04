/** Distinguishes rendered rich HTML from literal HTML source and the markdown-input round-trip format. */
import {act, renderHook} from '@testing-library/react-native';

import type UseHtmlPaste from '@hooks/useHtmlPaste/types';

import {createRef} from 'react';

const useHtmlPaste = jest.requireActual<{default: UseHtmlPaste}>('../../src/hooks/useHtmlPaste/index.ts').default;

describe('Rich HTML clipboard', () => {
    afterEach(() => document.body.replaceChildren());
    it.each([
        ['<strong>Bold</strong>', 'Bold', '*Bold*'],
        ['', '<strong>Bold</strong>', '<strong>Bold</strong>'],
        ['<p dir="ltr"><strong>Bold</strong></p>', '*Bold*', '*Bold*'],
    ])('pastes HTML %s with plaintext %s as %s', (html, plain, expected) => {
        // Given the clipboard's MIME types distinguish rendered content from copied source code
        const input = Object.assign(document.createElement('textarea'), {isFocused: () => true});
        document.body.appendChild(input);
        const ref = createRef<Parameters<UseHtmlPaste>[0]['current']>();
        ref.current = input;
        renderHook(() => useHtmlPaste(ref, undefined, true));
        const event = new Event('paste', {bubbles: true, cancelable: true});
        Object.defineProperty(event, 'clipboardData', {
            value: {types: html ? ['text/plain', 'text/html'] : ['text/plain'], getData: (type: string) => (type === 'text/html' ? html : plain)},
        });
        // When the production document listener handles the paste
        act(() => document.dispatchEvent(event));
        // Then rendered HTML is converted while source and existing markdown remain intact
        expect(input.value).toBe(expected);
        expect(event.defaultPrevented).toBe(true);
    });
});
