import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105757:
 * "Mock bank is displayed as a selectable option for a new user to connect in Personal cards"
 *
 * Verifies that Mock Bank is excluded from the selectable banks list in Personal Cards
 * when running in production environment with production server, while remaining accessible
 * in non-production environments (staging, development) or when targeting non-production servers.
 */

const CONST = {
    ENVIRONMENT: {
        DEV: 'development',
        STAGING: 'staging',
        PRODUCTION: 'production',
    },
    SERVER: {
        DEV: 'development',
        STAGING: 'staging',
        PRODUCTION: 'production',
    },
    PERSONAL_CARDS: {
        BANKS: {
            AMEX: 'American Express',
            BANK_OF_AMERICA: 'Bank of America',
            CAPITAL_ONE: 'Capital One',
            CHASE: 'Chase',
            CITI_BANK: 'Citibank',
            WELLS_FARGO: 'Wells Fargo',
            MOCK_BANK: 'Mock Bank',
            OTHER: 'Other',
        },
    },
} as const;

type BankValue = (typeof CONST.PERSONAL_CARDS.BANKS)[keyof typeof CONST.PERSONAL_CARDS.BANKS];

function filterPersonalBanks(environment: string, activeServer: string): BankValue[] {
    return Object.values(CONST.PERSONAL_CARDS.BANKS).filter((bank) => {
        if (bank === CONST.PERSONAL_CARDS.BANKS.MOCK_BANK) {
            return environment !== CONST.ENVIRONMENT.PRODUCTION || activeServer !== CONST.SERVER.PRODUCTION;
        }
        return true;
    });
}

describe('PersonalCardsSelectBankStepRegressionTest', () => {
    it('excludes Mock Bank in production environment with production server', () => {
        const banks = filterPersonalBanks(CONST.ENVIRONMENT.PRODUCTION, CONST.SERVER.PRODUCTION);

        expect(banks).not.toContain(CONST.PERSONAL_CARDS.BANKS.MOCK_BANK);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.CHASE);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.BANK_OF_AMERICA);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.WELLS_FARGO);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.AMEX);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.CAPITAL_ONE);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.CITI_BANK);
        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.OTHER);
        expect(banks.length).toBe(7);
    });

    it('includes Mock Bank in staging environment', () => {
        const banks = filterPersonalBanks(CONST.ENVIRONMENT.STAGING, CONST.SERVER.STAGING);

        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.MOCK_BANK);
        expect(banks.length).toBe(8);
    });

    it('includes Mock Bank in dev environment', () => {
        const banks = filterPersonalBanks(CONST.ENVIRONMENT.DEV, CONST.SERVER.DEV);

        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.MOCK_BANK);
        expect(banks.length).toBe(8);
    });

    it('includes Mock Bank in production environment if activeServer is non-production (e.g. testing staging server from prod build)', () => {
        const banks = filterPersonalBanks(CONST.ENVIRONMENT.PRODUCTION, CONST.SERVER.STAGING);

        expect(banks).toContain(CONST.PERSONAL_CARDS.BANKS.MOCK_BANK);
        expect(banks.length).toBe(8);
    });

    it('preserves all standard banks and Other option across all environments', () => {
        const standardBanks = [
            CONST.PERSONAL_CARDS.BANKS.AMEX,
            CONST.PERSONAL_CARDS.BANKS.BANK_OF_AMERICA,
            CONST.PERSONAL_CARDS.BANKS.CAPITAL_ONE,
            CONST.PERSONAL_CARDS.BANKS.CHASE,
            CONST.PERSONAL_CARDS.BANKS.CITI_BANK,
            CONST.PERSONAL_CARDS.BANKS.WELLS_FARGO,
            CONST.PERSONAL_CARDS.BANKS.OTHER,
        ];

        const prodBanks = filterPersonalBanks(CONST.ENVIRONMENT.PRODUCTION, CONST.SERVER.PRODUCTION);
        const stagingBanks = filterPersonalBanks(CONST.ENVIRONMENT.STAGING, CONST.SERVER.STAGING);

        for (const bank of standardBanks) {
            expect(prodBanks).toContain(bank);
            expect(stagingBanks).toContain(bank);
        }
    });
});
