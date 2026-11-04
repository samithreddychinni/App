/** A modal removed while visible must not leave later composer focus waiting forever. */
import {act, render} from '@testing-library/react-native';

import BaseModal from '@components/Modal/BaseModal';
import type ReanimatedModalProps from '@components/Modal/ReanimatedModal/types';

import ComposerFocusManager from '@libs/ComposerFocusManager';

import CONST from '@src/CONST';

import React from 'react';

let mockModalProps: ReanimatedModalProps;
jest.mock('@components/Modal/ReanimatedModal', () => ({
    __esModule: true,
    default: (props: ReanimatedModalProps) => {
        mockModalProps = props;
        return null;
    },
}));

describe('Visible modal unmount', () => {
    it('resolves only its own focus wait when destroyed without dismissal', async () => {
        // Given two modals own separate unresolved focus waits
        const modalID = ComposerFocusManager.getId();
        const otherID = ComposerFocusManager.getId();
        const onModalHide = jest.fn();
        const {unmount, rerender} = render(
            <BaseModal
                isVisible
                modalId={modalID}
                type={CONST.MODAL.MODAL_TYPE.CENTERED}
                onModalHide={onModalHide}
            >
                {null}
            </BaseModal>,
        );
        act(() => mockModalProps.onModalWillShow?.());
        ComposerFocusManager.resetReadyToFocus(otherID);
        let resolved = false;
        let otherResolved = false;
        ComposerFocusManager.isReadyToFocus(modalID).then(() => {
            resolved = true;
        });
        ComposerFocusManager.isReadyToFocus(otherID).then(() => {
            otherResolved = true;
        });
        // When an ordinary render is followed by the direct unmount used by workspace deletion
        rerender(
            <BaseModal
                isVisible
                modalId={modalID}
                type={CONST.MODAL.MODAL_TYPE.CENTERED}
                onModalHide={onModalHide}
            >
                {null}
            </BaseModal>,
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(resolved).toBe(false);
        unmount();
        await act(async () => {
            await Promise.resolve();
        });
        // Then this modal releases focus exactly once without dismissing another modal
        expect(resolved).toBe(true);
        expect(otherResolved).toBe(false);
        expect(onModalHide).toHaveBeenCalledTimes(1);
        ComposerFocusManager.setReadyToFocus(otherID);
    });
});
