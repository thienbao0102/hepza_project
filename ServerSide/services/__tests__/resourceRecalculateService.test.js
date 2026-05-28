jest.mock('../../dataAccess/emissionRepository', () => ({
    insertEmission: jest.fn().mockResolvedValue(),
}));

jest.mock('../../dataAccess/summaryRecordRepository', () => {
    const actual = jest.requireActual('../../dataAccess/summaryRecordRepository');
    return {
        ...actual,
        updateSummaryRecord: jest.fn().mockResolvedValue(),
    };
});

jest.mock('../../models/emissionModel', () => ({
    deleteMany: jest.fn().mockResolvedValue(),
}));

jest.mock('../resourceCrudService', () => ({
    processGetListDataResource: jest.fn(),
}));

jest.mock('../../utils/resourceHelpers', () => ({
    normalizeChemicalUnit: jest.fn((u) => {
        const unit = (u || 'kg').toLowerCase().trim();
        if (unit === 'tấn' || unit === 'tan' || unit === 't' || unit === 'g') return 'kg';
        if (unit === 'lít' || unit === 'litre' || unit === 'l') return 'l';
        if (unit === 'khối' || unit === 'm³' || unit === 'm3') return 'm3';
        return 'kg';
    }),
    calculateCO2Emission: jest.fn().mockReturnValue(10),
    buildCombustionEmissionKey: jest.fn().mockReturnValue('total_co2_from_DO_oil'),
}));

const emissionRepository = require('../../dataAccess/emissionRepository');
const summaryRecordRepository = require('../../dataAccess/summaryRecordRepository');
const emissionModel = require('../../models/emissionModel');
const { processGetListDataResource } = require('../resourceCrudService');
const { normalizeChemicalUnit, calculateCO2Emission, buildCombustionEmissionKey } = require('../../utils/resourceHelpers');

const { recalculateSummaryRecord } = require('../resourceRecalculateService');

