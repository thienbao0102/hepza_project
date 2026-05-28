jest.mock('../resourceSectionProcessor', () => ({
    processSection: jest.fn(),
}));
jest.mock('../../dataAccess/summaryRecordRepository', () => ({
    checkSummaryExists: jest.fn(),
    claimSummaryRecord: jest.fn(),
    updateSummaryRecord: jest.fn(),
}));
jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    checkMonthHasData: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../dataAccess/companyRepository', () => ({
    getZoneIdByCompanyId: jest.fn(),
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
jest.mock('../../dataAccess/emissionRepository', () => ({
    insertEmission: jest.fn(),
}));

const summaryRecordRepository = require('../../dataAccess/summaryRecordRepository');
const companyRepository = require('../../dataAccess/companyRepository');
const { processResourceDataCreate } = require('../resourceCrudService');

describe('processResourceDataCreate month claim', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        companyRepository.getZoneIdByCompanyId.mockResolvedValue({ zone_id: 'Z001' });
    });

    test('returns conflict when summary already exists', async () => {
        summaryRecordRepository.checkSummaryExists.mockResolvedValue(true);

        const result = await processResourceDataCreate({}, 'C001', 'Z001', 202604, {}, 'U001');

        expect(result).toEqual({
            success: false,
            statusCode: 409,
            conflict: 'month_exists',
            message: 'Tháng này đã có dữ liệu tài nguyên/chất thải. Vui lòng vào trang cập nhật.',
        });
        expect(summaryRecordRepository.claimSummaryRecord).not.toHaveBeenCalled();
    });

    test('returns conflict when claim hits duplicate key', async () => {
        summaryRecordRepository.checkSummaryExists.mockResolvedValue(false);
        summaryRecordRepository.claimSummaryRecord.mockRejectedValue(Object.assign(new Error('duplicate key'), {
            code: 11000,
            keyPattern: { company_id: 1, zone_id: 1, periodKey: 1 },
        }));

        const result = await processResourceDataCreate({}, 'C001', 'Z001', 202604, {}, 'U001');

        expect(result).toEqual({
            success: false,
            statusCode: 409,
            conflict: 'month_exists',
            message: 'Tháng này đã có dữ liệu tài nguyên/chất thải. Vui lòng vào trang cập nhật.',
        });
    });
});
