jest.mock('../../dataAccess/summaryRecordRepository', () => ({
    checkSummaryExists: jest.fn().mockResolvedValue(false),
    claimSummaryRecord: jest.fn().mockResolvedValue(),
    getActiveSummaryRecord: jest.fn().mockResolvedValue({ __v: 2 }),
    claimSummaryVersion: jest.fn().mockResolvedValue({ __v: 2 }),
    createEmptySummaryData: jest.fn().mockReturnValue({
        input_materials: {}, input_chemicals: {}, fuels: {}, emissions: {}, waste: {}
    }),
    updateSummaryRecord: jest.fn().mockResolvedValue(),
}));

jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    checkMonthHasData: jest.fn().mockResolvedValue(true),
    getListData: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../dataAccess/companyRepository', () => ({
    getZoneIdByCompanyId: jest.fn().mockResolvedValue({ zone_id: 'Z01' }),
    getCompanyNameById: jest.fn().mockResolvedValue({ company_name: 'Test Co' }),
}));

jest.mock('../../dataAccess/industrialZoneRepository', () => ({
    getZoneNameById: jest.fn().mockResolvedValue({ zone_name: 'Zone A' }),
}));

jest.mock('../../dataAccess/userRepository', () => ({
    getNameByUserId: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../models/resourceVersionModel', () => ({
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
}));

jest.mock('../versionManagerService', () => ({
    commitTransaction: jest.fn().mockResolvedValue(),
}));

jest.mock('../resourceSectionProcessor', () => ({
    processSection: jest.fn().mockResolvedValue(),
}));

jest.mock('../../utils/abbreviationInMemory', () => ({
    convertUsingGetName: jest.fn((item) => item),
}));

jest.mock('../../utils/resourceHelpers', () => ({
    initQueryGetDataResource: jest.fn().mockReturnValue({ company_id: 'C01' }),
    formatDate: jest.fn().mockReturnValue('01/01/2024'),
}));

const summaryRecordRepository = require('../../dataAccess/summaryRecordRepository');
const companyRepository = require('../../dataAccess/companyRepository');
const resoureceAndWasteRepository = require('../../dataAccess/resoureceAndWasteRepository');
const resourceVersionModel = require('../../models/resourceVersionModel');
const userRepository = require('../../dataAccess/userRepository');
const industrialZoneRepository = require('../../dataAccess/industrialZoneRepository');
const { commitTransaction } = require('../versionManagerService');
const { processSection } = require('../resourceSectionProcessor');

const {
    processResourceDataCreate,
    processResourceDataUpdate,
    processGetListDataResource,
    getAllResourceDataWithHistory,
} = require('../resourceCrudService');

