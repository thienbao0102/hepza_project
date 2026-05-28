const emissionModel = require('../../models/emissionModel');

jest.mock('../../models/emissionModel', () => ({
    aggregate: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
    }),
    create: jest.fn().mockResolvedValue([{ _id: 'E1' }]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
}));

const {
    getEmission,
    insertEmission,
    deleteSoftEmission,
    deleteHardEmission,
    restoreEmission,
} = require('../emissionRepository');

describe('emissionRepository', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getEmission calls aggregate with query', async () => {
        await getEmission('C01', 'Z01', 202401, 202412);
        expect(emissionModel.aggregate).toHaveBeenCalled();
        const pipeline = emissionModel.aggregate.mock.calls[0][0];
        expect(pipeline[0].$match.company_id).toBe('C01');
        expect(pipeline[0].$match.zone_id).toBe('Z01');
        expect(pipeline[0].$match.periodKey).toEqual({ $gte: 202401, $lte: 202412 });
    });

    test('getEmission without period keys', async () => {
        await getEmission('C01', 'Z01');
        const pipeline = emissionModel.aggregate.mock.calls[0][0];
        expect(pipeline[0].$match.periodKey).toBeUndefined();
    });

    test('insertEmission creates new when not exists', async () => {
        emissionModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
        await insertEmission('Điện', 10, 'C01', 'Z01', '2024-01', null);
        expect(emissionModel.create).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ emission_name: 'CO2 từ Điện', quantity: 10 })]),
            { session: null }
        );
    });

    test('insertEmission updates existing', async () => {
        const existing = { quantity: 5, save: jest.fn().mockResolvedValue() };
        emissionModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(existing) });
        await insertEmission('Điện', 10, 'C01', 'Z01', '2024-01', null);
        expect(existing.quantity).toBe(10);
        expect(existing.save).toHaveBeenCalledWith({ session: null });
        expect(emissionModel.create).not.toHaveBeenCalled();
    });

    test('insertEmission retries on duplicate emission_id', async () => {
        emissionModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
        const dupError = { code: 11000, keyPattern: { emission_id: 1 } };
        emissionModel.create
            .mockRejectedValueOnce(dupError)
            .mockRejectedValueOnce(dupError)
            .mockResolvedValueOnce([{ _id: 'E1' }]);
        await insertEmission('Điện', 10, 'C01', 'Z01', '2024-01', null);
        expect(emissionModel.create).toHaveBeenCalledTimes(3);
    });

    test('insertEmission throws non-duplicate errors', async () => {
        emissionModel.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
        emissionModel.create.mockRejectedValue(new Error('DB fail'));
        await expect(insertEmission('Điện', 10, 'C01', 'Z01', '2024-01', null)).rejects.toThrow('DB fail');
    });

    test('deleteSoftEmission with session', async () => {
        const session = { id: 's1' };
        await deleteSoftEmission('C01', session);
        expect(emissionModel.updateMany).toHaveBeenCalledWith(
            expect.any(Object),
            { $set: { isDeleted: true } },
            { session }
        );
    });

    test('deleteSoftEmission without session', async () => {
        await deleteSoftEmission('C01');
        expect(emissionModel.updateMany).toHaveBeenCalledWith(
            expect.any(Object),
            { $set: { isDeleted: true } },
            {}
        );
    });

    test('deleteHardEmission with session', async () => {
        const session = { id: 's1' };
        await deleteHardEmission('C01', session);
        expect(emissionModel.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, { session });
    });

    test('deleteHardEmission without session', async () => {
        await deleteHardEmission('C01');
        expect(emissionModel.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, {});
    });

    test('restoreEmission with session', async () => {
        const session = { id: 's1' };
        await restoreEmission('C01', session);
        expect(emissionModel.updateMany).toHaveBeenCalledWith(
            expect.any(Object),
            { $set: { isDeleted: false } },
            { session }
        );
    });

    test('restoreEmission without session', async () => {
        await restoreEmission('C01');
        expect(emissionModel.updateMany).toHaveBeenCalledWith(
            expect.any(Object),
            { $set: { isDeleted: false } },
            {}
        );
    });
});
