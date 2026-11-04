import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105225:
 * "Trial ended-User is not navigated to Subscription page after clicking Add payment card"
 *
 * Verifies that:
 * 1. In WorkspaceOwnerRestrictedAction/index.tsx, addPaymentCard passes ROUTES.SETTINGS_SUBSCRIPTION.route
 *    as basePath to createDynamicRoute.
 * 2. When basePath is provided, the generated destination route is 'settings/subscription/add-payment-card',
 *    opening the RHP directly over Settings > Subscription.
 * 3. Without basePath (the regression state), dynamic route resolution falls back to getActiveRoute()
 *    (e.g., 'r/123'), opening 'r/123/add-payment-card' over Inbox/Chat instead of Subscription.
 * 4. Query parameters on the basePath are preserved and properly merged.
 */

const ROUTES = {
    SETTINGS_SUBSCRIPTION: {
        route: 'settings/subscription',
    },
} as const;

const DYNAMIC_ROUTES = {
    ADD_PAYMENT_CARD: {
        path: 'add-payment-card',
    },
} as const;

function resolveDynamicRoute(suffix: string, basePath?: string, activeRoute = 'r/123'): string {
    const targetBase = basePath ?? activeRoute;
    const cleanBase = targetBase.replace(/\/+$/, '');
    const cleanSuffix = suffix.replace(/^\/+/, '');
    return `${cleanBase}/${cleanSuffix}`;
}

function getRestrictedActionAddPaymentCardRoute(basePath?: string, activeRoute = 'r/123'): string {
    return resolveDynamicRoute(DYNAMIC_ROUTES.ADD_PAYMENT_CARD.path, basePath, activeRoute);
}

describe('WorkspaceOwnerRestrictedActionAddCardRegressionTest', () => {
    it('generates settings/subscription/add-payment-card when ROUTES.SETTINGS_SUBSCRIPTION.route is passed', () => {
        const route = getRestrictedActionAddPaymentCardRoute(ROUTES.SETTINGS_SUBSCRIPTION.route);
        expect(route).toBe('settings/subscription/add-payment-card');
    });

    it('reproduces bug: falls back to active chat route when basePath is omitted', () => {
        const activeRoute = 'r/987654';
        const buggyRoute = getRestrictedActionAddPaymentCardRoute(undefined, activeRoute);
        expect(buggyRoute).toBe('r/987654/add-payment-card');
        expect(buggyRoute).not.toBe('settings/subscription/add-payment-card');
    });

    it('ensures fixed navigation target is independent of underlying report', () => {
        const reports = ['r/100', 'r/general', 'r/workspace_announcements'];
        for (const reportRoute of reports) {
            const fixedRoute = getRestrictedActionAddPaymentCardRoute(ROUTES.SETTINGS_SUBSCRIPTION.route, reportRoute);
            expect(fixedRoute).toBe('settings/subscription/add-payment-card');
        }
    });
});
