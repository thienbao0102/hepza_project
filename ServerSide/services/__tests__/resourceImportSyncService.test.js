const createMockQuery = (doc) => ({
    session: jest.fn().mockResolvedValue(doc),
});

const createMockModel = () => {
    const MockModel = jest.fn().mockImplementation(function (data) {
        Object.assign(this, data || {});
        this.save = jest.fn().mockResolvedValue(this);
    });
    MockModel.findById = jest.fn().mockReturnValue(createMockQuery(null));
    return MockModel;
};

jest.mock('../../models/inputResourcesModel', () => createMockModel());
jest.mock('../../models/fuelResourcesModel', () => createMockModel());
jest.mock('../../models/wasteResourcesModel', () => createMockModel());

jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    getListData: jest.fn().mockResolvedValue([]),
}));

jest.mock('../versionManagerService', () => ({
    commitTransaction: jest.fn().mockResolvedValue(),
    computeDiff: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/resourceHelpers', () => ({
    capitalizeFirst: jest.fn((s) => s),
    normalizeString: jest.fn((s) => s),
    pickChangedFields: jest.fn(() => ({ oldData: {}, newData: {} })),
}));

const InputResourceModel = require('../../models/inputResourcesModel');
const FuelResourceModel = require('../../models/fuelResourcesModel');
const WasteResourceModel = require('../../models/wasteResourcesModel');
const resoureceAndWasteRepository = require('../../dataAccess/resoureceAndWasteRepository');
const { commitTransaction, computeDiff } = require('../versionManagerService');
const { pickChangedFields } = require('../../utils/resourceHelpers');

const { processImportResourceData } = require('../resourceImportSyncService');

function mockFindById(Model, doc) {
    Model.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(doc) });
}

