import {act, fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import MerchantOrDescriptionCell from '@components/TransactionItemRow/DataCells/MerchantCell';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';

jest.mock('@expensify/react-native-hybrid-app', () => ({isHybridApp: () => false}));
jest.mock('@libs/Navigation/Navigation');
jest.mock('@hooks/useResponsiveLayout', () => () => ({
    isLargeScreenWidth: true,
    shouldUseNarrowLayout: false,
    isSmallScreenWidth: false,
    isMediumScreenWidth: false,
    isExtraSmallScreenWidth: false,
    isExtraSmallScreenHeight: false,
    isExtraLargeScreenWidth: true,
    isSmallScreen: false,
    isInNarrowPaneModal: false,
    onboardingIsMediumOrLargerScreenWidth: true,
    isInLandscapeMode: false,
}));

// EditableCell only renders the edit button while hovered, which jsdom can't simulate reliably.
jest.mock('@components/Hoverable', () => ({
    __esModule: true,
    default: ({children}: {children: ((isHovered: boolean) => React.ReactNode) | React.ReactNode}) => (typeof children === 'function' ? children(true) : children),
}));

function renderCell(props: React.ComponentProps<typeof MerchantOrDescriptionCell>) {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <MerchantOrDescriptionCell {...props} />
        </ComposeProviders>,
    );
}

describe('MerchantOrDescriptionCell', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        jest.clearAllMocks();
    });

    describe('Description editing (multiline and Markdown)', () => {
        const storedHtml = '<p>Line 1</p><p>Line 2 with <strong>bold</strong></p>';

        it('displays single-line plain text in display mode', () => {
            renderCell({
                merchantOrDescription: storedHtml,
                shouldShowTooltip: false,
                isDescription: true,
                canEdit: true,
            });

            // The collapsed table view flattens line breaks and strips markdown
            expect(screen.getByText('Line 1 Line 2 with bold')).toBeOnTheScreen();
        });

        it('initializes input with Markdown and multiline props when entering edit mode', () => {
            renderCell({
                merchantOrDescription: storedHtml,
                shouldShowTooltip: false,
                isDescription: true,
                canEdit: true,
            });

            // Click the edit button
            const editButton = screen.getByLabelText('Edit');
            fireEvent.press(editButton);

            const input = screen.getByLabelText('Description');
            expect(input).toBeOnTheScreen();
            expect(input.props.value).toBe('Line 1\nLine 2 with *bold*');
            expect(input.props.multiline).toBe(true);
        });

        it('preserves line breaks during typing and commits markdown on Enter', () => {
            const onSave = jest.fn();
            renderCell({
                merchantOrDescription: storedHtml,
                shouldShowTooltip: false,
                isDescription: true,
                canEdit: true,
                onSave,
            });

            fireEvent.press(screen.getByLabelText('Edit'));

            const input = screen.getByLabelText('Description');
            const newMarkdown = '# Header\n- Item 1\n- Item 2';
            fireEvent.changeText(input, newMarkdown);

            // Press Enter without shift to save
            fireEvent(input, 'keyPress', {
                nativeEvent: {key: 'Enter', shiftKey: false},
                preventDefault: jest.fn(),
            });

            expect(onSave).toHaveBeenCalledWith(newMarkdown);
        });

        it('does not save on Shift+Enter so newlines can be inserted', () => {
            const onSave = jest.fn();
            renderCell({
                merchantOrDescription: storedHtml,
                shouldShowTooltip: false,
                isDescription: true,
                canEdit: true,
                onSave,
            });

            fireEvent.press(screen.getByLabelText('Edit'));

            const input = screen.getByLabelText('Description');
            fireEvent(input, 'keyPress', {
                nativeEvent: {key: 'Enter', shiftKey: true},
                preventDefault: jest.fn(),
            });

            expect(onSave).not.toHaveBeenCalled();
        });
    });

    describe('Merchant editing (single-line)', () => {
        it('uses single-line input without multiline for merchant', () => {
            renderCell({
                merchantOrDescription: '  Coffee Shop  ',
                shouldShowTooltip: false,
                isDescription: false,
                canEdit: true,
            });

            fireEvent.press(screen.getByLabelText('Edit'));

            const input = screen.getByLabelText('Merchant');
            expect(input).toBeOnTheScreen();
            expect(input.props.multiline).toBeFalsy();
            expect(input.props.autoGrowHeight).toBeFalsy();
        });

        it('trims whitespace and strips newlines when saving merchant', () => {
            const onSave = jest.fn();
            renderCell({
                merchantOrDescription: 'Original Merchant',
                shouldShowTooltip: false,
                isDescription: false,
                canEdit: true,
                onSave,
            });

            fireEvent.press(screen.getByLabelText('Edit'));

            const input = screen.getByLabelText('Merchant');
            fireEvent.changeText(input, 'New\nMerchant  ');
            fireEvent(input, 'blur');

            expect(onSave).toHaveBeenCalledWith('New Merchant');
        });
    });
});
