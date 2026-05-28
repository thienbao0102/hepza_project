const ResourceVersion = require('../../models/resourceVersionModel');

jest.mock('../../models/resourceVersionModel', () => ({
    create: jest.fn().mockResolvedValue([{ _id: 'V1' }]),
    insertMany: jest.fn().mockResolvedValue([{ _id: 'V2' }]),
    find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
    }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
}));

const {
    create,
    insertMany,
    findByTransaction,
    findByCompanyAndPeriod,
    findByResourceId,
    deleteSoftByCompanyId,
    deleteHardByCompanyId,
    restoreByCompanyId,
    deleteSoftResourceVersionsByCompanyId,
    deleteHardResourceVersionsByCompanyId,
    restoreResourceVersionsByCompanyId,
} = require('../resourceVersionRepository');

describe('resourceVersionRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        test('creates version doc', async () => {
            const doc = { _id: 'V1', transactionId: 'T1', actionType: 'create' };
            const result = await create(doc, { session: null });
            expect(ResourceVersion.create).toHaveBeenCalledWith([doc], { session: null });
        });

        test('throws when missing _id', async () => {
            await expect(create({ transactionId: 'T1', actionType: 'create' }))
                .rejects.toThrow(/_id/);
        });

        test('throws when missing transactionId', async () => {
            await expect(create({ _id: 'V1', actionType: 'create' }))
                .rejects.toThrow(/transactionId/);
        });

        test('throws when missing actionType', async () => {
            await expect(create({ _id: 'V1', transactionId: 'T1' }))
                .rejects.toThrow(/actionType/);
        });
    });

    describe('insertMany', () => {
        test('inserts many docs', async () => {
            const docs = [{ _id: 'V1', transactionId: 'T1', actionType: 'create' }];
            await insertMany(docs, { session: null });
            expect(ResourceVersion.insertMany).toHaveBeenCalledWith(docs, { session: null });
        });

        test('throws for empty array', async () => {
            await expect(insertMany([])).rejects.toThrow(/không rỗng/);
        });

        test('throws for non-array', async () => {
            await expect(insertMany(null)).rejects.toThrow(/không rỗng/);
        });

        test('throws when doc missing _id', async () => {
            const docs = [{ transactionId: 'T1', actionType: 'create' }];
            await expect(insertMany(docs)).rejects.toThrow(/_id/);
        });
    });

    describe('findByTransaction', () => {
        test('finds by transactionId', async () => {
            await findByTransaction('T1');
            expect(ResourceVersion.find).toHaveBeenCalledWith({ transactionId: 'T1', isDeleted: { $ne: true } });
        });

        test('throws when missing transactionId', async () => {
            await expect(findByTransaction()).rejects.toThrow(/transactionId is required/);
        });
    });

    describe('findByCompanyAndPeriod', () => {
        test('finds by company and period', async () => {
            await findByCompanyAndPeriod('C01', 202401);
            expect(ResourceVersion.find).toHaveBeenCalledWith({ company_id: 'C01', isDeleted: { $ne: true }, periodKey: 202401 });
        });

        test('finds by company without period', async () => {
            await findByCompanyAndPeriod('C01');
            expect(ResourceVersion.find).toHaveBeenCalledWith({ company_id: 'C01', isDeleted: { $ne: true } });
        });

        test('applies pagination defaults', async () => {
            await findByCompanyAndPeriod('C01', 202401);
            const chain = ResourceVersion.find.mock.results[0].value;
            expect(chain.skip).toHaveBeenCalledWith(0);
            expect(chain.limit).toHaveBeenCalledWith(50);
        });

        test('applies custom pagination', async () => {
            await findByCompanyAndPeriod('C01', 202401, { page: 2, limit: 10 });
            const chain = ResourceVersion.find.mock.results[0].value;
            expect(chain.skip).toHaveBeenCalledWith(10);
            expect(chain.limit).toHaveBeenCalledWith(10);
        });

        test('throws when missing company_id', async () => {
            await expect(findByCompanyAndPeriod()).rejects.toThrow(/company_id is required/);
        });
    });

    describe('findByResourceId', () => {
        test('finds by resourceId', async () => {
            await findByResourceId('R1');
            expect(ResourceVersion.find).toHaveBeenCalledWith({ resourceId: 'R1', isDeleted: { $ne: true } });
        });

        test('finds by resourceId and type', async () => {
            await findByResourceId('R1', 'FuelResource');
            expect(ResourceVersion.find).toHaveBeenCalledWith({ resourceId: 'R1', isDeleted: { $ne: true }, resourceType: 'FuelResource' });
        });

        test('throws when missing resourceId', async () => {
            await expect(findByResourceId()).rejects.toThrow(/resourceId is required/);
        });
    });

    describe('deleteSoftByCompanyId', () => {
        test('soft deletes with session', async () => {
            const session = { id: 's1' };
            await deleteSoftByCompanyId('C01', session);
            expect(ResourceVersion.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ company_id: 'C01' }),
                { $set: { isDeleted: true } },
                { session }
            );
        });

        test('soft deletes without session', async () => {
            await deleteSoftByCompanyId('C01');
            expect(ResourceVersion.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ company_id: 'C01' }),
                { $set: { isDeleted: true } },
                {}
            );
        });
    });

    describe('deleteHardByCompanyId', () => {
        test('hard deletes with session', async () => {
            const session = { id: 's1' };
            await deleteHardByCompanyId('C01', session);
            expect(ResourceVersion.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, { session });
        });

        test('hard deletes without session', async () => {
            await deleteHardByCompanyId('C01');
            expect(ResourceVersion.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, {});
        });
    });

    describe('restoreByCompanyId', () => {
        test('restores with session', async () => {
            const session = { id: 's1' };
            await restoreByCompanyId('C01', session);
            expect(ResourceVersion.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ company_id: 'C01' }),
                { $set: { isDeleted: false } },
                { session }
            );
        });

        test('restores without session', async () => {
            await restoreByCompanyId('C01');
            expect(ResourceVersion.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ company_id: 'C01' }),
                { $set: { isDeleted: false } },
                {}
            );
        });
    });

    describe('aliases', () => {
        test('deleteSoftResourceVersionsByCompanyId calls deleteSoftByCompanyId', async () => {
            await deleteSoftResourceVersionsByCompanyId('C01');
            expect(ResourceVersion.updateMany).toHaveBeenCalled();
        });

        test('deleteHardResourceVersionsByCompanyId calls deleteHardByCompanyId', async () => {
            await deleteHardResourceVersionsByCompanyId('C01');
            expect(ResourceVersion.deleteMany).toHaveBeenCalled();
        });

        test('restoreResourceVersionsByCompanyId calls restoreByCompanyId', async () => {
            await restoreResourceVersionsByCompanyId('C01');
            expect(ResourceVersion.updateMany).toHaveBeenCalled();
        });
    });
});
