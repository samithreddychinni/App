import processAppHangEvent from '@src/setup/telemetry/processAppHangEvent';
import type {Event} from '@sentry/react-native';

describe('Sentry AppHang Filter & Fingerprinting', () => {
    it('drops false-positive AppHang events when the main thread is idle in mach_msg during background suspension', () => {
        const bgIdleEvent: Event = {
            exception: {
                values: [{type: 'AppHang'}],
            },
            threads: {
                values: [
                    {
                        current: true,
                        stacktrace: {
                            frames: [
                                {function: 'UIApplicationMain'},
                                {function: 'CFRunLoopRunSpecific'},
                                {function: '__CFRunLoopServiceMachPort'},
                                {function: 'mach_msg2_trap'},
                            ],
                        },
                    },
                ],
            },
        };

        const result = processAppHangEvent(bgIdleEvent, 'background');
        expect(result).toBeNull();
    });

    it('preserves real foreground hangs even if the main thread is in a lock', () => {
        const fgRealHangEvent: Event = {
            exception: {
                values: [{type: 'AppHang'}],
            },
            threads: {
                values: [
                    {
                        current: true,
                        stacktrace: {
                            frames: [
                                {function: 'MarkdownParser'},
                                {function: '__psynch_mutexwait'},
                            ],
                        },
                    },
                ],
            },
        };

        const result = processAppHangEvent(fgRealHangEvent, 'active');
        expect(result).not.toBeNull();
    });

    it('assigns screen-based fingerprints so distinct screens are not bucketed into one mega-group', () => {
        const searchHangEvent: Event = {
            level: 'fatal',
            exception: {
                values: [{type: 'AppHang'}],
            },
            breadcrumbs: [{category: 'navigation.route', data: {route: 'SearchScreen'}}],
        };
        const reportHangEvent: Event = {
            level: 'fatal',
            exception: {
                values: [{type: 'AppHang'}],
            },
            breadcrumbs: [{category: 'navigation.route', data: {route: 'ReportScreen'}}],
        };

        const searchResult = processAppHangEvent(searchHangEvent, 'active');
        const reportResult = processAppHangEvent(reportHangEvent, 'active');

        expect(searchResult?.fingerprint).toEqual(['app-hang', 'fully_blocking', 'SearchScreen']);
        expect(reportResult?.fingerprint).toEqual(['app-hang', 'fully_blocking', 'ReportScreen']);
    });
});
