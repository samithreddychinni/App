import {act, fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import Composer from '@components/Composer';
import type {ComposerRef, ComposerProps} from '@components/Composer/types';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {KeyboardStateProvider} from '@components/withKeyboardState';

import * as InputFocus from '@libs/actions/InputFocus';
import {editReportComment} from '@libs/actions/Report';
import ReportActionComposeFocusManager from '@libs/ReportActionComposeFocusManager';

import * as ReportActionContextMenu from '@pages/inbox/report/ContextMenu/ReportActionContextMenu';
import {ReportActionEditMessageContextProvider} from '@pages/inbox/report/ReportActionEditMessageContext';
import {ReportActionPositionContextProvider, ReportActionScrollToNewestContext} from '@pages/inbox/report/ReportActionIndexContext';
import type {ReportActionItemMessageEditProps} from '@pages/inbox/report/ReportActionItemMessageEdit';
import ReportActionItemMessageEdit from '@pages/inbox/report/ReportActionItemMessageEdit';
import {draftMessageVideoAttributeCache} from '@pages/inbox/report/useDraftMessageVideoAttributeCache';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type {PropsWithChildren} from 'react';

import Onyx from 'react-native-onyx';

import createMock from '../utils/createMock';
import * as LHNTestUtils from '../utils/LHNTestUtils';
import * as TestHelper from '../utils/TestHelper';

const mockEditReportComment = jest.mocked(editReportComment);
const mockShowDeleteModal = jest.mocked(ReportActionContextMenu.showDeleteModal);

jest.mock('@libs/actions/Report', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actual = jest.requireActual('@libs/actions/Report');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...actual,
        editReportComment: jest.fn(),
    };
});

jest.mock('@pages/inbox/report/ContextMenu/ReportActionContextMenu', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actual = jest.requireActual('@pages/inbox/report/ContextMenu/ReportActionContextMenu');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...actual,
        showDeleteModal: jest.fn(),
    };
});

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: jest.fn((key: string) => key),
        numberFormat: jest.fn((num: number) => num.toString()),
    })),
);

jest.mock('@hooks/useCardFeedsForDisplay', () => jest.fn(() => ({defaultCardFeed: null, cardFeedsByPolicy: {}})));

jest.mock('@react-navigation/native', () => ({
    ...((): typeof NativeNavigation => {
        return jest.requireActual('@react-navigation/native');
    })(),
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    })),
    useIsFocused: jest.fn(() => true),
    useRoute: jest.fn(() => ({key: '', name: '', params: {reportID: '1'}})),
}));

TestHelper.setupGlobalFetchMock();

const defaultReport = LHNTestUtils.getFakeReport();
const defaultReportAction = LHNTestUtils.getFakeReportAction();
const defaultProps: ReportActionItemMessageEditProps = {
    action: defaultReportAction,
    reportID: defaultReport.reportID,
    originalReportID: defaultReport.reportID,
};

function ReportActionEditMessageContextProviderForReport({children}: PropsWithChildren) {
    return <ReportActionEditMessageContextProvider reportID={defaultReport.reportID}>{children}</ReportActionEditMessageContextProvider>;
}

function ReportScreenProviders({children}: PropsWithChildren) {
    return <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, KeyboardStateProvider, ReportActionEditMessageContextProviderForReport]}>{children}</ComposeProviders>;
}

const renderReportActionItemMessageEdit = (props?: Partial<ReportActionItemMessageEditProps>, listContext?: {index: number; isNewest: boolean; scrollToNewestAction?: () => void}) => {
    return render(
        <ReportScreenProviders>
            <ReportActionScrollToNewestContext.Provider value={listContext?.scrollToNewestAction}>
                <ReportActionPositionContextProvider
                    index={listContext?.index ?? 0}
                    isNewest={listContext?.isNewest ?? true}
                >
                    <ReportActionItemMessageEdit
                        {...defaultProps}
                        {...props}
                    />
                </ReportActionPositionContextProvider>
            </ReportActionScrollToNewestContext.Provider>
        </ReportScreenProviders>,
    );
};