describe('resourceImportSyncService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resoureceAndWasteRepository.getListData.mockResolvedValue([]);
        commitTransaction.mockResolvedValue();
        computeDiff.mockReturnValue(true);
        pickChangedFields.mockReturnValue({ oldData: {}, newData: {} });
    });

    test('returns success with empty data', async () => {
        const result = await processImportResourceData({}, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.total).toBe(0);
    });

    test('creates new material items', async () => {
        const data = {
            material: [{ name: 'Steel', quantity: 10, unit: 'Tấn', sub_group: 'MET' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.material.added).toBe(1);
        expect(result.summary.added).toBe(1);
        expect(commitTransaction).toHaveBeenCalled();
    });

    test('updates existing material when match found', async () => {
        const existing = [{ _id: 'E1', name: 'Steel', quantity: 5, unit: 'Tấn', sub_group: 'MET', main_group: 'material' }];
        resoureceAndWasteRepository.getListData.mockImplementation((query, type) => {
            if (type === 'InputResource' && query.main_group === 'material') return Promise.resolve(existing);
            return Promise.resolve([]);
        });
        const existingDoc = { save: jest.fn().mockResolvedValue() };
        mockFindById(InputResourceModel, existingDoc);
        computeDiff.mockReturnValue(true);
        const data = {
            material: [{ name: 'Steel', quantity: 10, unit: 'Tấn', sub_group: 'MET' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.material.updated).toBe(1);
    });

    test('skips unchanged material', async () => {
        const existing = [{ _id: 'E1', name: 'Steel', quantity: 10, unit: 'Tấn', sub_group: 'MET', main_group: 'material' }];
        resoureceAndWasteRepository.getListData.mockImplementation((query, type) => {
            if (type === 'InputResource' && query.main_group === 'material') return Promise.resolve(existing);
            return Promise.resolve([]);
        });
        computeDiff.mockReturnValue(null);
        const data = {
            material: [{ name: 'Steel', quantity: 10, unit: 'Tấn', sub_group: 'MET' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.material.skipped).toBe(1);
    });

    test('creates new chemical items', async () => {
        const data = {
            chemical: [{ name: 'Axit', quantity: 2, unit: 'Kg' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.chemical.added).toBe(1);
    });

    test('creates electricity fuel items', async () => {
        const data = {
            el: [{ name: 'Điện lưới', quantity: 100, unit: 'kWh', sub_group: 'Grid' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.el.added).toBe(1);
    });

    test('creates water fuel items with detail', async () => {
        const data = {
            wa: [{ name: 'Nước máy', quantity: 20, unit: 'm³' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.wa.added).toBe(1);
    });

    test('creates combustion fuel items', async () => {
        const data = {
            co: [{ name: 'Dầu DO', quantity: 5, unit: 'Lít' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.co.added).toBe(1);
    });

    test('creates waste items', async () => {
        const data = {
            waste: [{ name: 'Rác', quantity: 3, sub_group: 'DO', codeWaste: 'CW1', status: 'active' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.waste.added).toBe(1);
    });

    test('handles GASW waste unit', async () => {
        const data = {
            waste: [{ name: 'Khí thải', quantity: 2, sub_group: 'GASW' }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
    });

    test('does not commit when no changes', async () => {
        const data = { material: [] };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(commitTransaction).not.toHaveBeenCalled();
    });

    test('handles save error gracefully', async () => {
        InputResourceModel.mockImplementationOnce(function (data) {
            Object.assign(this, data || {});
            this.save = jest.fn().mockRejectedValue(new Error('DB error'));
        });
        const data = {
            material: [{ name: 'Steel', quantity: 10 }],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.material.added).toBe(0);
    });

    test('skips unchanged fuel', async () => {
        const existing = [{ _id: 'E1', fuelName: 'Điện lưới', quantity: 100, unit: 'kWh', sub_group: 'Grid', main_group: 'el' }];
        resoureceAndWasteRepository.getListData.mockImplementation((query, type) => {
            if (type === 'FuelResource' && query.main_group === 'el') return Promise.resolve(existing);
            return Promise.resolve([]);
        });
        computeDiff.mockReturnValue(null);
        const data = { el: [{ name: 'Điện lưới', quantity: 100, unit: 'kWh', sub_group: 'Grid' }] };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.el.skipped).toBe(1);
    });

    test('skips unchanged waste', async () => {
        const existing = [{ _id: 'E1', wasteName: 'Rác', quantity: 3, unit: 'Tấn', main_group: 'DO', codeWaste: 'CW1', status: 'active' }];
        resoureceAndWasteRepository.getListData.mockImplementation((query, type) => {
            if (type === 'WasteResource') return Promise.resolve(existing);
            return Promise.resolve([]);
        });
        computeDiff.mockReturnValue(null);
        const data = { waste: [{ name: 'Rác', quantity: 3, sub_group: 'DO', codeWaste: 'CW1', status: 'active' }] };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.waste.skipped).toBe(1);
    });

    test('handles fuel save error gracefully', async () => {
        FuelResourceModel.mockImplementationOnce(function (data) {
            Object.assign(this, data || {});
            this.save = jest.fn().mockRejectedValue(new Error('DB error'));
        });
        const data = { el: [{ name: 'Điện lưới', quantity: 100 }] };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.el.added).toBe(0);
    });

    test('handles waste save error gracefully', async () => {
        WasteResourceModel.mockImplementationOnce(function (data) {
            Object.assign(this, data || {});
            this.save = jest.fn().mockRejectedValue(new Error('DB error'));
        });
        const data = { waste: [{ name: 'Rác', quantity: 3 }] };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.waste.added).toBe(0);
    });

    test('handles critical error and returns failure', async () => {
        resoureceAndWasteRepository.getListData.mockRejectedValue(new Error('DB connection lost'));
        const result = await processImportResourceData({}, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(false);
        expect(result.message).toBe('DB connection lost');
    });

    test('skips invalid/empty arrays', async () => {
        const data = { material: null, chemical: [], el: undefined };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.total).toBe(0);
    });

    test('handles toNumber edge cases', async () => {
        const data = {
            material: [
                { name: 'A', quantity: 'invalid' },
                { name: 'B', quantity: null },
                { name: 'C', quantity: Infinity },
            ],
        };
        const result = await processImportResourceData(data, 'C01', 'Z01', '2024-01', null, 'U001');
        expect(result.isSuccess).toBe(true);
        expect(result.summary.byType.material.added).toBe(3);
    });
});
