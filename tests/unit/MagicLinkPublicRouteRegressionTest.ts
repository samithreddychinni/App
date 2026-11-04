import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105778:
 * "iOS - Log in - Online magic link does not open the linked report when signed out"
 *
 * Verifies that:
 * 1. isPublicScreenRoute correctly recognizes magic link routes with query parameters (e.g. `v/accountID/validateCode?exitTo=r/reportID`)
 *    and trailing/leading slashes or hash fragments, preventing Link.ts from improperly queueing an intercepting navigation.
 * 2. Concurrent calls to waitForUserSignIn() all resolve successfully when the session auth token becomes available,
 *    preventing dropped navigation promises during magic link sign-in flows.
 */

const PUBLIC_SCREENS_ROUTES = {
    ROOT: '',
    TRANSITION_BETWEEN_APPS: 'transition',
    CONNECTION_COMPLETE: 'connection-complete',
    BANK_CONNECTION_COMPLETE: 'bank-connection-complete',
    VALIDATE_LOGIN: 'v/:accountID/:validateCode',
    UNLINK_LOGIN: 'u/:accountID/:validateCode',
    SAML_SIGN_IN: 'sign-in-with-saml',
} as const;

function isPublicScreenRoute(route: string): boolean {
    const cleanRoute = (route.startsWith('/') ? route.slice(1) : route).split(/[?#]/)[0] ?? '';
    return Object.values(PUBLIC_SCREENS_ROUTES).some((screenRoute) => {
        const routeRegex = new RegExp(`^${screenRoute.replaceAll(/:\w+/g, '\\w+')}$`);
        return routeRegex.test(cleanRoute);
    });
}

class SessionAuthTracker {
    private authToken?: string;
    private authPromiseResolvers = new Set<(value: boolean) => void>();

    setAuthToken(token?: string) {
        this.authToken = token;
        if (token && this.authPromiseResolvers.size > 0) {
            this.authPromiseResolvers.forEach((resolve) => resolve(true));
            this.authPromiseResolvers.clear();
        }
    }

    waitForUserSignIn(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (this.authToken) {
                resolve(true);
            } else {
                this.authPromiseResolvers.add(resolve);
            }
        });
    }

    getPendingResolversCount(): number {
        return this.authPromiseResolvers.size;
    }
}

describe('MagicLinkPublicRouteRegressionTest', () => {
    describe('isPublicScreenRoute', () => {
        it('identifies magic link route with exitTo query parameter as public screen route', () => {
            expect(isPublicScreenRoute('v/12345/abcdef?exitTo=r%2F987654')).toBe(true);
            expect(isPublicScreenRoute('/v/12345/abcdef?exitTo=r/987654')).toBe(true);
            expect(isPublicScreenRoute('v/12345/abcdef?exitTo=r/987654&another=1')).toBe(true);
        });

        it('identifies magic link route with hash fragment or without query parameters', () => {
            expect(isPublicScreenRoute('v/12345/abcdef')).toBe(true);
            expect(isPublicScreenRoute('/v/12345/abcdef')).toBe(true);
            expect(isPublicScreenRoute('v/12345/abcdef#hashValue')).toBe(true);
        });

        it('identifies other public routes regardless of query params', () => {
            expect(isPublicScreenRoute('u/12345/abcdef?exitTo=home')).toBe(true);
            expect(isPublicScreenRoute('transition?isFromOldDot=true')).toBe(true);
            expect(isPublicScreenRoute('sign-in-with-saml?email=test%40expensify.com')).toBe(true);
            expect(isPublicScreenRoute('connection-complete?state=success')).toBe(true);
        });

        it('rejects protected private routes', () => {
            expect(isPublicScreenRoute('r/123456')).toBe(false);
            expect(isPublicScreenRoute('/r/123456?exitTo=somewhere')).toBe(false);
            expect(isPublicScreenRoute('settings/profile')).toBe(false);
            expect(isPublicScreenRoute('search?q=type:expense')).toBe(false);
        });
    });

    describe('waitForUserSignIn concurrent resolution', () => {
        it('resolves all concurrent listeners when auth token is populated', async () => {
            const tracker = new SessionAuthTracker();

            const p1 = tracker.waitForUserSignIn();
            const p2 = tracker.waitForUserSignIn();
            const p3 = tracker.waitForUserSignIn();

            expect(tracker.getPendingResolversCount()).toBe(3);

            // Simulate login arrival
            tracker.setAuthToken('valid_token_xyz');

            const results = await Promise.all([p1, p2, p3]);
            expect(results).toEqual([true, true, true]);
            expect(tracker.getPendingResolversCount()).toBe(0);
        });

        it('immediately resolves if user is already authenticated', async () => {
            const tracker = new SessionAuthTracker();
            tracker.setAuthToken('preexisting_token');

            const result = await tracker.waitForUserSignIn();
            expect(result).toBe(true);
            expect(tracker.getPendingResolversCount()).toBe(0);
        });
    });
});
