/** Ensures a long feed label can shrink without removing the selector's controls. */
import {fireEvent, render, screen} from '@testing-library/react-native';

import CaretWrapper from '@components/CaretWrapper';
import FeedSelector from '@components/FeedSelector';

import React from 'react';
import {StyleSheet} from 'react-native';

describe('Company card feed selector', () => {
    it('constrains the name row and keeps the full name accessible and selectable', () => {
        // Given a commercial feed name wider than the available phone row
        const name = 'The big black fox jumps over the lazy dog '.repeat(3);
        const select = jest.fn();
        const view = render(
            <FeedSelector
                onFeedSelect={select}
                CardFeedIcon={null}
                feedName={name}
                shouldShowRBR
            />,
        );
        // When the selector is laid out and activated
        const caret = view.UNSAFE_getByType(CaretWrapper);
        fireEvent.press(screen.getByRole('button', {name}));
        // Then the wrapper permits truncation and the complete name remains available to assistive technology
        expect(StyleSheet.flatten(caret.props.style)).toEqual(expect.objectContaining({flexShrink: 1}));
        expect(screen.getByText(name).props.numberOfLines).toBe(1);
        expect(select).toHaveBeenCalledTimes(1);
    });
});
