jest.mock('../../models/emissionModel', () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
}));

const emissionModel = require('../../models/emissionModel');
const emissionRepository = require('../emissionRepository');

describe('insertEmission strict model compatibility', () => {
    beforeEach(() => jest.clearAllMocks());

    test('upserts by emission_name + company_id + zone_id + periodKey only (no main_group/sub_group)', async () => {
        emissionModel.findOne.mockReturnValue({
            session: () => Promise.resolve(null),
        });
        emissionModel.create.mockResolvedValue([{ emission_id: 'EM001' }]);

        await emissionRepository.insertEmission(
            'Dầu DO',
            1.23,
            'C001',
            'Z001',
            202603,
            null
        );

        // findOne should NOT include main_group or sub_group
        const findOneArg = emissionModel.findOne.mock.calls[0][0];
        expect(findOneArg).toEqual({
            emission_name: 'CO2 từ Dầu DO',
            company_id: 'C001',
            zone_id: 'Z001',
            periodKey: 202603,
        });
        expect(findOneArg).not.toHaveProperty('main_group');
        expect(findOneArg).not.toHaveProperty('sub_group');

        // create should NOT include main_group or sub_group
        const createArg = emissionModel.create.mock.calls[0][0][0];
        expect(createArg).toEqual({
            emission_name: 'CO2 từ Dầu DO',
            quantity: 1.23,
            company_id: 'C001',
            zone_id: 'Z001',
            periodKey: 202603,
            unit: 'Tấn CO₂tđ',
        });
        expect(createArg).not.toHaveProperty('main_group');
        expect(createArg).not.toHaveProperty('sub_group');
    });
});
