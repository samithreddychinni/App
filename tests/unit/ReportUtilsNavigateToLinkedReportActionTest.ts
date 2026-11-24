import Onyx from 'react-native-onyx';
import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import {navigateToLinkedReportAction} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import type {Report, ReportAction} from '@src/types/onyx';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
    },
}));

jest.mock('@libs/Log', () => ({
    __esModule: true,
    default: {
        warn: jest.fn(),
        info: jest.fn(),
        alert: jest.fn(),
        hmmm: jest.fn(),
        clientLoggingCallback: jest.fn(),
        serverLoggingCallback: jest.fn(),
    },
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    setNavigationActionToMicrotaskQueue: jest.fn((cb: () => void) => cb()),
    navigationRef: {
        current: {
            getRootState: jest.fn(() => ({routes: []})),
        },
        getRootState: jest.fn(() => ({routes: []})),
    },
}));

describe('navigateToLinkedReportAction', () => {
    const mockNavigate = jest.mocked(Navigation.navigate);
    const mockGoBack = jest.mocked(Navigation.goBack);
    const mockSetParams = jest.mocked(Navigation.setParams);
    const mockGetRootState = jest.mocked(navigationRef.current?.getRootState);

    const EXPENSE_REPORT_ID = '1234567890';
    const PARENT_IOU_ACTION_ID = 'iou_action_123';
    const TRANSACTION_THREAD_ID = '9876543210';
    const COMMENT_THREAD_ID = '5555555555';
    const ACTION_ID = 'action_111';

    const expenseReport: Report = {
        reportID: EXPENSE_REPORT_ID,
        type: CONST.REPORT.TYPE.EXPENSE,
    };

    const transactionThread: Report = {
        reportID: TRANSACTION_THREAD_ID,
        parentReportID: EXPENSE_REPORT_ID,
        parentReportActionID: PARENT_IOU_ACTION_ID,
        type: CONST.REPORT.TYPE.CHAT,
    };

    const normalChat: Report = {
        reportID: 'chat_123',
        type: CONST.REPORT.TYPE.CHAT,
    };

    const parentCommentAction: ReportAction = {
        reportActionID: ACTION_ID,
        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        created: '2026-11-24 10:00:00',
        message: [{type: 'COMMENT', html: 'Test comment', text: 'Test comment'}],
    };

    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${EXPENSE_REPORT_ID}`, expenseReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${EXPENSE_REPORT_ID}`, {
            [PARENT_IOU_ACTION_ID]: {
                reportActionID: PARENT_IOU_ACTION_ID,
                actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                originalMessage: {type: CONST.IOU.REPORT_ACTION_TYPE.CREATE},
            },
        });
        await waitForBatchedUpdates();
    });

    afterAll(() => Onyx.clear());

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should pop thread and not setParams on route below when route below is an expense report and ancestor is its one-transaction thread', () => {
        mockGetRootState?.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                    state: {
                        key: 'rhp-state-key',
                        index: 1,
                        routes: [
                            {
                                key: 'expense-report-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: EXPENSE_REPORT_ID},
                            },
                            {
                                key: 'thread-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: COMMENT_THREAD_ID},
                            },
                        ],
                    },
                },
            ],
            key: 'root-key',
            routeNames: [],
            routesCount: 1,
            stale: false,
            type: 'stack',
        } as unknown as ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>);

        navigateToLinkedReportAction(
            {
                report: transactionThread,
                reportAction: parentCommentAction,
                shouldDisplayNewMarker: false,
            },
            true,
            true,
            false,
        );

        expect(mockSetParams).not.toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should pop thread and setParams on route below when route below matches ancestor reportID directly', () => {
        mockGetRootState?.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                    state: {
                        key: 'rhp-state-key',
                        index: 1,
                        routes: [
                            {
                                key: 'parent-chat-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: 'chat_123'},
                            },
                            {
                                key: 'thread-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: COMMENT_THREAD_ID},
                            },
                        ],
                    },
                },
            ],
            key: 'root-key',
            routeNames: [],
            routesCount: 1,
            stale: false,
            type: 'stack',
        } as unknown as ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>);

        navigateToLinkedReportAction(
            {
                report: normalChat,
                reportAction: parentCommentAction,
                shouldDisplayNewMarker: false,
            },
            true,
            true,
            false,
        );

        expect(mockSetParams).toHaveBeenCalledWith({reportActionID: ACTION_ID}, 'parent-chat-route-key', 'rhp-state-key');
        expect(mockGoBack).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to SEARCH_REPORT when route below is an unrelated report', () => {
        mockGetRootState?.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                    state: {
                        key: 'rhp-state-key',
                        index: 1,
                        routes: [
                            {
                                key: 'unrelated-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: 'unrelated_999'},
                            },
                            {
                                key: 'thread-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: COMMENT_THREAD_ID},
                            },
                        ],
                    },
                },
            ],
            key: 'root-key',
            routeNames: [],
            routesCount: 1,
            stale: false,
            type: 'stack',
        } as unknown as ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>);

        navigateToLinkedReportAction(
            {
                report: transactionThread,
                reportAction: parentCommentAction,
                shouldDisplayNewMarker: false,
            },
            true,
            true,
            false,
        );

        expect(mockSetParams).not.toHaveBeenCalled();
        expect(mockGoBack).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            ROUTES.SEARCH_REPORT.getRoute({
                reportID: TRANSACTION_THREAD_ID,
                reportActionID: ACTION_ID,
                backTo: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
            }),
        );
    });

    it('should navigate to SEARCH_REPORT when ancestor is a non-transaction-thread whose parentReportID matches route below', () => {
        const nonTransactionChildReport: Report = {
            reportID: 'child_chat_456',
            parentReportID: EXPENSE_REPORT_ID,
            type: CONST.REPORT.TYPE.CHAT,
        };

        mockGetRootState?.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                    state: {
                        key: 'rhp-state-key',
                        index: 1,
                        routes: [
                            {
                                key: 'expense-report-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: EXPENSE_REPORT_ID},
                            },
                            {
                                key: 'thread-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: COMMENT_THREAD_ID},
                            },
                        ],
                    },
                },
            ],
            key: 'root-key',
            routeNames: [],
            routesCount: 1,
            stale: false,
            type: 'stack',
        } as unknown as ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>);

        navigateToLinkedReportAction(
            {
                report: nonTransactionChildReport,
                reportAction: parentCommentAction,
                shouldDisplayNewMarker: false,
            },
            true,
            true,
            false,
        );

        expect(mockSetParams).not.toHaveBeenCalled();
        expect(mockGoBack).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            ROUTES.SEARCH_REPORT.getRoute({
                reportID: 'child_chat_456',
                reportActionID: ACTION_ID,
                backTo: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
            }),
        );
    });

    it('should navigate to SEARCH_REPORT when there is no route below (single screen in RHP)', () => {
        mockGetRootState?.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                    state: {
                        key: 'rhp-state-key',
                        index: 0,
                        routes: [
                            {
                                key: 'thread-route-key',
                                name: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
                                params: {reportID: COMMENT_THREAD_ID},
                            },
                        ],
                    },
                },
            ],
            key: 'root-key',
            routeNames: [],
            routesCount: 1,
            stale: false,
            type: 'stack',
        } as unknown as ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>);

        navigateToLinkedReportAction(
            {
                report: transactionThread,
                reportAction: parentCommentAction,
                shouldDisplayNewMarker: false,
            },
            true,
            true,
            false,
        );

        expect(mockSetParams).not.toHaveBeenCalled();
        expect(mockGoBack).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            ROUTES.SEARCH_REPORT.getRoute({
                reportID: TRANSACTION_THREAD_ID,
                reportActionID: ACTION_ID,
                backTo: SCREENS.RIGHT_MODAL.SEARCH_REPORT,
            }),
        );
    });
});
