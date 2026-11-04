import {describe, expect, it} from '@jest/globals';

/**
 * Regression test for Issue #105451:
 * Distance rate tax amount is shown 0 even if the tax rate is not 0 (when applied via category rule).
 *
 * Verifies that rates without their own tax rate default to 100% taxable amount (taxClaimablePercentage = 1),
 * while rates with an explicit tax rate continue to default to 0% if taxClaimablePercentage is unset.
 */

type DistanceRateAttributes = {
    taxRateExternalID?: string;
    taxClaimablePercentage?: number;
};

type DistanceCustomUnitRate = {
    rate: number;
    attributes?: DistanceRateAttributes;
};

function calculateTaxableAmount(distance: number, rate: number, customUnitRate: DistanceCustomUnitRate | undefined): number {
    const amount = distance * rate;
    const hasTaxRate = Boolean(customUnitRate?.attributes?.taxRateExternalID);
    const defaultTaxClaimablePercentage = hasTaxRate ? 0 : 1;
    const taxClaimablePercentage = customUnitRate?.attributes?.taxClaimablePercentage ?? defaultTaxClaimablePercentage;
    return amount * taxClaimablePercentage;
}

describe('DistanceRequestUtils.getTaxableAmount taxClaimablePercentage logic', () => {
    const distance = 10;
    const ratePerMile = 100; // $1.00 per mile -> $10.00 total amount
    const fullAmount = distance * ratePerMile;

    it('defaults to 100% taxable amount for rates without a tax rate (Rate-NoTax)', () => {
        const rateWithoutTax: DistanceCustomUnitRate = {
            rate: ratePerMile,
            attributes: {}, // No taxRateExternalID, taxClaimablePercentage is undefined
        };

        const taxableAmount = calculateTaxableAmount(distance, ratePerMile, rateWithoutTax);
        expect(taxableAmount).toBe(fullAmount);
    });

    it('defaults to 0 taxable amount for rates with a tax rate but unset reclaimable percentage', () => {
        const rateWithTaxUnsetReclaimable: DistanceCustomUnitRate = {
            rate: ratePerMile,
            attributes: {
                taxRateExternalID: 'tax_rate_1',
                // taxClaimablePercentage is undefined
            },
        };

        const taxableAmount = calculateTaxableAmount(distance, ratePerMile, rateWithTaxUnsetReclaimable);
        expect(taxableAmount).toBe(0);
    });

    it('respects explicitly configured taxClaimablePercentage on rates with tax rate', () => {
        const rateWithConfiguredReclaimable: DistanceCustomUnitRate = {
            rate: ratePerMile,
            attributes: {
                taxRateExternalID: 'tax_rate_1',
                taxClaimablePercentage: 0.5, // 50%
            },
        };

        const taxableAmount = calculateTaxableAmount(distance, ratePerMile, rateWithConfiguredReclaimable);
        expect(taxableAmount).toBe(fullAmount * 0.5);
    });

    it('respects explicit 0% taxClaimablePercentage', () => {
        const rateWithZeroReclaimable: DistanceCustomUnitRate = {
            rate: ratePerMile,
            attributes: {
                taxRateExternalID: 'tax_rate_1',
                taxClaimablePercentage: 0,
            },
        };

        const taxableAmount = calculateTaxableAmount(distance, ratePerMile, rateWithZeroReclaimable);
        expect(taxableAmount).toBe(0);
    });

    it('calculates non-zero tax when 10% tax rate is applied to Rate-NoTax', () => {
        const rateWithoutTax: DistanceCustomUnitRate = {
            rate: ratePerMile,
            attributes: {},
        };

        const taxableAmount = calculateTaxableAmount(distance, ratePerMile, rateWithoutTax);
        const taxRate = 0.1; // 10%
        const taxAmount = taxableAmount * taxRate;

        expect(taxableAmount).toBe(1000);
        expect(taxAmount).toBe(100);
    });
});
