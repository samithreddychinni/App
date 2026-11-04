/** Duplicate tag-list labels are valid; orderWeight identifies the list rather than its displayed name. */
import {getTagListEntryByOrderWeight} from '@libs/PolicyUtils/tag';

import type {PolicyTagLists} from '@src/types/onyx';

describe('Imported independent tag-list identity', () => {
    it('selects the second duplicate without mixing its tags with the first', () => {
        // Given a no-header import with adjacent GL-code columns produced duplicate display names
        const glCode = 'GL Code';
        const firstListKey = 'Sub-projects';
        const secondListKey = 'Sub-projects_2';
        const lists: PolicyTagLists = {
            Clients: {name: 'Clients', orderWeight: 0, required: false, tags: {Acme: {name: 'Acme', enabled: true, [glCode]: '100'}}},
            [firstListKey]: {name: 'Sub-projects', orderWeight: 1, required: false, tags: {First: {name: 'First', enabled: true, [glCode]: '200'}}},
            [secondListKey]: {name: 'Sub-projects', orderWeight: 2, required: false, tags: {Second: {name: 'Second', enabled: true, [glCode]: '300'}}},
        };
        // When the user opens the third visible row
        const entry = getTagListEntryByOrderWeight(lists, 2);
        // Then both the Onyx key and the tags belong to the third list even though its label repeats
        expect(entry?.[0]).toBe('Sub-projects_2');
        expect(entry?.[1].tags).toEqual({Second: {name: 'Second', enabled: true, [glCode]: '300'}});
        expect(getTagListEntryByOrderWeight(lists, 1)?.[0]).toBe('Sub-projects');
        expect(getTagListEntryByOrderWeight(lists, 3)).toBeUndefined();
    });
});
