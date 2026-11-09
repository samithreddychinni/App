import type {Event} from '@sentry/react-native';

type AppStateString = 'active' | 'background' | 'inactive';

/**
 * Filters out false-positive AppHang events during background suspension
 * and separates genuine foreground hangs into per-screen issues.
 */
function processAppHangEvent(event: Event, appStateOverride?: AppStateString): Event | null {
    const firstException = event.exception?.values?.[0];
    const isAppHang = firstException?.type === 'AppHang' || firstException?.mechanism?.type === 'AppHang';

    if (!isAppHang) {
        return event;
    }

    // Determine application state
    const appState = appStateOverride ?? (event.tags?.['ios.app_state'] as AppStateString) ?? 'active';
    const isBackgroundOrInactive = appState !== 'active';

    // Check if main thread stack is parked in the idle run loop
    const mainThread = event.threads?.values?.find((thread) => thread.current || thread.crashed);
    const frames = mainThread?.stacktrace?.frames ?? [];
    const topFrame = frames.at(-1)?.function ?? '';
    const isIdleRunLoop = topFrame.includes('mach_msg') || topFrame.includes('CFRunLoopServiceMachPort');

    // 1. Drop false positive background idle hangs
    if (isBackgroundOrInactive && isIdleRunLoop) {
        return null;
    }

    // 2. Set distinct fingerprint based on screen and hang type to split the mega-bucket
    const lastNavBreadcrumb = event.breadcrumbs
        ?.slice()
        .reverse()
        .find((breadcrumb) => breadcrumb.category === 'navigation.route' || breadcrumb.category === 'navigation');
    const screen = (lastNavBreadcrumb?.data?.route as string) || (lastNavBreadcrumb?.data?.screen as string) || 'unknown';
    const hangType = event.level === 'fatal' ? 'fully_blocking' : 'non_fully_blocking';

    // Sentry issue grouping uses fingerprint
    event.fingerprint = ['app-hang', hangType, screen];

    return event;
}

export default processAppHangEvent;
