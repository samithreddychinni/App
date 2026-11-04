import {PUBLIC_SCREENS_ROUTES} from '@src/ROUTES';

export default function isPublicScreenRoute(route: string) {
    const cleanRoute = (route.startsWith('/') ? route.slice(1) : route).split(/[?#]/)[0] ?? '';
    return Object.values(PUBLIC_SCREENS_ROUTES).some((screenRoute) => {
        const routeRegex = new RegExp(`^${screenRoute.replaceAll(/:\w+/g, '\\w+')}$`);
        return routeRegex.test(cleanRoute);
    });
}
