const inputResourcesModel = require('../../models/inputResourcesModel');
const fuelResourcesModel = require('../../models/fuelResourcesModel');
const wasteResourcesModel = require('../../models/wasteResourcesModel');

const makeQuery = () => ({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });

jest.mock('../../models/inputResourcesModel', () => ({
    findById: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }) }),
    countDocuments: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(0) }),
    create: jest.fn().mockResolvedValue([{ _id: 'D1', toObject: jest.fn().mockReturnValue({ _id: 'D1' }) }]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
}));

jest.mock('../../models/fuelResourcesModel', () => ({
    findById: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }) }),
    countDocuments: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(0) }),
    create: jest.fn().mockResolvedValue([{ _id: 'D2', toObject: jest.fn().mockReturnValue({ _id: 'D2' }) }]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
}));

jest.mock('../../models/wasteResourcesModel', () => ({
    findById: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }) }),
    countDocuments: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(0) }),
    create: jest.fn().mockResolvedValue([{ _id: 'D3', toObject: jest.fn().mockReturnValue({ _id: 'D3' }) }]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
}));

jest.mock('../../utils/resourceHelpers', () => ({
    capitalizeFirst: jest.fn((s) => s),
}));

const {
    insertInputResource,
    insertFuelResource,
    insertWasteResource,
    getListData,
    checkMonthHasData,
    deleteSoftResourceAndWaste,
    deleteHardResourceAndWaste,
    restoreResourceAndWaste,
    findExistingInputResource,
    findExistingFuelResource,
    findExistingWasteResource,
} = require('../resoureceAndWasteRepository');

function mockDoc(Model, overrides = {}) {
    const doc = {
        _id: 'EX1',
        toObject: jest.fn().mockReturnValue({ _id: 'EX1' }),
        set: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue(),
        ...overrides,
    };
    Model.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(doc) });
    return doc;
}

