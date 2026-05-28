jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    insertInputResource: jest.fn().mockResolvedValue({ doc: { _id: 'D1' }, oldObj: {}, newObj: {}, actionType: 'create' }),
    insertFuelResource: jest.fn().mockResolvedValue({ doc: { _id: 'D2' }, oldObj: {}, newObj: {}, actionType: 'create' }),
    insertWasteResource: jest.fn().mockResolvedValue({ doc: { _id: 'D3' }, oldObj: {}, newObj: {}, actionType: 'create' }),
}));

jest.mock('../../dataAccess/emissionRepository', () => ({
    insertEmission: jest.fn().mockResolvedValue(),
}));

jest.mock('../../utils/abbreviationInMemory', () => ({
    getCode: jest.fn((name) => {
        const map = {
            'Nguyên vật liệu': 'material',
            'Hóa chất': 'chemical',
            'Điện': 'el',
            'Nước': 'wa',
            'Chất đốt & Nhiên liệu': 'co',
            'Chất thải': 'waste',
        };
        return map[name] || name;
    }),
}));

jest.mock('../../utils/resourceHelpers', () => ({
    normalizeString: jest.fn((s) => s),
    pickChangedFields: jest.fn(() => ({ oldData: {}, newData: {} })),
    calculateCO2Emission: jest.fn().mockReturnValue(5),
    groupWaterData: jest.fn((data) => data),
    normalizeChemicalUnit: jest.fn().mockReturnValue('kg'),
    mapToSubGroup: jest.fn((main, sub) => sub || main),
    buildCombustionEmissionKey: jest.fn().mockReturnValue('total_co2_from_DO_oil'),
}));

const resoureceAndWasteRepository = require('../../dataAccess/resoureceAndWasteRepository');
const emissionRepository = require('../../dataAccess/emissionRepository');
const { calculateCO2Emission, mapToSubGroup, groupWaterData, normalizeChemicalUnit, buildCombustionEmissionKey } = require('../../utils/resourceHelpers');

const { processSection } = require('../resourceSectionProcessor');

function createCtx(overrides = {}) {
    return {
        company_id: 'C01',
        zone_id: 'Z01',
        periodKey: '2024-01',
        session: null,
        summaryData: {
            input_materials: { total_materials_MET: 0, total_materials_MOTH: 0, total_materials: 0 },
            input_chemicals: { total_chemicals_ACD_kg: 0, total_chemicals_kg: 0, total_chemicals_l: 0, total_chemicals_m3: 0 },
            fuels: {
                total_electricity: 0, total_electricity_grid: 0, total_electricity_renewable: 0,
                total_water: 0, total_water_tap: 0,
                total_combustion: 0, total_combustion_COL: 0,
            },
            emissions: {
                total_co2: 0, total_co2_from_grid_electricity: 0,
                total_co2_from_water: 0, total_co2_from_DO_oil: 0,
            },
            waste: {
                total_waste_tan: 0, total_waste_DO: 0, total_waste_IND: 0,
                total_waste_HA: 0, total_waste_m3: 0, total_waste_WWA: 0,
                total_waste_GASW: 0, unit_gas_waste: '',
            },
        },
        txChanges: [],
        monthHasData: false,
        createdFuelIds: [],
        createdWasteIds: [],
        ...overrides,
    };
}

