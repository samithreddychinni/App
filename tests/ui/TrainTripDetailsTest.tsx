import {render, screen} from '@testing-library/react-native';

import TrainTripDetails from '@pages/Travel/TrainTripDetails';

import CONST from '@src/CONST';
import type {Reservation} from '@src/types/onyx/Transaction';

import React from 'react';

jest.mock('@hooks/useScreenWrapperTransitionStatus', () => ({
    __esModule: true,
    default: () => ({
        didScreenTransitionEnd: true,
    }),
}));

const mockTrainReservation: Reservation = {
    company: {
        shortName: 'Amtrak',
        phone: '',
        longName: 'Amtrak',
    },
    start: {
        date: '2026-12-14T10:00:00Z',
        shortName: 'NYP',
        longName: 'New York Penn Station',
        cityName: 'New York, NY, USA',
    },
    end: {
        date: '2026-12-14T14:00:00Z',
        shortName: 'BOS',
        longName: 'Boston South Station',
        cityName: 'Boston, MA, USA',
    },
    route: {
        name: 'Acela 2150',
    },
    confirmations: [
        {
            name: 'Confirmation Number',
            value: 'TRAIN123',
        },
    ],
    type: CONST.RESERVATION_TYPE.TRAIN,
    travelerPersonalInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
    },
};

describe('TrainTripDetailsTest', () => {
    it('renders the train trip date with weekday and 4-digit year', () => {
        render(
            <TrainTripDetails
                reservation={mockTrainReservation}
                personalDetails={null}
            />,
        );

        expect(screen.getByText('Monday, December 14, 2026')).toBeOnTheScreen();
    });
});