describe('resourceRecalculateService', () => {
    beforeEach(() => jest.clearAllMocks());

    test('recalculates InputResource materials with known subgroup', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'material', sub_group: 'MET', quantity: 5 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_materials.total_materials_MET).toBe(5);
        expect(summary.input_materials.total_materials).toBe(5);
    });

    test('recalculates InputResource materials with unknown subgroup fallback to MOTH', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'material', sub_group: 'UNKNOWN', quantity: 3 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_materials.total_materials_MOTH).toBe(3);
        expect(summary.input_materials.total_materials).toBe(3);
    });

    test('recalculates InputResource chemicals with kg unit and tấn raw unit', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'chemical', sub_group: 'ACD', quantity: 2, unit: 'Tấn' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_chemicals.total_chemicals_ACD_kg).toBe(2);
        expect(summary.input_chemicals.total_chemicals_kg).toBe(2);
        expect(summary.input_chemicals.unit_chemical_kg).toBe('Tấn');
    });

    test('recalculates InputResource chemicals with l unit', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'chemical', sub_group: 'BAS', quantity: 4, unit: 'L' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_chemicals.total_chemicals_BAS_l).toBe(4);
        expect(summary.input_chemicals.total_chemicals_l).toBe(4);
    });

    test('recalculates InputResource chemicals with m3 unit', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'chemical', sub_group: 'SOL', quantity: 6, unit: 'm3' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_chemicals.total_chemicals_SOL_m3).toBe(6);
        expect(summary.input_chemicals.total_chemicals_m3).toBe(6);
    });

    test('recalculates InputResource chemicals fallback to CHOT', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'chemical', sub_group: 'UNKNOWN', quantity: 1, unit: 'kg' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_chemicals.total_chemicals_CHOT_kg).toBe(1);
    });

    test('recalculates FuelResource electricity grid', async () => {
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'el', sub_group: 'Grid', quantity: 100, fuelName: 'Điện lưới', unit: 'kWh' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.fuels.total_electricity_grid).toBe(100);
        expect(summary.fuels.total_electricity).toBe(100);
        expect(summary.emissions.total_co2_from_grid_electricity).toBe(10);
        expect(summary.emissions.total_co2).toBe(10);
        expect(emissionRepository.insertEmission).toHaveBeenCalled();
    });

    test('recalculates FuelResource electricity renewable', async () => {
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'el', sub_group: 'Renewable', quantity: 50, fuelName: 'Điện mặt trờ', unit: 'kWh' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.fuels.total_electricity_renewable).toBe(50);
        expect(summary.fuels.total_electricity).toBe(50);
    });

    test('recalculates FuelResource water', async () => {
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'wa', sub_group: 'tap', quantity: 20, fuelName: 'Nước máy', unit: 'm3' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.fuels.total_water_tap).toBe(20);
        expect(summary.fuels.total_water).toBe(20);
        expect(summary.emissions.total_co2_from_water).toBe(10);
    });

    test('recalculates FuelResource combustion with known emission key', async () => {
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'co', sub_group: 'COL', quantity: 30, fuelName: 'Than', unit: 'tấn' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.fuels.total_combustion_COL).toBe(30);
        expect(summary.fuels.total_combustion).toBe(30);
        expect(summary.emissions.total_co2_from_DO_oil).toBe(10);
        expect(summary.emissions.total_co2).toBe(10);
    });

    test('recalculates FuelResource combustion with null emission key', async () => {
        buildCombustionEmissionKey.mockReturnValueOnce(null);
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'co', sub_group: 'COL', quantity: 30, fuelName: 'Than', unit: 'tấn' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.emissions.total_co2).toBe(10);
        expect(summary.emissions.total_co2_from_DO_oil).toBe(0);
    });

    test('recalculates WasteResource DO', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'DO', quantity: 5 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_DO).toBe(5);
        expect(summary.waste.total_waste_tan).toBe(5);
    });

    test('recalculates WasteResource IND', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'IND', quantity: 7 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_IND).toBe(7);
    });

    test('recalculates WasteResource HA', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'HA', quantity: 3 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_HA).toBe(3);
    });

    test('recalculates WasteResource WWA', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'WWA', quantity: 8 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_WWA).toBe(8);
        expect(summary.waste.total_waste_m3).toBe(8);
    });

    test('recalculates WasteResource GASW', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'GASW', quantity: 2 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_GASW).toBe(2);
        expect(summary.waste.unit_gas_waste).toBe('mg/l');
    });

    test('recalculates WasteResource with mapped group', async () => {
        processGetListDataResource.mockResolvedValue({
            WasteResource: [{ main_group: 'chất thải sinh hoạt', quantity: 4 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.waste.total_waste_DO).toBe(4);
    });

    test('skips items with zero or negative quantity', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [
                { main_group: 'material', sub_group: 'MET', quantity: 0 },
                { main_group: 'material', sub_group: 'MET', quantity: -1 },
            ],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        const summary = summaryRecordRepository.updateSummaryRecord.mock.calls[0][3];
        expect(summary.input_materials.total_materials).toBe(0);
    });

    test('inserts emissions and deletes stale ones', async () => {
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'el', sub_group: 'Grid', quantity: 100, fuelName: 'Điện', unit: 'kWh' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        expect(emissionRepository.insertEmission).toHaveBeenCalledWith('Điện', 10, 'C01', 'Z01', '2024-01', null);
        expect(emissionModel.deleteMany).toHaveBeenCalledWith(
            { company_id: 'C01', zone_id: 'Z01', periodKey: '2024-01', emission_name: { $nin: ['CO2 từ Điện'] } },
            { session: null }
        );
    });

    test('does not delete emissions when no emissions produced', async () => {
        processGetListDataResource.mockResolvedValue({
            InputResource: [{ main_group: 'material', sub_group: 'MET', quantity: 5 }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', null);
        expect(emissionModel.deleteMany).not.toHaveBeenCalled();
    });

    test('passes session through', async () => {
        const session = { id: 'sess1' };
        processGetListDataResource.mockResolvedValue({
            FuelResource: [{ main_group: 'el', sub_group: 'Grid', quantity: 10, fuelName: 'Điện', unit: 'kWh' }],
        });
        await recalculateSummaryRecord('C01', 'Z01', 'admin', '2024-01', session);
        expect(processGetListDataResource).toHaveBeenCalledWith('2024-01', null, [1, 2, 3, 4, 5, 6], 'admin', 'C01', 'Z01', true, session);
        expect(summaryRecordRepository.updateSummaryRecord).toHaveBeenCalledWith('C01', 'Z01', '2024-01', expect.any(Object), session);
        expect(emissionRepository.insertEmission).toHaveBeenCalledWith(expect.any(String), expect.any(Number), 'C01', 'Z01', '2024-01', session);
    });
});
