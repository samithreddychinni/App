/** Covers the report-selection totals request contract without inventing a backend aggregation result. */
import {renderHook} from '@testing-library/react-native';

import useSearchShouldCalculateTotals, {getSearchRequestOffsetForMissingAllMatchingCount} from '@hooks/useSearchShouldCalculateTotals';

import CONST from '@src/CONST';

jest.mock('@hooks/useOnyx', () => () => [undefined]);

describe('All matching report totals', () => {
    it('requires authoritative totals for an all-matching report selection', () => {
        // Given unloaded matching reports cannot be summed from the current page
        const allMatching = true;
        // When report totals are requested at the initial offset
        const {result} = renderHook(() => useSearchShouldCalculateTotals(CONST.SEARCH.SEARCH_KEYS.REPORTS, true, allMatching));
        // Then the request asks the server for the full total
        expect(result.current).toBe(true);
    });

    it('does not recalculate full totals on a later page after they have arrived', () => {
        // Given the caller already has the authoritative selection total
        const enabled = false;
        // When loading another page of matching reports
        const {result} = renderHook(() => useSearchShouldCalculateTotals(CONST.SEARCH.SEARCH_KEYS.REPORTS, enabled, true));
        // Then no page subtotal should replace the selection's full total
        expect(result.current).toBe(false);
        expect(getSearchRequestOffsetForMissingAllMatchingCount(100, 50, false)).toBe(100);
    });
});
