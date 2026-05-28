jest.mock('fs', () => ({
    existsSync: jest.fn(),
    createReadStream: jest.fn(),
}));

jest.mock('../../utils/exportExcel', () => ({
    buildExcelMultiCompany: jest.fn(),
}));

jest.mock('../../services/exportHistoryService', () => ({
    getExportHistoryByExportIdForUser: jest.fn(),
    updateExportJobState: jest.fn(),
    updateExportHistoryStatus: jest.fn(),
}));

jest.mock('../../services/exportService', () => ({
    checkExportPermission: jest.fn(),
    saveExportHistory: jest.fn(),
}));

jest.mock('../../services/exportJobService', () => ({
    EXPORT_DIR: require('path').resolve('tmp/exports'),
    enqueueExportJob: jest.fn(),
}));

const path = require('path');
const fs = require('fs');
const historyService = require('../../services/exportHistoryService');
const exportService = require('../../services/exportService');
const jobService = require('../../services/exportJobService');
const controller = require('../exportController');

const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
});

describe('exportController background download', () => {
    beforeEach(() => jest.clearAllMocks());

    test('init creates queued history and enqueues job', async () => {
        exportService.checkExportPermission.mockResolvedValue(['C001']);
        exportService.saveExportHistory.mockResolvedValue({ export_id: 'EX001', name: 'file.xlsx' });
        const req = {
            user: { user_id: 'USR001', role: 'admin', full_name: 'Admin' },
            body: { company_ids: ['C001'], periodKeyStart: 202501, periodKeyEnd: 202512, include: [2], option: 1 },
        };
        const res = makeRes();

        await controller.initExport(req, res);

        expect(exportService.saveExportHistory).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
        expect(jobService.enqueueExportJob).toHaveBeenCalledWith(expect.objectContaining({ export_id: 'EX001' }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ export_id: 'EX001', status: 'queued' }));
    });

    test('download returns 410 when successful history file is missing', async () => {
        historyService.getExportHistoryByExportIdForUser.mockResolvedValue({ export_id: 'EX001', status: 'success', file_path: path.join(jobService.EXPORT_DIR, 'missing.xlsx') });
        fs.existsSync.mockReturnValue(false);
        const req = { user: { user_id: 'USR001' }, params: { export_id: 'EX001' } };
        const res = makeRes();

        await controller.downloadExport(req, res);

        expect(historyService.updateExportJobState).toHaveBeenCalledWith('EX001', expect.objectContaining({ status: 'expired' }));
        expect(res.status).toHaveBeenCalledWith(410);
    });

    test.each([
        path.resolve('tmp/file.xlsx'),
        path.resolve(jobService.EXPORT_DIR, '..', '..', 'outside.xlsx'),
    ])('download returns 410 when stored path is outside export directory: %s', async (filePath) => {
        historyService.getExportHistoryByExportIdForUser.mockResolvedValue({ export_id: 'EX001', status: 'success', file_path: filePath });
        fs.existsSync.mockReturnValue(true);
        const req = { user: { user_id: 'USR001' }, params: { export_id: 'EX001' } };
        const res = makeRes();

        await controller.downloadExport(req, res);

        expect(fs.createReadStream).not.toHaveBeenCalled();
        expect(historyService.updateExportJobState).toHaveBeenCalledWith('EX001', expect.objectContaining({ status: 'expired' }));
        expect(res.status).toHaveBeenCalledWith(410);
    });

    test('download streams available file', async () => {
        const pipe = jest.fn();
        const on = jest.fn().mockReturnThis();
        const filePath = path.join(jobService.EXPORT_DIR, 'file.xlsx');
        historyService.getExportHistoryByExportIdForUser.mockResolvedValue({ export_id: 'EX001', status: 'success', file_path: filePath, name: 'file.xlsx' });
        fs.existsSync.mockReturnValue(true);
        fs.createReadStream.mockReturnValue({ on, pipe });
        const req = { user: { user_id: 'USR001' }, params: { export_id: 'EX001' } };
        const res = makeRes();

        await controller.downloadExport(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('file.xlsx'));
        expect(fs.createReadStream).toHaveBeenCalledWith(path.resolve(filePath));
        expect(pipe).toHaveBeenCalledWith(res);
    });
});
