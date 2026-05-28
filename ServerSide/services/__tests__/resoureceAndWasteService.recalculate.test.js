/**
 * Task 5 test: Verify recalculateSummaryRecord writes only
 * new-schema emission fields and never legacy ones.
 */

// Mock ALL external deps so the service module loads
jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    checkMonthHasData: jest.fn(),
    getListData: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../dataAccess/emissionRepository', () => ({
    insertEmission: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../dataAccess/summaryRecordRepository', () => {
    const actual = jest.requireActual('../../dataAccess/summaryRecordRepository');
    return {
        ...actual,
        updateSummaryRecord: jest.fn().mockResolvedValue({}),
        checkSummaryExists: jest.fn(),
    };
});
jest.mock('../../dataAccess/companyRepository', () => ({
    getZoneIdByCompanyId: jest.fn(),
    getCompanyNameById: jest.fn(),
}));
jest.mock('../../dataAccess/industrialZoneRepository', () => ({
    getZoneNameById: jest.fn(),
}));
jest.mock('../../models/resourceVersionModel', () => ({
    find: jest.fn().mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) }),
}));
jest.mock('../../dataAccess/userRepository', () => ({
    getNameByUserId: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/abbreviationInMemory', () => ({
    getCode: jest.fn((name) => name),
    convertUsingGetName: jest.fn((item) => item),
}));
jest.mock('../../services/versionManagerService', () => ({
    commitTransaction: jest.fn(),
}));
jest.mock('../../models/inputResourcesModel', () => ({}));
jest.mock('../../models/fuelResourcesModel', () => ({}));
jest.mock('../../models/wasteResourcesModel', () => ({}));
jest.mock('../../models/emissionModel', () => ({
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
}));

const summaryRecordRepository = require('../../dataAccess/summaryRecordRepository');
const resoureceAndWasteRepository = require('../../dataAccess/resoureceAndWasteRepository');
const { recalculateSummaryRecord } = require('../resoureceAndWasteService');

// Legacy field names that must NOT appear in the emissions object
const LEGACY_EMISSION_FIELDS = [
    'total_co2_from_materials', 'total_co2_from_chemicals',
    'total_co2_from_waste', 'total_co2_from_waste_DO', 'total_co2_from_waste_IND',
    'total_co2_from_waste_HA', 'total_co2_from_waste_GASW',
    'total_co2_from_electricity', 'total_co2_from_electricity_grid', 'total_co2_from_electricity_renewable',
    'total_co2_from_combustion', 'total_co2_from_combustion_CRO', 'total_co2_from_combustion_DOO',
    'total_co2_from_combustion_COL', 'total_co2_from_combustion_BIO',
    'total_co2_from_combustion_PET', 'total_co2_from_combustion_GASF',
    'total_co2_from_water_tap', 'total_co2_from_water_rain',
    'total_co2_from_water_well', 'total_co2_from_water_recycle',
];

describe('recalculateSummaryRecord strict emission fields', () => {
    beforeEach(() => jest.clearAllMocks());

    test('writes only new emission fields for electricity + water + combustion items', async () => {
        // Simulate processGetListDataResource returning fuel items
        resoureceAndWasteRepository.getListData
            .mockResolvedValueOnce([  // InputResource
                { main_group: 'material', sub_group: 'MET', quantity: 100, name: 'Thép' },
            ])
            .mockResolvedValueOnce([  // FuelResource
                { main_group: 'el', sub_group: 'Grid', quantity: 500, fuelName: 'Điện lưới' },
                { main_group: 'wa', sub_group: 'tap', quantity: 200, fuelName: 'Nước máy' },
                { main_group: 'co', sub_group: 'PET', quantity: 100, fuelName: 'Dầu DO' },
            ])
            .mockResolvedValueOnce([]);  // WasteResource

        await recalculateSummaryRecord('C001', 'Z001', 'company', 202603, null);

        // Check what was passed to updateSummaryRecord
        expect(summaryRecordRepository.updateSummaryRecord).toHaveBeenCalledTimes(1);
        const savedSummary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        const emissions = savedSummary.emissions;

        // New fields must be populated
        expect(emissions.total_co2).toBeGreaterThan(0);
        expect(emissions.total_co2_from_grid_electricity).toBeGreaterThan(0);
        expect(emissions.total_co2_from_water).toBeGreaterThan(0);
        expect(emissions.total_co2_from_DO_oil).toBeGreaterThan(0);

        // Legacy fields must NOT exist on the object
        for (const legacyField of LEGACY_EMISSION_FIELDS) {
            expect(emissions).not.toHaveProperty(legacyField);
        }
    });

    test('fuels block does not contain total_fuels', async () => {
        resoureceAndWasteRepository.getListData
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                { main_group: 'el', sub_group: 'Grid', quantity: 100, fuelName: 'Điện lưới' },
            ])
            .mockResolvedValueOnce([]);

        await recalculateSummaryRecord('C001', 'Z001', 'company', 202603, null);

        const savedSummary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(savedSummary.fuels).not.toHaveProperty('total_fuels');
    });
});