describe('resourceCrudService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default mock return values cleared by clearAllMocks
        summaryRecordRepository.checkSummaryExists.mockResolvedValue(false);
        summaryRecordRepository.claimSummaryRecord.mockResolvedValue();
        summaryRecordRepository.getActiveSummaryRecord.mockResolvedValue({ __v: 2 });
        summaryRecordRepository.claimSummaryVersion.mockResolvedValue({ __v: 2 });
        summaryRecordRepository.createEmptySummaryData.mockReturnValue({
            input_materials: {}, input_chemicals: {}, fuels: {}, emissions: {}, waste: {}
        });
        summaryRecordRepository.updateSummaryRecord.mockResolvedValue();
        resoureceAndWasteRepository.checkMonthHasData.mockResolvedValue(true);
        resoureceAndWasteRepository.getListData.mockResolvedValue([]);
        companyRepository.getZoneIdByCompanyId.mockResolvedValue({ zone_id: 'Z01' });
        companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Test Co' });
        industrialZoneRepository.getZoneNameById.mockResolvedValue({ zone_name: 'Zone A' });
        userRepository.getNameByUserId.mockResolvedValue([]);
        resourceVersionModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
        processSection.mockResolvedValue();
        commitTransaction.mockResolvedValue();
    });

    describe('processResourceDataCreate', () => {
        test('returns MONTH_ALREADY_DECLARED when summary exists', async () => {
            summaryRecordRepository.checkSummaryExists.mockResolvedValue(true);
            const result = await processResourceDataCreate({}, 'C01', 'Z01', '2024-01', null, 'U001');
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(409);
        });

        test('returns MONTH_ALREADY_DECLARED on duplicate key error', async () => {
            summaryRecordRepository.claimSummaryRecord.mockRejectedValue({ code: 11000 });
            const result = await processResourceDataCreate({}, 'C01', 'Z01', '2024-01', null, 'U001');
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(409);
        });

        test('resolves zone_id when not provided', async () => {
            companyRepository.getZoneIdByCompanyId.mockResolvedValue({ zone_id: 'Z02' });
            const result = await processResourceDataCreate({}, 'C01', null, '2024-01', null, 'U001');
            expect(companyRepository.getZoneIdByCompanyId).toHaveBeenCalledWith('C01', null);
            expect(result.zone_id).toBe('Z02');
        });

        test('throws when company not found', async () => {
            companyRepository.getZoneIdByCompanyId.mockResolvedValue(null);
            await expect(processResourceDataCreate({}, 'C01', null, '2024-01', null, 'U001'))
                .rejects.toThrow('Company C01 not found');
        });

        test('throws on non-duplicate claim error', async () => {
            summaryRecordRepository.claimSummaryRecord.mockRejectedValue(new Error('DB error'));
            await expect(processResourceDataCreate({}, 'C01', 'Z01', '2024-01', null, 'U001'))
                .rejects.toThrow('DB error');
        });

        test('creates init txChange when month has no data', async () => {
            resoureceAndWasteRepository.checkMonthHasData.mockResolvedValue(false);
            const result = await processResourceDataCreate({}, 'C01', 'Z01', '2024-01', null, 'U001');
            expect(commitTransaction).toHaveBeenCalledWith(expect.objectContaining({
                changes: expect.arrayContaining([expect.objectContaining({ actionType: 'init' })]),
                modifiedBy: 'U001',
            }));
            expect(result.success).toBe(true);
        });

        test('processes all sections and returns success', async () => {
            const rawData = {
                'Nguyên vật liệu': [],
                'Hóa chất': [],
                'Điện': [],
                'Nước': [],
                'Chất đốt & Nhiên liệu': [],
                'Chất thải': [],
            };
            const result = await processResourceDataCreate(rawData, 'C01', 'Z01', '2024-01', null, 'U001');
            expect(processSection).toHaveBeenCalledTimes(6);
            expect(result.success).toBe(true);
            expect(result.company_id).toBe('C01');
        });
    });

    describe('processResourceDataUpdate', () => {
        test('throws when company not found', async () => {
            companyRepository.getZoneIdByCompanyId.mockResolvedValue(null);
            await expect(processResourceDataUpdate({}, 'C01', '2024-01', null, 'U001'))
                .rejects.toThrow('Company C01 not found');
        });

        test('throws MissingVersionError when summaryVersion invalid', async () => {
            await expect(processResourceDataUpdate({ summaryVersion: 'abc' }, 'C01', '2024-01', null, 'U001'))
                .rejects.toThrow('Thiếu phiên bản');
            await expect(processResourceDataUpdate({ summaryVersion: -1 }, 'C01', '2024-01', null, 'U001'))
                .rejects.toThrow('Thiếu phiên bản');
        });

        test('throws StateConflictError when no active summary', async () => {
            summaryRecordRepository.getActiveSummaryRecord.mockResolvedValue(null);
            await expect(processResourceDataUpdate({ summaryVersion: 1 }, 'C01', '2024-01', null, 'U001'))
                .rejects.toThrow('không còn tồn tại');
        });

        test('throws VersionConflictError when claim fails', async () => {
            summaryRecordRepository.claimSummaryVersion.mockResolvedValue(null);
            await expect(processResourceDataUpdate({ summaryVersion: 2 }, 'C01', '2024-01', null, 'U001'))
                .rejects.toThrow('người khác cập nhật');
        });

        test('commits transaction when txChanges exist', async () => {
            processSection.mockImplementation(async (name, data, ctx) => {
                ctx.txChanges.push({ resourceType: 'X' });
            });
            const rawData = {
                summaryVersion: 2,
                'Nguyên vật liệu': [{ value: 1 }],
                'Hóa chất': [],
                'Điện': [],
                'Nước': [],
                'Chất đốt & Nhiên liệu': [],
                'Chất thải': [],
            };
            const result = await processResourceDataUpdate(rawData, 'C01', '2024-01', null, 'U001');
            expect(commitTransaction).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        test('skips commit when no txChanges', async () => {
            const rawData = {
                summaryVersion: 2,
                'Nguyên vật liệu': [],
                'Hóa chất': [],
                'Điện': [],
                'Nước': [],
                'Chất đốt & Nhiên liệu': [],
                'Chất thải': [],
            };
            const result = await processResourceDataUpdate(rawData, 'C01', '2024-01', null, 'U001');
            expect(commitTransaction).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });

    describe('processGetListDataResource', () => {
        test('returns empty object when include is empty', async () => {
            const result = await processGetListDataResource('2024-01', '2024-01', [], 'admin', 'C01', 'Z01');
            expect(result).toEqual({});
        });

        test('fetches WasteResource with special query', async () => {
            resoureceAndWasteRepository.getListData.mockResolvedValue([{ _id: 1 }]);
            const result = await processGetListDataResource('2024-01', '2024-01', [6], 'admin', 'C01', 'Z01');
            expect(resoureceAndWasteRepository.getListData).toHaveBeenCalledWith(
                expect.objectContaining({ main_group: expect.any(Object) }),
                'WasteResource',
                null
            );
            expect(result.WasteResource).toEqual([{ _id: 1 }]);
        });

        test('filters out child groups when parent is included', async () => {
            resoureceAndWasteRepository.getListData.mockResolvedValue([]);
            // Group 1 = material, and if subgroupMapping has material as parent with MET child
            await processGetListDataResource('2024-01', '2024-01', [1, 7], 'admin', 'C01', 'Z01');
            // 7 might be a subgroup of 1, so it should be filtered out
        });

        test('fetches subGroups for InputResource', async () => {
            resoureceAndWasteRepository.getListData.mockResolvedValue([]);
            await processGetListDataResource('2024-01', '2024-01', [12], 'admin', 'C01', 'Z01');
            expect(resoureceAndWasteRepository.getListData).toHaveBeenCalledWith(
                expect.objectContaining({ $or: expect.arrayContaining([expect.objectContaining({ sub_group: expect.any(Object) })]) }),
                'InputResource',
                null
            );
        });

        test('skipConvert returns raw data', async () => {
            resoureceAndWasteRepository.getListData.mockResolvedValue([{ raw: true }]);
            const result = await processGetListDataResource('2024-01', '2024-01', [1], 'admin', 'C01', 'Z01', true);
            expect(result.InputResource).toEqual([{ raw: true }]);
        });

        test('applies session when provided', async () => {
            const session = { id: 's1' };
            resoureceAndWasteRepository.getListData.mockResolvedValue([]);
            await processGetListDataResource('2024-01', '2024-01', [1], 'admin', 'C01', 'Z01', false, session);
            expect(resoureceAndWasteRepository.getListData).toHaveBeenCalledWith(expect.any(Object), 'InputResource', session);
        });
    });

    describe('getAllResourceDataWithHistory', () => {
        test('throws when company not found', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue(null);
            await expect(getAllResourceDataWithHistory('C01', 'Z01', '2024-01'))
                .rejects.toThrow('Company or Zone not found');
        });

        test('throws when zone not found', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Co' });
            const { getZoneNameById } = require('../../dataAccess/industrialZoneRepository');
            getZoneNameById.mockResolvedValue(null);
            await expect(getAllResourceDataWithHistory('C01', 'Z01', '2024-01'))
                .rejects.toThrow('Company or Zone not found');
        });

        test('returns snapshot with versions and users', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Co' });
            const { getZoneNameById } = require('../../dataAccess/industrialZoneRepository');
            getZoneNameById.mockResolvedValue({ zone_name: 'Zone A' });
            summaryRecordRepository.getActiveSummaryRecord.mockResolvedValue({ __v: 5 });
            resourceVersionModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        { transactionId: 'TX1', modifiedAt: new Date(), modifiedBy: 'U001', commitMessage: 'Init', changes: null, actionType: 'init' },
                    ]),
                }),
            });
            userRepository.getNameByUserId.mockResolvedValue([{ _id: 'U001', fullName: 'Admin', email: 'a@b.com' }]);

            const result = await getAllResourceDataWithHistory('C01', 'Z01', '2024-01');
            expect(result.company_name).toBe('Co');
            expect(result.zone_name).toBe('Zone A');
            expect(result.summaryVersion).toBe(5);
            expect(result.resource_change).toHaveLength(1);
            expect(result.createdBy).toBeDefined();
        });

        test('handles deleted account fallback', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Co' });
            const { getZoneNameById } = require('../../dataAccess/industrialZoneRepository');
            getZoneNameById.mockResolvedValue({ zone_name: 'Zone A' });
            resourceVersionModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        { transactionId: 'TX1', modifiedAt: new Date(), modifiedBy: 'U999', commitMessage: 'X', changes: {}, actionType: 'create' },
                    ]),
                }),
            });
            userRepository.getNameByUserId.mockResolvedValue([]);

            const result = await getAllResourceDataWithHistory('C01', 'Z01', '2024-01');
            expect(result.resource_change[0].modifiedBy.name).toBe('Tài khoản đã xóa');
        });

        test('returns empty resource_change when no versions', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Co' });
            const { getZoneNameById } = require('../../dataAccess/industrialZoneRepository');
            getZoneNameById.mockResolvedValue({ zone_name: 'Zone A' });
            resourceVersionModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
            });

            const result = await getAllResourceDataWithHistory('C01', 'Z01', '2024-01');
            expect(result.resource_change).toEqual([]);
            expect(result.createdBy).toBeNull();
        });

        test('sorts resource_change by modifiedAt desc', async () => {
            companyRepository.getCompanyNameById.mockResolvedValue({ company_name: 'Co' });
            const { getZoneNameById } = require('../../dataAccess/industrialZoneRepository');
            getZoneNameById.mockResolvedValue({ zone_name: 'Zone A' });
            const v1 = { transactionId: 'TX1', modifiedAt: new Date('2024-01-01'), modifiedBy: 'U001', commitMessage: 'A', changes: null, actionType: 'init' };
            const v2 = { transactionId: 'TX2', modifiedAt: new Date('2024-01-02'), modifiedBy: 'U001', commitMessage: 'B', changes: null, actionType: 'create' };
            resourceVersionModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([v1, v2]) }),
            });
            userRepository.getNameByUserId.mockResolvedValue([{ _id: 'U001', fullName: 'Admin', email: 'a@b.com' }]);

            const result = await getAllResourceDataWithHistory('C01', 'Z01', '2024-01');
            expect(result.resource_change).toHaveLength(2);
            expect(result.resource_change[0].trans_id).toBe('TX2');
        });
    });
});
