/** A hidden transaction thread must update the expense report row used by Focus mode and the Unread tab. */
import * as ReportActionsUtils from '@libs/ReportActionsUtils';
import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {ReportAttributes} from '@src/types/onyx/DerivedValues';

import Onyx from 'react-native-onyx';

import createMock from '../utils/createMock';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

describe('Single expense thread unread state', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));
    afterEach(async () => {
        jest.restoreAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('reconsiders the parent after only its thread receives a comment', async () => {
        // Given the read expense report represents a single hidden transaction thread
        const ownerAccountID = 1;
        const parentID = '100';
        const threadID = '200';
        const parent = createMock<Report>({
            reportID: '100',
            reportName: 'Expense report',
            participants: {[ownerAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS}},
            type: CONST.REPORT.TYPE.EXPENSE,
            ownerAccountID: 1,
            managerID: 2,
            stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
            statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
            lastReadTime: '2026-11-01 12:00:00.000',
            lastVisibleActionCreated: '2026-11-01 12:00:00.000',
            lastActorAccountID: 1,
        });
        const thread = createMock<Report>({
            reportID: '200',
            reportName: 'Expense thread',
            participants: {[ownerAccountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS}},
            parentReportID: '100',
            type: CONST.REPORT.TYPE.CHAT,
            lastReadTime: parent.lastReadTime,
            lastVisibleActionCreated: '2026-11-01 12:01:00.000',
            lastActorAccountID: 2,
        });
        const reports = {[`${ONYXKEYS.COLLECTION.REPORT}${parentID}`]: parent, [`${ONYXKEYS.COLLECTION.REPORT}${threadID}`]: thread};
        await Onyx.multiSet({...reports, [ONYXKEYS.SESSION]: {accountID: 1, email: 'owner@example.com'}});
        await waitForBatchedUpdates();
        jest.spyOn(ReportActionsUtils, 'getOneTransactionThreadReportID').mockReturnValue('200');
        const reportAttributes = {
            [parentID]: createMock<ReportAttributes>({oneTransactionThreadReportID: '200', isEmpty: false, requiresAttention: false}),
            [threadID]: createMock<ReportAttributes>({isEmpty: false}),
        };
        // When the incremental pass sees only the thread's changed key
        const displayed = SidebarUtils.updateReportsToDisplayInLHN({
            displayedReports: {},
            reports,
            policies: {},
            updatedReportsKeys: ['report_200'],
            currentReportId: undefined,
            isInFocusMode: true,
            isDefaultRoomsBetaEnabled: false,
            transactionViolations: {},
            reportNameValuePairs: {},
            reportAttributes,
            draftComments: {},
            transactions: {},
            isOffline: false,
            currentUserLogin: 'owner@example.com',
            currentUserAccountID: 1,
            conciergeReportID: undefined,
            guideAccountIDs: [],
            session: {accountID: 1, email: 'owner@example.com'},
        });
        // Then its parent enters Focus mode and the Unread filter even without a parent Onyx update
        expect(displayed.report_100?.isUnreadReport).toBe(true);
        expect(SidebarUtils.filterReportsForInboxTab(['100'], displayed, CONST.INBOX_TAB.UNREAD)).toEqual(['100']);
    });
});
