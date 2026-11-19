import {shouldShowTableDisplaySettingsTrigger} from '@components/Table/TableFilterBar/TableDisplaySettingsTrigger';

jest.mock('@expensify/react-native-hybrid-app', () => ({
    __esModule: true,
    default: {
        isHybridApp: jest.fn(() => false),
    },
}));

describe('shouldShowTableDisplaySettingsTrigger', () => {
    it('returns true when at least one column is sortable', () => {
        expect(
            shouldShowTableDisplaySettingsTrigger({
                columns: [
                    {key: 'name', label: 'Name', sortable: true},
                    {key: 'actions', label: 'Actions', sortable: false},
                ],
            }),
        ).toBe(true);
    });

    it('returns false when no columns are sortable', () => {
        expect(
            shouldShowTableDisplaySettingsTrigger({
                columns: [
                    {key: 'name', label: 'Name', sortable: false},
                    {key: 'actions', label: 'Actions', sortable: false},
                ],
            }),
        ).toBe(false);
    });
});