describe('resourceSectionProcessor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resoureceAndWasteRepository.insertInputResource.mockResolvedValue({ doc: { _id: 'D1' }, oldObj: {}, newObj: {}, actionType: 'create' });
        resoureceAndWasteRepository.insertFuelResource.mockResolvedValue({ doc: { _id: 'D2' }, oldObj: {}, newObj: {}, actionType: 'create' });
        resoureceAndWasteRepository.insertWasteResource.mockResolvedValue({ doc: { _id: 'D3' }, oldObj: {}, newObj: {}, actionType: 'create' });
        calculateCO2Emission.mockReturnValue(5);
        mapToSubGroup.mockImplementation((main, sub) => sub || main);
        normalizeChemicalUnit.mockReturnValue('kg');
        buildCombustionEmissionKey.mockReturnValue('total_co2_from_DO_oil');
    });

    test('returns early when rawData is falsy', async () => {
        const ctx = createCtx();
        await processSection('Nguyên vật liệu', null, ctx);
        expect(resoureceAndWasteRepository.insertInputResource).not.toHaveBeenCalled();
    });

    test('returns early when sectionName unknown', async () => {
        const ctx = createCtx();
        await processSection('Unknown', { a: [] }, ctx);
        expect(resoureceAndWasteRepository.insertInputResource).not.toHaveBeenCalled();
    });

    describe('Nguyên vật liệu (materials)', () => {
        test('processes items and updates summary', async () => {
            const ctx = createCtx();
            await processSection('Nguyên vật liệu', { 'Kim loại': [{ value: 10, label: 'Steel' }] }, ctx);
            expect(resoureceAndWasteRepository.insertInputResource).toHaveBeenCalled();
            expect(ctx.summaryData.input_materials.total_materials).toBe(10);
        });

        test('skips items with zero value and no _id', async () => {
            const ctx = createCtx();
            await processSection('Nguyên vật liệu', { 'Kim loại': [{ value: 0 }] }, ctx);
            expect(resoureceAndWasteRepository.insertInputResource).not.toHaveBeenCalled();
        });

        test('processes items with zero value when _id present', async () => {
            const ctx = createCtx();
            await processSection('Nguyên vật liệu', { 'Kim loại': [{ value: 0, _id: 'X1' }] }, ctx);
            expect(resoureceAndWasteRepository.insertInputResource).toHaveBeenCalled();
        });

        test('pushes txChanges when monthHasData', async () => {
            const ctx = createCtx({ monthHasData: true });
            await processSection('Nguyên vật liệu', { 'Kim loại': [{ value: 5 }] }, ctx);
            expect(ctx.txChanges).toHaveLength(1);
            expect(ctx.txChanges[0].resourceType).toBe('InputResource');
        });

        test('falls back to MOTH for unknown subgroup', async () => {
            mapToSubGroup.mockReturnValue(null);
            const ctx = createCtx();
            await processSection('Nguyên vật liệu', { 'Other': [{ value: 3 }] }, ctx);
            // mapToSubGroup returns null, so subGroupCode is null
            expect(ctx.summaryData.input_materials.total_materials_MOTH).toBe(3);
        });
    });

    describe('Hóa chất (chemicals)', () => {
        test('processes items with kg unit', async () => {
            normalizeChemicalUnit.mockReturnValue('kg');
            const ctx = createCtx();
            await processSection('Hóa chất', { 'Axit': [{ value: 2, unit: 'Tấn' }] }, ctx);
            expect(ctx.summaryData.input_chemicals.total_chemicals_kg).toBe(2);
        });

        test('processes items with l unit', async () => {
            normalizeChemicalUnit.mockReturnValue('l');
            const ctx = createCtx();
            await processSection('Hóa chất', { 'Dung môi': [{ value: 4, unit: 'L' }] }, ctx);
            expect(ctx.summaryData.input_chemicals.total_chemicals_l).toBe(4);
        });

        test('processes items with m3 unit', async () => {
            normalizeChemicalUnit.mockReturnValue('m3');
            const ctx = createCtx();
            await processSection('Hóa chất', { 'Chất lỏng': [{ value: 6, unit: 'm3' }] }, ctx);
            expect(ctx.summaryData.input_chemicals.total_chemicals_m3).toBe(6);
        });

        test('falls back to CHOT for unknown subgroup', async () => {
            normalizeChemicalUnit.mockReturnValue('kg');
            mapToSubGroup.mockReturnValue('UNKNOWN');
            const ctx = createCtx();
            await processSection('Hóa chất', { 'Other': [{ value: 1, unit: 'kg' }] }, ctx);
            expect(ctx.summaryData.input_chemicals.total_chemicals_CHOT_kg).toBe(1);
        });
    });

    describe('Điện (electricity)', () => {
        test('processes Grid electricity with emission', async () => {
            mapToSubGroup.mockReturnValue('Grid');
            const ctx = createCtx();
            await processSection('Điện', { 'Lưới': [{ value: 100, label: 'Điện lưới', unit: 'kWh' }] }, ctx);
            expect(ctx.summaryData.fuels.total_electricity_grid).toBe(100);
            expect(ctx.summaryData.emissions.total_co2_from_grid_electricity).toBe(5);
            expect(emissionRepository.insertEmission).toHaveBeenCalled();
        });

        test('processes Renewable electricity without grid emission', async () => {
            mapToSubGroup.mockReturnValue('Renewable');
            const ctx = createCtx();
            await processSection('Điện', { 'Renewable': [{ value: 50, label: 'Điện mặt trời', unit: 'kWh' }] }, ctx);
            expect(ctx.summaryData.fuels.total_electricity_renewable).toBe(50);
            expect(ctx.summaryData.emissions.total_co2_from_grid_electricity).toBe(0);
        });

        test('skips emission when co2 is zero', async () => {
            calculateCO2Emission.mockReturnValue(0);
            const ctx = createCtx();
            await processSection('Điện', { 'Lưới': [{ value: 100, label: 'Điện', unit: 'kWh' }] }, ctx);
            expect(emissionRepository.insertEmission).not.toHaveBeenCalled();
        });

        test('tracks createdFuelIds', async () => {
            const ctx = createCtx();
            await processSection('Điện', { 'Lưới': [{ value: 10, label: 'Điện', unit: 'kWh', sub_group: 'Grid' }] }, ctx);
            expect(ctx.createdFuelIds).toHaveLength(1);
            expect(ctx.createdFuelIds[0].sub_group).toBe('Grid');
        });
    });

    describe('Nước (water)', () => {
        test('processes water with preprocessed data', async () => {
            groupWaterData.mockReturnValue([
                { _id: 'W1', label: 'Nước máy', unit: 'm3', total: 20, note: '' },
            ]);
            mapToSubGroup.mockReturnValue('tap');
            const ctx = createCtx();
            await processSection('Nước', [{ label: 'Nước máy', value: 20, unit: 'm3' }], ctx);
            expect(ctx.summaryData.fuels.total_water_tap).toBe(20);
            expect(ctx.summaryData.emissions.total_co2_from_water).toBe(5);
        });

        test('skips zero value without _id', async () => {
            groupWaterData.mockReturnValue([{ _id: null, label: 'Nước', unit: 'm3', total: 0, note: '' }]);
            const ctx = createCtx();
            await processSection('Nước', [{ value: 0 }], ctx);
            expect(resoureceAndWasteRepository.insertFuelResource).not.toHaveBeenCalled();
        });

        test('tracks createdFuelIds', async () => {
            groupWaterData.mockReturnValue([{ _id: 'W1', label: 'Nước', unit: 'm3', total: 5, note: '' }]);
            mapToSubGroup.mockReturnValue('tap');
            const ctx = createCtx();
            await processSection('Nước', [{ value: 5 }], ctx);
            expect(ctx.createdFuelIds).toHaveLength(1);
        });
    });

    describe('Chất đốt & Nhiên liệu (fuel)', () => {
        test('processes combustion fuel with emission', async () => {
            mapToSubGroup.mockReturnValue('COL');
            const ctx = createCtx();
            await processSection('Chất đốt & Nhiên liệu', { 'Than': [{ value: 30, label: 'Than', unit: 'tấn' }] }, ctx);
            expect(ctx.summaryData.fuels.total_combustion_COL).toBe(30);
            expect(ctx.summaryData.emissions.total_co2_from_DO_oil).toBe(5);
        });

        test('handles null emission key gracefully', async () => {
            buildCombustionEmissionKey.mockReturnValue(null);
            const ctx = createCtx();
            await processSection('Chất đốt & Nhiên liệu', { 'Than': [{ value: 10, label: 'Than', unit: 'tấn' }] }, ctx);
            expect(ctx.summaryData.emissions.total_co2).toBe(5);
        });

        test('tracks createdFuelIds', async () => {
            const ctx = createCtx();
            await processSection('Chất đốt & Nhiên liệu', { 'Dầu': [{ value: 5, label: 'DO', unit: 'l' }] }, ctx);
            expect(ctx.createdFuelIds).toHaveLength(1);
        });
    });

    describe('Chất thải (waste)', () => {
        test('processes DO waste', async () => {
            mapToSubGroup.mockReturnValue('DO');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Sinh hoạt': [{ value: 5, wasteName: 'Rác' }] }, ctx);
            expect(ctx.summaryData.waste.total_waste_DO).toBe(5);
            expect(ctx.summaryData.waste.total_waste_tan).toBe(5);
        });

        test('processes IND waste', async () => {
            mapToSubGroup.mockReturnValue('IND');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Công nghiệp': [{ value: 7 }] }, ctx);
            expect(ctx.summaryData.waste.total_waste_IND).toBe(7);
        });

        test('processes HA waste', async () => {
            mapToSubGroup.mockReturnValue('HA');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Nguy hại': [{ value: 3 }] }, ctx);
            expect(ctx.summaryData.waste.total_waste_HA).toBe(3);
        });

        test('processes WWA waste', async () => {
            mapToSubGroup.mockReturnValue('WWA');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Nước thải': [{ value: 8 }] }, ctx);
            expect(ctx.summaryData.waste.total_waste_WWA).toBe(8);
            expect(ctx.summaryData.waste.total_waste_m3).toBe(8);
        });

        test('processes GASW waste and sets unit', async () => {
            mapToSubGroup.mockReturnValue('GASW');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Khí thải': [{ value: 2 }] }, ctx);
            expect(ctx.summaryData.waste.total_waste_GASW).toBe(2);
            expect(ctx.summaryData.waste.unit_gas_waste).toBe('mg/l');
        });

        test('skips empty categories', async () => {
            const ctx = createCtx();
            await processSection('Chất thải', { 'Sinh hoạt': [] }, ctx);
            expect(resoureceAndWasteRepository.insertWasteResource).not.toHaveBeenCalled();
        });

        test('skips unknown waste category', async () => {
            mapToSubGroup.mockReturnValue(null);
            const ctx = createCtx();
            await processSection('Chất thải', { 'Unknown': [{ value: 1 }] }, ctx);
            expect(resoureceAndWasteRepository.insertWasteResource).not.toHaveBeenCalled();
        });

        test('tracks createdWasteIds', async () => {
            mapToSubGroup.mockReturnValue('DO');
            const ctx = createCtx();
            await processSection('Chất thải', { 'Sinh hoạt': [{ value: 1, wasteName: 'Rác', clientRowId: 'R1' }] }, ctx);
            expect(ctx.createdWasteIds).toHaveLength(1);
            expect(ctx.createdWasteIds[0].source_name).toBe('Rác');
            expect(ctx.createdWasteIds[0].clientRowId).toBe('R1');
        });

        test('pushes txChanges when monthHasData', async () => {
            mapToSubGroup.mockReturnValue('DO');
            const ctx = createCtx({ monthHasData: true });
            await processSection('Chất thải', { 'Sinh hoạt': [{ value: 1 }] }, ctx);
            expect(ctx.txChanges).toHaveLength(1);
        });
    });

    test('empty arrays are skipped', async () => {
        const ctx = createCtx();
        await processSection('Nguyên vật liệu', { 'Kim loại': [] }, ctx);
        expect(resoureceAndWasteRepository.insertInputResource).not.toHaveBeenCalled();
    });
});
