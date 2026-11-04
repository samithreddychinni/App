/** Weekly offsets must not become monthly dates while a submission schedule is being edited. */
import {renderHook} from '@testing-library/react-native';

import useSubmissionFrequencyDraft from '@pages/workspace/workflows/useSubmissionFrequencyDraft';

import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';

import createMock from '../utils/createMock';

let mockDraft: {frequency?: string; offset?: string} = {};
jest.mock('@hooks/useOnyx', () => () => [mockDraft]);

describe('Monthly submission draft', () => {
    it('starts at day one when switching from a weekly Sunday offset', () => {
        // Given Sunday is also a valid number for a day of the month
        const policy = createMock<Policy>({autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.WEEKLY, autoReportingOffset: 7, harvesting: {enabled: true}});
        mockDraft = {frequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY, offset: ''};
        // When the draft changes frequency before saving
        const {result, rerender} = renderHook(() => useSubmissionFrequencyDraft(policy));
        // Then the previous weekday is discarded, and a newly chosen monthly day is retained
        expect(result.current.offset).toBe(1);
        expect(result.current.hasChanges).toBe(true);
        mockDraft = {...mockDraft, offset: '15'};
        rerender({});
        expect(result.current.offset).toBe(15);
    });

    it('keeps the saved monthly date when the frequency has not changed', () => {
        // Given an existing monthly schedule with no draft edits
        const policy = createMock<Policy>({autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY, autoReportingOffset: 15, harvesting: {enabled: true}});
        mockDraft = {};
        // When the frequency page opens again
        const {result} = renderHook(() => useSubmissionFrequencyDraft(policy));
        // Then it does not replace the date or save an unchanged schedule
        expect(result.current.offset).toBe(15);
        expect(result.current.hasChanges).toBe(false);
    });
});
