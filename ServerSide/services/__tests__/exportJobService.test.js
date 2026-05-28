jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    statSync: jest.fn(() => ({ size: 2048 })),
    unlinkSync: jest.fn(),
}));

jest.mock('path', () => jest.requireActual('path'));

jest.mock('../exportHistoryService', () => ({
    updateExportJobState: jest.fn(),
}));

jest.mock('../exportService', () => ({
    countExportRecords: jest.fn(),
    exportDataMultiCompanyToFile: jest.fn(),
}));

const historyService = require('../exportHistoryService');
const exportService = require('../exportService');
const jobService = require('../exportJobService');

describe('exportJobService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(new Date('2026-05-18T00:00:00.000Z'));
    });

    afterEach(() => jest.useRealTimers());

    test('runs export job and marks success with file metadata', async () => {
        exportService.countExportRecords.mockResolvedValue(500);
        exportService.exportDataMultiCompanyToFile.mockImplementation(async (_filePath, options) => {
            await options.onProgress(250);
            return { totalRecords: 500 };
        });

        await jobService.runExportJob({
            export_id: 'EX001',
            company_ids: ['C001'],
            periodKeyStart: 202501,
            periodKeyEnd: 202512,
            resource_types: [2, 3],
        });

        expect(historyService.updateExportJobState).toHaveBeenCalledWith('EX001', expect.objectContaining({ status: 'processing', total_records: 500 }));
        expect(historyService.updateExportJobState).toHaveBeenCalledWith('EX001', expect.objectContaining({ status: 'success', processed_records: 500, progress: 100, file_size: 2048 }));
    });

    test('marks failed when export generation throws', async () => {
        exportService.countExportRecords.mockResolvedValue(0);
        exportService.exportDataMultiCompanyToFile.mockRejectedValue(new Error('disk full'));

        await jobService.runExportJob({
            export_id: 'EX002',
            company_ids: ['C001'],
            periodKeyStart: 202501,
            periodKeyEnd: 202512,
            resource_types: [2],
        });

        expect(historyService.updateExportJobState).toHaveBeenCalledWith('EX002', expect.objectContaining({ status: 'failed', error_message: 'disk full' }));
    });
});
