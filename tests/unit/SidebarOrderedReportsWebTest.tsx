/** Tests the sidebar cache with React DOM, real Onyx updates, and real report eligibility. */
/* eslint-disable testing-library/no-unnecessary-act -- This suite drives a React DOM root directly. */
import {CurrentUserPersonalDetailsProvider} from '@components/CurrentUserPersonalDetailsProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {SidebarOrderedReportsContextProvider, useSidebarOrderedReports, useSidebarOrderedReportsActions} from '@hooks/useSidebarOrderedReports';

import SidebarUtils from '@libs/SidebarUtils';

import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction} from '@src/types/onyx';

import type {Root} from 'react-dom/client';

import React, {act, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const CURRENT_USER_ACCOUNT_ID = 12345;
const OTHER_USER_ACCOUNT_ID = 67890;
const COMMENT_ACTION_ID = '201';

jest.mock('@libs/Navigation/Navigation', () => ({
    getActiveRouteWithoutParams: jest.fn(() => ''),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    getTopmostReportId: jest.fn(),
}));

describe('sidebar report updates on web', () => {
    let root: Root;
    let container: HTMLDivElement;
    let orderedReportIDs: string[];
    let clearLHNCache: () => void;

    function SidebarObserver() {
        const state = useSidebarOrderedReports();
        const actions = useSidebarOrderedReportsActions();
        useEffect(() => {
            orderedReportIDs = state.orderedReportIDs;
            clearLHNCache = actions.clearLHNCache;
        }, [state.orderedReportIDs, actions.clearLHNCache]);
        return null;
    }

    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.EN);
        initOnyxDerivedValues();
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: 'test@example.com'});
        await Onyx.set(ONYXKEYS.NVP_PRIORITY_MODE, CONST.PRIORITY_MODE.DEFAULT);
        await waitForBatchedUpdates();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        orderedReportIDs = [];
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        await Onyx.clear();
        jest.restoreAllMocks();
    });

    function createChat(reportID: string): Report {
        return {
            reportID,
            reportName: `Chat ${reportID}`,
            type: CONST.REPORT.TYPE.CHAT,
            isPinned: true,
            lastVisibleActionCreated: '2026-11-01 10:00:00',
            lastReadTime: '2026-10-31 10:00:00',
            lastMessageText: 'Hello',
            participants: {
                [CURRENT_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
                [OTHER_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
            },
        };
    }

    function createExpenseAction(reportActionID: string, childReportID: string): ReportAction {
        return {
            reportActionID,
            childReportID,
            actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
            actorAccountID: CURRENT_USER_ACCOUNT_ID,
            created: '2026-11-01 10:00:00',
            message: {type: CONST.IOU.REPORT_ACTION_TYPE.CREATE, IOUTransactionID: reportActionID, amount: 100, currency: CONST.CURRENCY.USD, text: 'Expense', html: 'Expense'},
        };
    }

    async function renderSidebar(currentReportID = '50', isStrictMode = false) {
        await act(async () => {
            const sidebar = (
                <OnyxListItemProvider>
                    <CurrentUserPersonalDetailsProvider>
                        <SidebarOrderedReportsContextProvider currentReportIDForTests={currentReportID}>
                            <SidebarObserver />
                        </SidebarOrderedReportsContextProvider>
                    </CurrentUserPersonalDetailsProvider>
                </OnyxListItemProvider>
            );
            root.render(isStrictMode ? <React.StrictMode>{sidebar}</React.StrictMode> : sidebar);
            await waitForBatchedUpdates();
        });
    }

    it.each([true, false])('removes the remaining expense thread when its parent is displayed: %s', async (isParentDisplayed) => {
        // Given two expenses, a visible unread thread, and another unread chat.
        const parent: Report = {
            ...createChat('10'),
            type: CONST.REPORT.TYPE.EXPENSE,
            chatReportID: '20',
            transactionCount: 2,
            total: -200,
            currency: CONST.CURRENCY.USD,
            isPinned: isParentDisplayed,
            participants: {
                [CURRENT_USER_ACCOUNT_ID]: {notificationPreference: isParentDisplayed ? CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS : CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN},
                [OTHER_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
            },
            lastReadTime: '2026-11-02 10:00:00',
        };
        const thread: Report = {...createChat('30'), parentReportID: '10', parentReportActionID: '101'};
        const firstAction = createExpenseAction('101', '30');
        const secondAction = createExpenseAction('102', '40');
        await Onyx.multiSet({
            [`${ONYXKEYS.COLLECTION.REPORT}10` as const]: parent,
            [`${ONYXKEYS.COLLECTION.REPORT}20` as const]: {
                ...createChat('20'),
                isPinned: false,
                participants: {
                    [CURRENT_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN},
                    [OTHER_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
                },
                lastReadTime: '2026-11-02 10:00:00',
            },
            [`${ONYXKEYS.COLLECTION.REPORT}30` as const]: thread,
            [`${ONYXKEYS.COLLECTION.REPORT}50` as const]: createChat('50'),
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}10` as const]: {[firstAction.reportActionID]: firstAction, [secondAction.reportActionID]: secondAction},
        });
        await waitForBatchedUpdates();
        await renderSidebar();
        expect(orderedReportIDs).toContain('30');
        expect(orderedReportIDs.includes('10')).toBe(isParentDisplayed);
        const updateSpy = jest.spyOn(SidebarUtils, 'updateReportsToDisplayInLHN');

        // When deleting the other expense leaves only the displayed thread's expense.
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}10`, {[firstAction.reportActionID]: firstAction});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}10`, {transactionCount: 1, total: -100});
            await waitForBatchedUpdates();
        });

        // Then the thread must disappear without a later unrelated update.
        expect(updateSpy).toHaveBeenCalled();
        expect(orderedReportIDs).not.toContain('30');

        // When a second expense is added, the unchanged first thread becomes eligible again.
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}10`, {[firstAction.reportActionID]: firstAction, [secondAction.reportActionID]: secondAction});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}10`, {transactionCount: 2, total: -200});
            await waitForBatchedUpdates();
        });

        // Then the sidebar must restore that thread without changing the thread's own report.
        expect(orderedReportIDs).toContain('30');
    });

    it('refreshes a displayed expense report when its hidden thread is read in Focus mode', async () => {
        // Given an unread expense whose one transaction thread is hidden from the sidebar.
        const parent: Report = {
            ...createChat('10'),
            type: CONST.REPORT.TYPE.EXPENSE,
            chatReportID: '20',
            transactionCount: 1,
            total: -100,
            currency: CONST.CURRENCY.USD,
            isPinned: false,
            ownerAccountID: OTHER_USER_ACCOUNT_ID,
            managerID: OTHER_USER_ACCOUNT_ID,
        };
        const firstAction = createExpenseAction('101', '30');
        await Onyx.multiSet({
            [ONYXKEYS.NVP_PRIORITY_MODE]: CONST.PRIORITY_MODE.GSD,
            [`${ONYXKEYS.COLLECTION.REPORT}10` as const]: parent,
            [`${ONYXKEYS.COLLECTION.REPORT}30` as const]: {...createChat('30'), parentReportID: '10', parentReportActionID: '101'},
            [`${ONYXKEYS.COLLECTION.REPORT}50` as const]: createChat('50'),
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}10` as const]: {[firstAction.reportActionID]: firstAction},
        });
        await waitForBatchedUpdates();
        await renderSidebar();
        expect(orderedReportIDs).toContain('10');
        expect(orderedReportIDs).not.toContain('30');

        // When reading the hidden thread clears the expense report's unread status.
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}30`, {lastReadTime: '2026-11-02 10:00:00'});
            await waitForBatchedUpdates();
        });

        // Then Focus mode must remove the read expense report without an unrelated update.
        expect(orderedReportIDs).not.toContain('10');

        // When a new reply makes that hidden thread unread again.
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}30`, {lastVisibleActionCreated: '2026-11-03 10:00:00', lastMessageText: 'New reply'});
            await waitForBatchedUpdates();
        });

        // Then the expense report must return even though neither related row was displayed.
        expect(orderedReportIDs).toContain('10');
    });

    it.each([false, true])('rebuilds the sidebar after a cache reset in Strict mode: %s', async (isStrictMode) => {
        // Given a displayed current report and a settled cache.
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}50`, createChat('50'));
        await renderSidebar('50', isStrictMode);
        expect(orderedReportIDs).toContain('50');
        const fullBuild = jest.spyOn(SidebarUtils, 'getReportsToDisplayInLHN');

        // When the debug action explicitly clears the cache.
        await act(async () => {
            clearLHNCache();
            await waitForBatchedUpdates();
        });

        // Then the full rebuild still includes the displayed report.
        expect(fullBuild).toHaveBeenCalled();
        expect(orderedReportIDs).toContain('50');
    });

    it.each([false, true])('handles 400 report writes without an update loop in Strict mode: %s', async (isStrictMode) => {
        // Given five unread rooms with real derived report attributes and a mounted web sidebar.
        const reportIDs = ['51', '52', '53', '54', '55'];
        for (const reportID of reportIDs) {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, createChat(reportID));
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`, {
                [COMMENT_ACTION_ID]: {
                    reportActionID: COMMENT_ACTION_ID,
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    actorAccountID: CURRENT_USER_ACCOUNT_ID,
                    created: '2026-11-01 10:00:00',
                    message: {type: 'COMMENT', text: 'Hello', html: 'Hello', lastModified: '2026-11-01 10:00:00'},
                },
            });
        }
        await renderSidebar('51', isStrictMode);
        expect(orderedReportIDs).toEqual(expect.arrayContaining(reportIDs));
        const errors: string[] = [];
        const sortReports = jest.spyOn(SidebarUtils, 'sortReportsToDisplayInLHN');
        const onError = (event: ErrorEvent) => {
            errors.push(event.message);
            event.preventDefault();
        };
        window.addEventListener('error', onError);
        const consoleError = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
            const message = args.map(String).join(' ');
            // The burst runs outside act so React uses the web scheduler, so ignore only act warnings.
            if (!message.includes('not wrapped in act')) {
                errors.push(message);
            }
        });

        // When writes arrive across microtasks, React must handle each real external-store notification.
        const writes: Array<Promise<void>> = [];
        try {
            for (let index = 0; index < 400; index++) {
                writes.push(Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${reportIDs[index % reportIDs.length]}`, {lastMessageText: `Message ${index}`}));
                await Promise.resolve();
                await Promise.resolve();
                await Promise.resolve();
            }
            await Promise.all(writes);
            await act(async () => waitForBatchedUpdates());
        } finally {
            window.removeEventListener('error', onError);
            consoleError.mockRestore();
        }

        // Then every room remains available and no renderer reports either kind of update loop.
        expect(errors).toEqual([]);
        expect(orderedReportIDs).toEqual(expect.arrayContaining(reportIDs));
        expect(sortReports.mock.calls.at(-1)?.[0][`${ONYXKEYS.COLLECTION.REPORT}55`]?.lastMessageText).toBe('Message 399');
    });
});
