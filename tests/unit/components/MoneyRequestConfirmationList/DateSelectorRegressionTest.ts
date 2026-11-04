/** Covers the UTC date shown for a split expense after SmartScan fails. */
import {dateStateSelector} from '@components/MoneyRequestConfirmationList/sections/selectors';

import type {Transaction} from '@src/types/onyx';

import createMock from '../../../utils/createMock';

describe('Split expense confirmation date', () => {
    it.each([
        ['2026-10-26 13:45:12.000', undefined, '2026-10-26'],
        ['2026-10-26 00:30:00.000', undefined, '2026-10-26'],
        ['2026-10-26', undefined, '2026-10-26'],
        ['2026-10-26 13:45:12.000', '2026-10-27', '2026-10-27'],
        ['', undefined, ''],
        ['invalid', undefined, ''],
    ])('formats %s with edited date %s as %s', (created, modifiedCreated, expected) => {
        // Given a split expense can retain the full database timestamp after a failed scan
        const transaction = createMock<Transaction>({created, modifiedCreated});
        // When either date field reads the shared selector
        const result = dateStateSelector(transaction);
        // Then it uses the UTC calendar date and respects a user edit
        expect(result?.iouCreated).toBe(expected);
    });

    it('does not manufacture a date for an absent transaction', () => {
        // Given the optimistic transaction has not arrived yet
        const transaction = undefined;
        // When a field reads its date
        const result = dateStateSelector(transaction);
        // Then the missing transaction remains distinguishable from an empty date
        expect(result).toBeUndefined();
    });
});
