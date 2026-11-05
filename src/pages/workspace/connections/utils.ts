/**
 * Helpers shared by the Connections page listing builders.
 */
import type {LocaleContextProps} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';

import type {ConnectionListing, ConnectionsTab} from './types';

const MCP_CONNECTOR = {
    CLAUDE: 'claude',
    CHATGPT: 'chatgpt',
    CURSOR: 'cursor',
    MCP: 'mcp',
} as const;

/** Receipt integrations that are set up outside Expensify, so their card only opens the setup guide */
const DOCUMENTATION_RECEIPT_INTEGRATIONS = [
    {key: 'lyft', title: 'Lyft', iconName: 'LyftSquare', helpURL: CONST.LYFT_HELP_URL},
    {key: 'instacart', title: 'Instacart', iconName: 'InstacartSquare', helpURL: CONST.INSTACART_HELP_URL},
    {key: 'doordash', title: 'DoorDash', iconName: 'DoorDashSquare', helpURL: CONST.DOORDASH_HELP_URL},
    {key: 'americanAirlines', title: 'American Airlines', iconName: 'AmericanAirlinesSquare', helpURL: CONST.AMERICAN_AIRLINES_HELP_URL},
    {key: 'united', title: 'United', iconName: 'UnitedSquare', helpURL: CONST.UNITED_HELP_URL},
    {key: 'delta', title: 'Delta', iconName: 'DeltaSquare', helpURL: CONST.DELTA_HELP_URL},
    {key: 'kayak', title: 'KAYAK', iconName: 'KayakSquare', helpURL: CONST.KAYAK_HELP_URL},
] as const;

type GetSyncStatusMessageParams = {
    /** Shown instead of the last sync time while a sync is running */
    syncingMessage?: string;

    /** ISO datetime of the last successful sync, undefined if the connection never synced */
    successfulDate?: string;

    translate: LocaleContextProps['translate'];

    datetimeToRelative: LocaleContextProps['datetimeToRelative'];
};

function getSyncStatusMessage({syncingMessage, successfulDate, translate, datetimeToRelative}: GetSyncStatusMessageParams): string {
    if (syncingMessage) {
        return syncingMessage;
    }
    if (!successfulDate) {
        return translate('workspace.accounting.notSync');
    }
    return translate('workspace.accounting.lastSync', datetimeToRelative(successfulDate));
}

function getListingsForTab(listings: ConnectionListing[], tab: ConnectionsTab): ConnectionListing[] {
    if (tab === CONST.TAB.CONNECTIONS.ALL) {
        return listings;
    }
    return listings.filter((listing) => listing.category === tab);
}

export {MCP_CONNECTOR, DOCUMENTATION_RECEIPT_INTEGRATIONS, getSyncStatusMessage, getListingsForTab};
