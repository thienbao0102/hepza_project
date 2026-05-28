const SummaryRecord = require('../../models/summaryRecordsModel');
const Company = require('../../models/companyModel');
const mongoose = require('mongoose');

jest.mock('../../models/summaryRecordsModel', () => ({
    aggregate: jest.fn().mockReturnValue({ allowDiskUse: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue([{ _id: 'S1' }]),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    distinct: jest.fn().mockResolvedValue(['C01', 'C02']),
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ __v: 2 }) }),
}));

jest.mock('../../models/companyModel', () => ({
    find: jest.fn().mockReturnValue({
        distinct: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(['C01', 'C02', 'C03']) }),
        lean: jest.fn().mockReturnThis()
    }),
}));

const {
    getSummaryRecordAggregate,
    updateSummaryRecord,
    claimSummaryRecord,
    checkSummaryExists,
    getActiveSummaryRecord,
    claimSummaryVersion,
    createEmptySummaryData,
    getDistinctCompanyIdsByPeriod,
    getMissingCompanyIdsByPeriod,
    deleteSoftSummaryRecords,
    deleteHardSummaryRecords,
    restoreSummaryRecords,
    aggregate,
} = require('../summaryRecordRepository');

describe('summaryRecordRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSummaryRecordAggregate', () => {
        test('builds pipeline with all includes', async () => {
            await getSummaryRecordAggregate('C01', 'Z01', 202401, 202412, [1]);
            expect(SummaryRecord.aggregate).toHaveBeenCalled();
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[0].$match.company_id).toBe('C01');
            expect(pipeline[0].$match.periodKey).toEqual({ $gte: 202401, $lte: 202412 });
            expect(pipeline[1].$group._id).toBe('$_id');
        });

        test('builds pipeline with specific include', async () => {
            await getSummaryRecordAggregate('C01', 'Z01', 202401, 202412, [2]);
            expect(SummaryRecord.aggregate).toHaveBeenCalled();
        });

        test('builds pipeline with multiple includes', async () => {
            await getSummaryRecordAggregate('C01', 'Z01', 202401, 202412, [2, 3, 4, 5, 6]);
            expect(SummaryRecord.aggregate).toHaveBeenCalled();
        });

        test('builds pipeline without aggregateByMonth', async () => {
            await getSummaryRecordAggregate('C01', 'Z01', 202401, 202412, [1], false);
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[1].$group._id).toBe('$_id');
        });

        test('builds pipeline without company_id', async () => {
            await getSummaryRecordAggregate(null, 'Z01', 202401, 202412, [1], false);
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[0].$match.zone_id).toBe('Z01');
            expect(pipeline[0].$match.company_id).toBeUndefined();
        });

        test('builds pipeline without company_id and zone_id', async () => {
            await getSummaryRecordAggregate(null, null, 202401, 202412, [1], false);
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[0].$match.zone_id).toBeUndefined();
            expect(pipeline[0].$match.company_id).toBeUndefined();
        });

        test('builds pipeline with aggregateByMonth and zone only', async () => {
            await getSummaryRecordAggregate(null, 'Z01', 202401, 202412, [1], true);
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[1].$group._id).toEqual({ periodKey: '$periodKey', zone_id: '$zone_id' });
        });

        test('builds pipeline with aggregateByMonth and no filters', async () => {
            await getSummaryRecordAggregate(null, null, 202401, 202412, [1], true);
            const pipeline = SummaryRecord.aggregate.mock.calls[0][0];
            expect(pipeline[1].$group._id).toEqual({ periodKey: '$periodKey' });
        });
    });

    describe('updateSummaryRecord', () => {
        test('creates new record when not exists', async () => {
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
            const summaryData = { input_materials: { total_materials: 10 } };
            await updateSummaryRecord('C01', 'Z01', 202401, summaryData, null);
            expect(SummaryRecord.create).toHaveBeenCalled();
        });

        test('updates existing record', async () => {
            const existing = { _id: 'S1' };
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(existing) });
            const summaryData = { input_materials: { total_materials: 10 } };
            await updateSummaryRecord('C01', 'Z01', 202401, summaryData, null);
            expect(SummaryRecord.updateOne).toHaveBeenCalledWith(
                { company_id: 'C01', zone_id: 'Z01', periodKey: 202401 },
                { $set: { 'input_materials.total_materials': 10 } },
                { session: null }
            );
        });

        test('skips update when no numeric/string fields', async () => {
            const existing = { _id: 'S1' };
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(existing) });
            const summaryData = { input_materials: { flag: true } };
            const result = await updateSummaryRecord('C01', 'Z01', 202401, summaryData, null);
            expect(SummaryRecord.updateOne).not.toHaveBeenCalled();
            expect(result).toBe(existing);
        });
    });

    describe('claimSummaryRecord', () => {
        test('creates empty summary record', async () => {
            await claimSummaryRecord('C01', 'Z01', 202401, null);
            expect(SummaryRecord.create).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ company_id: 'C01', zone_id: 'Z01', periodKey: 202401 })]),
                { session: null }
            );
        });
    });

    describe('checkSummaryExists', () => {
        test('returns true when exists', async () => {
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ _id: 'S1' }) });
            const result = await checkSummaryExists('C01', 'Z01', 202401, null);
            expect(result).toBe(true);
        });

        test('returns false when not exists', async () => {
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
            const result = await checkSummaryExists('C01', 'Z01', 202401);
            expect(result).toBe(false);
        });
    });

    describe('getActiveSummaryRecord', () => {
        test('returns record with session', async () => {
            const session = { id: 's1' };
            SummaryRecord.findOne.mockReturnValue({ session: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ _id: 'S1' }) });
            const result = await getActiveSummaryRecord('C01', 'Z01', 202401, session);
            expect(SummaryRecord.findOne).toHaveBeenCalledWith({ company_id: 'C01', zone_id: 'Z01', periodKey: 202401, isDeleted: { $ne: true } });
        });

        test('returns record without session', async () => {
            SummaryRecord.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'S1' }) });
            await getActiveSummaryRecord('C01', 'Z01', 202401);
            expect(SummaryRecord.findOne).toHaveBeenCalled();
        });
    });

    describe('claimSummaryVersion', () => {
        test('increments version with session', async () => {
            const session = { id: 's1' };
            await claimSummaryVersion('C01', 'Z01', 202401, 1, session);
            expect(SummaryRecord.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ company_id: 'C01', __v: 1 }),
                { $inc: { __v: 1 } },
                { new: false, session }
            );
        });

        test('increments version without session', async () => {
            await claimSummaryVersion('C01', 'Z01', 202401, 1);
            expect(SummaryRecord.findOneAndUpdate).toHaveBeenCalledWith(
                expect.any(Object),
                { $inc: { __v: 1 } },
                { new: false, session: null }
            );
        });
    });

    describe('createEmptySummaryData', () => {
        test('returns object with all zero fields', () => {
            const data = createEmptySummaryData();
            expect(data.input_materials.total_materials).toBe(0);
            expect(data.input_chemicals.total_chemicals_kg).toBe(0);
            expect(data.fuels.total_electricity).toBe(0);
            expect(data.waste.total_waste_tan).toBe(0);
            expect(data.emissions.total_co2).toBe(0);
        });
    });

    describe('getDistinctCompanyIdsByPeriod', () => {
        test('returns distinct company ids', async () => {
            const result = await getDistinctCompanyIdsByPeriod(202401);
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', { periodKey: 202401, isDeleted: { $ne: true } });
            expect(result).toEqual(['C01', 'C02']);
        });

        test('filters by materials category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'materials');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'input_materials.total_materials': { $gt: 0 } }));
        });

        test('filters by chemicals category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'chemicals');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ $or: expect.any(Array) }));
        });

        test('filters by electricity category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'electricity');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'fuels.total_electricity': { $gt: 0 } }));
        });

        test('filters by water category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'water');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'fuels.total_water': { $gt: 0 } }));
        });

        test('filters by combustion category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'combustion');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'fuels.total_combustion': { $gt: 0 } }));
        });

        test('filters by fuels category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'fuels');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'fuels.total_combustion': { $gt: 0 } }));
        });

        test('filters by waste category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'waste');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ $or: expect.any(Array) }));
        });

        test('filters by emissions category', async () => {
            await getDistinctCompanyIdsByPeriod(202401, 'emissions');
            expect(SummaryRecord.distinct).toHaveBeenCalledWith('company_id', expect.objectContaining({ 'emissions.total_co2': { $gt: 0 } }));
        });
    });

    describe('getMissingCompanyIdsByPeriod', () => {
        test('returns missing company ids', async () => {
            const result = await getMissingCompanyIdsByPeriod(202401);
            expect(result).toEqual(['C03']);
        });
    });

    describe('deleteSoftSummaryRecords', () => {
        test('soft deletes with session', async () => {
            const session = { id: 's1' };
            await deleteSoftSummaryRecords('C01', session);
            expect(SummaryRecord.updateMany).toHaveBeenCalledWith(
                expect.any(Object),
                { $set: { isDeleted: true } },
                { session }
            );
        });

        test('soft deletes without session', async () => {
            await deleteSoftSummaryRecords('C01');
            expect(SummaryRecord.updateMany).toHaveBeenCalledWith(
                expect.any(Object),
                { $set: { isDeleted: true } },
                {}
            );
        });
    });

    describe('deleteHardSummaryRecords', () => {
        test('hard deletes with session', async () => {
            const session = { id: 's1' };
            await deleteHardSummaryRecords('C01', session);
            expect(SummaryRecord.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, { session });
        });

        test('hard deletes without session', async () => {
            await deleteHardSummaryRecords('C01');
            expect(SummaryRecord.deleteMany).toHaveBeenCalledWith({ company_id: 'C01' }, {});
        });
    });

    describe('restoreSummaryRecords', () => {
        test('restores with session', async () => {
            const session = { id: 's1' };
            await restoreSummaryRecords('C01', session);
            expect(SummaryRecord.updateMany).toHaveBeenCalledWith(
                expect.any(Object),
                { $set: { isDeleted: false } },
                { session }
            );
        });

        test('restores without session', async () => {
            await restoreSummaryRecords('C01');
            expect(SummaryRecord.updateMany).toHaveBeenCalledWith(
                expect.any(Object),
                { $set: { isDeleted: false } },
                {}
            );
        });
    });

    describe('aggregate', () => {
        test('runs generic pipeline', async () => {
            const pipeline = [{ $match: {} }];
            await aggregate(pipeline);
            expect(SummaryRecord.aggregate).toHaveBeenCalledWith(pipeline);
        });
    });
});