describe('resoureceAndWasteRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        inputResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) });
        fuelResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) });
        wasteResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null), lean: jest.fn().mockResolvedValue(null) });
    });

    describe('insertInputResource', () => {
        test('creates new input resource', async () => {
            const result = await insertInputResource({ label: 'Steel', value: 10, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'material', 'MET', null);
            expect(result.actionType).toBe('create');
            expect(inputResourcesModel.create).toHaveBeenCalled();
        });

        test('updates existing input resource by _id', async () => {
            const doc = mockDoc(inputResourcesModel, { name: 'Steel' });
            const result = await insertInputResource({ _id: 'EX1', label: 'Steel', value: 20, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'material', 'MET', null);
            expect(result.actionType).toBe('update');
            expect(doc.save).toHaveBeenCalled();
        });

        test('updates existing input resource by name match', async () => {
            const doc = { _id: 'EX2', toObject: jest.fn().mockReturnValue({ _id: 'EX2' }), set: jest.fn().mockReturnThis(), save: jest.fn().mockResolvedValue() };
            inputResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(doc) });
            const result = await insertInputResource({ label: 'Steel', value: 15, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'material', 'MET', null);
            expect(result.actionType).toBe('update');
        });
    });

    describe('insertFuelResource', () => {
        test('creates new fuel resource', async () => {
            const result = await insertFuelResource({ label: 'Điện', value: 100, unit: 'kWh' }, 'C01', 'Z01', '2024-01', 'el', 'Grid', null);
            expect(result.actionType).toBe('create');
            expect(fuelResourcesModel.create).toHaveBeenCalled();
        });

        test('updates existing fuel resource', async () => {
            const doc = { _id: 'F1', toObject: jest.fn().mockReturnValue({ _id: 'F1' }), save: jest.fn().mockResolvedValue(), fuelName: 'Điện' };
            fuelResourcesModel.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(doc) });
            const result = await insertFuelResource({ _id: 'F1', label: 'Điện', value: 200, unit: 'kWh' }, 'C01', 'Z01', '2024-01', 'el', 'Grid', null);
            expect(result.actionType).toBe('update');
            expect(doc.save).toHaveBeenCalled();
        });
    });

    describe('insertWasteResource', () => {
        test('creates new waste resource', async () => {
            const result = await insertWasteResource({ label: 'Rác', value: 5, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'DO', null);
            expect(result.actionType).toBe('create');
            expect(wasteResourcesModel.create).toHaveBeenCalled();
        });

        test('updates existing waste resource', async () => {
            const doc = { _id: 'W1', toObject: jest.fn().mockReturnValue({ _id: 'W1' }), set: jest.fn().mockReturnThis(), save: jest.fn().mockResolvedValue(), main_group: 'DO' };
            wasteResourcesModel.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(doc) });
            const result = await insertWasteResource({ _id: 'W1', label: 'Rác', value: 10 }, 'C01', 'Z01', '2024-01', 'DO', null);
            expect(result.actionType).toBe('update');
            expect(doc.save).toHaveBeenCalled();
        });
    });

    function makeQuery(result = []) {
        const q = { lean: jest.fn().mockResolvedValue(result) };
        q.session = jest.fn().mockReturnValue(q);
        return q;
    }

    describe('getListData', () => {
        test('returns InputResource data', async () => {
            inputResourcesModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue(makeQuery([{ _id: 1 }])) });
            const result = await getListData({ company_id: 'C01' }, 'InputResource', null);
            expect(result).toEqual([{ _id: 1 }]);
        });

        test('returns FuelResource data sorted', async () => {
            fuelResourcesModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue(makeQuery([{ _id: 2, createdAt: new Date('2024-01-01') }])) });
            const result = await getListData({ company_id: 'C01' }, 'FuelResource', null);
            expect(result).toHaveLength(1);
        });

        test('returns WasteResource data', async () => {
            wasteResourcesModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue(makeQuery([{ _id: 3 }])) });
            const result = await getListData({ company_id: 'C01' }, 'WasteResource', null);
            expect(result).toEqual([{ _id: 3 }]);
        });

        test('returns empty array for unknown model', async () => {
            const result = await getListData({}, 'Unknown');
            expect(result).toEqual([]);
        });
    });

    describe('checkMonthHasData', () => {
        test('returns true when data exists', async () => {
            inputResourcesModel.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(1) });
            const result = await checkMonthHasData('C01', 'Z01', '2024-01', null);
            expect(result).toBe(true);
        });

        test('returns false when no data', async () => {
            inputResourcesModel.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(0) });
            fuelResourcesModel.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(0) });
            wasteResourcesModel.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(0) });
            const result = await checkMonthHasData('C01', 'Z01', '2024-01', null);
            expect(result).toBe(false);
        });
    });

    describe('bulk operations', () => {
        test('soft delete', async () => {
            await deleteSoftResourceAndWaste('C01');
            expect(inputResourcesModel.updateMany).toHaveBeenCalled();
            expect(fuelResourcesModel.updateMany).toHaveBeenCalled();
            expect(wasteResourcesModel.updateMany).toHaveBeenCalled();
        });

        test('hard delete', async () => {
            await deleteHardResourceAndWaste('C01');
            expect(inputResourcesModel.deleteMany).toHaveBeenCalled();
            expect(fuelResourcesModel.deleteMany).toHaveBeenCalled();
            expect(wasteResourcesModel.deleteMany).toHaveBeenCalled();
        });

        test('restore', async () => {
            await restoreResourceAndWaste('C01');
            expect(inputResourcesModel.updateMany).toHaveBeenCalled();
            expect(fuelResourcesModel.updateMany).toHaveBeenCalled();
            expect(wasteResourcesModel.updateMany).toHaveBeenCalled();
        });
    });

    describe('findExisting helpers', () => {
        test('findExistingInputResource returns true on name match', async () => {
            inputResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ name: 'Steel' }) }) });
            const result = await findExistingInputResource({ label: 'Steel', value: 10, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'material', 'MET', null);
            expect(result).toBe(true);
        });

        test('findExistingInputResource returns false when no match', async () => {
            inputResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
            const result = await findExistingInputResource({ label: 'Steel', value: 10, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'material', 'MET', null);
            expect(result).toBe(false);
        });

        test('findExistingFuelResource returns true on name match', async () => {
            fuelResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ fuelName: 'Điện' }) }) });
            const result = await findExistingFuelResource({ label: 'Điện', value: 100, unit: 'kWh' }, 'C01', 'Z01', '2024-01', 'el', 'Grid', null);
            expect(result).toBe(true);
        });

        test('findExistingWasteResource returns true on name match', async () => {
            wasteResourcesModel.findOne.mockReturnValue({ session: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ wasteName: 'Rác' }) }) });
            const result = await findExistingWasteResource({ label: 'Rác', value: 5, unit: 'Tấn' }, 'C01', 'Z01', '2024-01', 'DO', null);
            expect(result).toBe(true);
        });
    });
});
