import {act, render, screen} from '@testing-library/react-native';

import Tooltip from '@components/Tooltip';

import React, {useEffect} from 'react';
import {View} from 'react-native';

jest.mock('@components/Tooltip/BaseTooltip', () => {
    const mockReact = jest.requireActual<typeof React>('react');
    const {View: MockView} = jest.requireActual<{View: typeof View}>('react-native');

    return {
        __esModule: true,
        default: ({children, shouldRender}: {children: React.ReactNode; shouldRender?: boolean}) => (
            <MockView
                testID="tooltip-wrapper"
                accessibilityState={{busy: shouldRender}}
            >
                {children}
            </MockView>
        ),
    };
});

function MountCounter({onMount}: {onMount: () => void}) {
    useEffect(() => {
        onMount();
    }, [onMount]);

    return <View testID="tooltip-target" />;
}

describe('Tooltip', () => {
    it('keeps the target wrapper mounted while tooltip rendering changes', () => {
        // Given a target whose truncation state controls tooltip rendering.
        const onMount = jest.fn();
        const {rerender} = render(
            <Tooltip shouldRender={false}>
                <MountCounter onMount={onMount} />
            </Tooltip>,
        );

        // When truncation enables and then disables the tooltip content.
        act(() => {
            rerender(
                <Tooltip shouldRender>
                    <MountCounter onMount={onMount} />
                </Tooltip>,
            );
            rerender(
                <Tooltip shouldRender={false}>
                    <MountCounter onMount={onMount} />
                </Tooltip>,
            );
        });

        // Then the wrapper and target stay mounted instead of switching between two DOM hierarchies.
        expect(screen.getByTestId('tooltip-wrapper')).toBeOnTheScreen();
        expect(screen.getByTestId('tooltip-target')).toBeOnTheScreen();
        expect(onMount).toHaveBeenCalledTimes(1);
    });
});
