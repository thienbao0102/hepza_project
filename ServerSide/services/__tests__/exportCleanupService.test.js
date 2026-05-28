jest.mock('fs', () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
}));

jest.mock('../exportHistoryService', () => ({
    findExpiredCompletedExports: jest.fn(),
    markExportExpired: jest.fn(),
}));

jest.mock('../exportJobService', () => ({
    EXPORT_DIR: require('path').resolve('tmp/exports'),
}));

const fs = require('fs');
const path = require('path');
const historyService = require('../exportHistoryService');
const jobService = require('../exportJobService');
const cleanupService = require('../exportCleanupService');

describe('exportCleanupService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        cleanupService.stopExportCleanup();
    });

    afterEach(() => cleanupService.stopExportCleanup());

    test('deletes expired export files and marks histories expired', async () => {
        const filePath = path.join(jobService.EXPORT_DIR, 'EX001.xlsx');
        historyService.findExpiredCompletedExports.mockResolvedValue([
            { export_id: 'EX001', file_path: filePath },
        ]);
        historyService.markExportExpired.mockResolvedValue({});
        fs.existsSync.mockReturnValue(true);

        const result = await cleanupService.cleanupExpiredExports(new Date('2026-05-19T00:00:00.000Z'));

        expect(historyService.findExpiredCompletedExports).toHaveBeenCalledWith(new Date('2026-05-19T00:00:00.000Z'));
        expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
        expect(historyService.markExportExpired).toHaveBeenCalledWith('EX001');
        expect(result).toEqual({ expired: 1, deletedFiles: 1 });
    });

    test('marks expired when file is already missing', async () => {
        const filePath = path.join(jobService.EXPORT_DIR, 'missing.xlsx');
        historyService.findExpiredCompletedExports.mockResolvedValue([
            { export_id: 'EX002', file_path: filePath },
        ]);
        fs.existsSync.mockReturnValue(false);

        const result = await cleanupService.cleanupExpiredExports();

        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(historyService.markExportExpired).toHaveBeenCalledWith('EX002');
        expect(result).toEqual({ expired: 1, deletedFiles: 0 });
    });

    test('does not delete files outside export directory', async () => {
        const outsidePath = path.resolve('tmp/outside.xlsx');
        historyService.findExpiredCompletedExports.mockResolvedValue([
            { export_id: 'EX003', file_path: outsidePath },
        ]);
        fs.existsSync.mockReturnValue(true);

        const result = await cleanupService.cleanupExpiredExports();

        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(historyService.markExportExpired).toHaveBeenCalledWith('EX003');
        expect(result).toEqual({ expired: 1, deletedFiles: 0 });
    });

    test('starts only one cleanup interval', () => {
        jest.useFakeTimers();
        historyService.findExpiredCompletedExports.mockResolvedValue([]);

        const firstTimer = cleanupService.startExportCleanup();
        const secondTimer = cleanupService.startExportCleanup();

        expect(secondTimer).toBe(firstTimer);
        cleanupService.stopExportCleanup();
        jest.useRealTimers();
    });
});
