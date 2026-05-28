jest.mock('../../dataAccess/exportHistoryRepository', () => ({
    updateExportJobState: jest.fn(),
    getExportHistoryByExportIdForUser: jest.fn(),
    findExpiredCompletedExports: jest.fn(),
    markExportExpired: jest.fn(),
    findActiveExportByPath: jest.fn(),
}));

const repository = require('../../dataAccess/exportHistoryRepository');
const service = require('../exportHistoryService');

describe('exportHistoryService job helpers', () => {
    beforeEach(() => jest.clearAllMocks());

    test('updates export job state through repository', async () => {
        repository.updateExportJobState.mockResolvedValue({ export_id: 'EX001', status: 'processing' });

        const result = await service.updateExportJobState('EX001', { status: 'processing' });

        expect(repository.updateExportJobState).toHaveBeenCalledWith('EX001', { status: 'processing' });
        expect(result.status).toBe('processing');
    });

    test('reads export history by id and user', async () => {
        repository.getExportHistoryByExportIdForUser.mockResolvedValue({ export_id: 'EX001' });

        const result = await service.getExportHistoryByExportIdForUser('EX001', 'USR001');

        expect(repository.getExportHistoryByExportIdForUser).toHaveBeenCalledWith('EX001', 'USR001');
        expect(result.export_id).toBe('EX001');
    });

    test('exposes cleanup helpers', async () => {
        repository.findExpiredCompletedExports.mockResolvedValue([{ export_id: 'EX001' }]);
        repository.markExportExpired.mockResolvedValue({ export_id: 'EX001', status: 'expired' });
        repository.findActiveExportByPath.mockResolvedValue(null);

        await expect(service.findExpiredCompletedExports(new Date('2026-05-18T00:00:00.000Z'))).resolves.toHaveLength(1);
        await expect(service.markExportExpired('EX001')).resolves.toMatchObject({ status: 'expired' });
        await expect(service.findActiveExportByPath('tmp/exports/EX001.xlsx')).resolves.toBeNull();
    });
});
