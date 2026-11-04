/** Executes the compiled preview handlers with the context-menu ref in each lifecycle state. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const file = process.argv[2];
const contextMenuRef = {current: null};
const calls = [];
const guardOnly = true;
const transactions = [
    {transactionID: '11', reportID: '100', amount: -100},
    {transactionID: '12', reportID: '100', amount: -200},
];
const noop = () => {};
const modules = {
    react: {createRef: () => contextMenuRef, useRef: (current) => ({current}), useState: (initial) => [initial, noop], useEffect: noop},
    'react/compiler-runtime': {c: (size) => Array(size).fill(Symbol.for('react.memo_cache_sentinel'))},
    'react/jsx-runtime': {jsx: (type, props) => ({type, props})},
    '@react-navigation/core': {useIsFocused: () => true},
    '@components/OnyxListItemProvider': {usePersonalDetails: () => ({})},
    '@components/ReportActionItem/TransactionPreview': noop,
    '@components/WideRHPContextProvider': {useWideRHPActions: () => ({markReportRHPWidth: noop, unmarkReportRHPWidth: noop})},
    '@hooks/useCurrentUserPersonalDetails': () => ({email: 'test@example.test', accountID: 1}),
    '@hooks/useNetwork': () => ({isOffline: false}),
    '@hooks/useNewTransactions': () => [],
    '@hooks/useOnyx': () => [undefined],
    '@hooks/usePolicy': noop,
    '@hooks/useReportTransactionsCollection': () => Object.fromEntries(transactions.map((t) => [t.transactionID, t])),
    '@hooks/useResponsiveLayout': () => ({shouldUseNarrowLayout: true, isSmallScreenWidth: true}),
    '@hooks/useStyleUtils': () => ({getMoneyRequestReportPreviewStyle: () => ({transactionPreviewCarouselStyle: {width: 240}, componentStyle: {}})}),
    '@hooks/useThemeStyles': () => ({}),
    '@hooks/useTransactionViolations': noop,
    '@libs/getNonEmptyStringOnyxID': (value) => value || '0',
    '@libs/ReportActionsUtils': {getIOUActionForReportID: noop, isTrackExpenseAction: () => false, isSplitBillAction: () => false},
    '@libs/ReportUtils': {getTransactionsWithReceipts: () => [], isIOUReport: () => true, areAllRequestsBeingSmartScanned: () => false},
    '@libs/TransactionUtils': {hasNonReimbursableTransactions: () => false},
    '@libs/actions/Report': {openReport: () => calls.push('openReport')},
    '@libs/telemetry/activeSpans': {startSpan: noop},
    '@navigation/Navigation': {
        getActiveRoute: () => {
            if (guardOnly) {
                calls.push('past guard');
                throw new Error('past guard');
            }
            return 'r/200';
        },
        navigate: () => calls.push('navigate'),
    },
    '@pages/inbox/report/ContextMenu/ReportActionContextMenu': {contextMenuRef},
    '@src/CONST': {RED_BRICK_ROAD_PENDING_ACTION: {DELETE: 'delete'}, REPORT: {TYPE: {IOU: 'iou'}}, TELEMETRY: {SPAN_OPEN_REPORT: 'open'}, FULLSTORY: {CLASS: {UNMASK: 'unmask'}}},
    '@src/ONYXKEYS': {
        COLLECTION: {
            REPORT: 'report_',
            POLICY: 'policy_',
            REPORT_ACTIONS: 'reportActions_',
            RAM_ONLY_REPORT_LOADING_STATE: 'loading_',
            RAM_ONLY_FULL_POLICY_SNAPSHOT: 'snapshot_',
            REPORT_METADATA: 'meta_',
        },
    },
    '@src/ROUTES': {REPORT_WITH_ID: {getRoute: (id) => `r/${id}`}},
    '@src/selectors/Policy': {},
    '@src/selectors/ReportMetaData': {},
    './MoneyRequestReportPreviewContent': noop,
    './resolvePressOrigin': () => ({wasPressedFromReport: false, backTo: 'r/200'}),
};
const moduleValue = {exports: {}};
vm.runInNewContext(
    fs.readFileSync(path.resolve(file), 'utf8'),
    {
        module: moduleValue,
        exports: moduleValue.exports,
        require(name) {
            assert.ok(name in modules, `Unmocked dependency: ${name}`);
            return modules[name];
        },
        setTimeout,
        clearTimeout,
    },
    {filename: file},
);
const component = moduleValue.exports.default;
const results = [];
for (const handler of ['report', 'transaction']) {
    for (const value of [null, undefined, {isContextMenuOpening: false}, {isContextMenuOpening: true}]) {
        contextMenuRef.current = value;
        calls.length = 0;
        const content = component({iouReportID: '100', iouReport: {reportID: '100', transactionCount: 2}, chatReportID: '200', action: {childType: 'iou'}});
        const press = handler === 'report' ? content.props.onPress : content.props.renderTransactionItem({item: transactions[0]}).props.onPreviewPressed;
        let error = null;
        try {
            press();
            assert.equal(calls.length, value?.isContextMenuOpening ? 0 : 1);
            if (calls.length) {
                assert.equal(calls[0], handler === 'report' ? 'navigate' : 'openReport');
            }
        } catch (e) {
            if (!(guardOnly && e.message === 'past guard' && !value?.isContextMenuOpening)) {
                error = e.message;
            }
        }
        results.push({handler, ref: value, calls: [...calls], error});
    }
}
console.log(JSON.stringify(results));
if (results.some((r) => r.error)) {
    process.exitCode = 1;
}