describe('ReportActionCompose Integration Tests', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
            evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS],
        });
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        draftMessageVideoAttributeCache.clear();
        jest.clearAllMocks();
    });

    describe('Message validation', () => {
        it('releases edit focus after its ref is detached on unmount', () => {
            // Given this mounted editor owns the focus manager
            const changeFocus = jest.spyOn(InputFocus, 'inputFocusChange');
            const {unmount} = renderReportActionItemMessageEdit();
            expect(ReportActionComposeFocusManager.editComposerRef.current).not.toBeNull();
            // When Save or Cancel removes the editor and React detaches its ref first
            unmount();
            // Then a later modal close is not blocked by a dead editor
            expect(changeFocus).toHaveBeenCalledWith(false);
            expect(ReportActionComposeFocusManager.editComposerRef.current).toBeNull();
            changeFocus.mockRestore();
        });

        it.each([false, true])('releases a refreshed handle when another focus event occurs: %s', (shouldRefocus) => {
            // Given the web composer can replace its imperative handle after text changes
            const changeFocus = jest.spyOn(InputFocus, 'inputFocusChange');
            const view = renderReportActionItemMessageEdit();
            const props: ComposerProps = view.UNSAFE_getByType(Composer).props;
            const updatedComposer = createMock<ComposerRef>({});
            expect(typeof props.ref).toBe('function');
            if (typeof props.ref !== 'function') {
                throw new Error('The editor must expose its composer ref callback');
            }
            // When the same editor receives and focuses the new handle before unmounting
            props.ref(updatedComposer);
            if (shouldRefocus) {
                ReportActionComposeFocusManager.editComposerRef.current = updatedComposer;
            }
            expect(ReportActionComposeFocusManager.editComposerRef.current).toBe(updatedComposer);
            view.unmount();
            // Then cleanup compares the last handle from this editor, not its obsolete mount-time handle
            expect(changeFocus).toHaveBeenCalledWith(false);
            expect(ReportActionComposeFocusManager.editComposerRef.current).toBeNull();
            changeFocus.mockRestore();
        });

        it('does not release focus owned by a newer editor', () => {
            // Given another editor took focus before the old one finishes unmounting
            const changeFocus = jest.spyOn(InputFocus, 'inputFocusChange');
            const {unmount} = renderReportActionItemMessageEdit();
            const newerComposer = createMock<ComposerRef>({});
            ReportActionComposeFocusManager.editComposerRef.current = newerComposer;
            changeFocus.mockClear();
            // When the older editor unmounts
            unmount();
            // Then it does not clear the newer editor's ownership or web focus flag
            expect(changeFocus).not.toHaveBeenCalled();
            expect(ReportActionComposeFocusManager.editComposerRef.current).toBe(newerComposer);
            ReportActionComposeFocusManager.clear(true);
            changeFocus.mockRestore();
        });
        it('should edit when length is within the limit', async () => {
            renderReportActionItemMessageEdit();
            const composer = screen.getByTestId('composer');
            const saveChangesButton = screen.getByLabelText('common.saveChanges');

            // Given a message that is within the length limit
            const validMessage = 'x'.repeat(CONST.MAX_COMMENT_LENGTH);
            fireEvent.changeText(composer, validMessage);

            // When the message is saved
            fireEvent.press(saveChangesButton);

            // Then the message should be edited
            expect(mockEditReportComment).toHaveBeenCalledTimes(1);
        });

        it('should not edit when length exceeds the limit', async () => {
            renderReportActionItemMessageEdit();
            const composer = screen.getByTestId('composer');
            const saveChangesButton = screen.getByLabelText('common.saveChanges');

            // Given a message that is over the length limit
            const invalidMessage = 'x'.repeat(CONST.MAX_COMMENT_LENGTH + 1);
            fireEvent.changeText(composer, invalidMessage);

            // When the message is saved
            fireEvent.press(saveChangesButton);

            // Then the message should NOT be edited
            expect(mockEditReportComment).toHaveBeenCalledTimes(0);

            // And the error should be displayed
            expect(screen.getByText('composer.commentExceededMaxLength')).toBeOnTheScreen();
        });

        it('should open delete modal when saving an empty message', async () => {
            renderReportActionItemMessageEdit();
            const composer = screen.getByTestId('composer');
            const saveChangesButton = screen.getByLabelText('common.saveChanges');

            // Given a message that becomes empty after trimming
            fireEvent.changeText(composer, '   ');

            // When the message is saved
            fireEvent.press(saveChangesButton);

            // Then the message should NOT be edited
            expect(mockEditReportComment).toHaveBeenCalledTimes(0);

            // And the delete confirmation flow should be opened
            expect(mockShowDeleteModal).toHaveBeenCalledTimes(1);
        });

        it('should cache and forward video attributes when saving an edited message', async () => {
            const videoSource = 'https://example.com/video.mp4';
            const videoHtml = `<video src="${videoSource}" data-expensify-source="${videoSource}" data-name="video.mp4" data-expensify-height="100" data-expensify-width="200">video.mp4</video>`;

            const messages = defaultReportAction.message;
            if (!Array.isArray(messages)) {
                throw new Error('Expected the default report action message to be an array');
            }

            renderReportActionItemMessageEdit({
                action: {
                    ...defaultReportAction,
                    message: [
                        {
                            ...messages.at(0),
                            type: 'COMMENT',
                            html: videoHtml,
                            text: '[Attachment]',
                        },
                    ],
                },
            });

            const composer = screen.getByTestId('composer');
            const saveChangesButton = screen.getByLabelText('common.saveChanges');

            // Given a valid edited message
            fireEvent.changeText(composer, 'Edited message');

            // When the message is saved
            fireEvent.press(saveChangesButton);

            expect(mockEditReportComment).toHaveBeenCalledTimes(1);

            const editReportCommentArgs = mockEditReportComment.mock.calls.at(0);
            const videoAttributeCache = editReportCommentArgs?.[7];

            expect(videoAttributeCache).toEqual(expect.any(Object));
            expect(videoAttributeCache?.[videoSource]).toEqual(expect.any(String));
            expect(videoAttributeCache?.[videoSource]).toContain('data-name');
            expect(videoAttributeCache?.[videoSource]).toContain('data-expensify-height');
            expect(videoAttributeCache?.[videoSource]).toContain('data-expensify-width');
        });

        it('should use the list-specific scroll after saving the newest message', () => {
            const scrollToNewestAction = jest.fn();
            renderReportActionItemMessageEdit(undefined, {index: 9, isNewest: true, scrollToNewestAction});

            fireEvent.changeText(screen.getByTestId('composer'), 'Edited message');
            fireEvent.press(screen.getByLabelText('common.saveChanges'));

            expect(scrollToNewestAction).toHaveBeenCalledTimes(1);
        });

        it('should not scroll after saving a non-newest message at index zero', () => {
            const scrollToNewestAction = jest.fn();
            renderReportActionItemMessageEdit(undefined, {index: 0, isNewest: false, scrollToNewestAction});

            fireEvent.changeText(screen.getByTestId('composer'), 'Edited message');
            fireEvent.press(screen.getByLabelText('common.saveChanges'));

            expect(scrollToNewestAction).not.toHaveBeenCalled();
        });
    });
});
