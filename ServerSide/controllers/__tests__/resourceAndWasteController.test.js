const mongoose = require('mongoose');

jest.mock('mongoose', () => {
    const session = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(),
        abortTransaction: jest.fn().mockResolvedValue(),
        endSession: jest.fn(),
    };
    return {
        default: { startSession: jest.fn().mockResolvedValue(session) },
        startSession: jest.fn().mockResolvedValue(session),
    };
});

jest.mock('../../services/resoureceAndWasteService', () => ({
    processResourceDataCreate: jest.fn().mockResolvedValue({ success: true, company_id: 'C01', zone_id: 'Z01', periodKey: 202401, createdFuelIds: [], createdWasteIds: [] }),
    processResourceDataUpdate: jest.fn().mockResolvedValue({ success: true, company_id: 'C01', zone_id: 'Z01', periodKey: 202401, createdFuelIds: [], createdWasteIds: [] }),
    processGetListDataResource: jest.fn().mockResolvedValue({ InputResource: [] }),
    getAllResourceDataWithHistory: jest.fn().mockResolvedValue({ resource_change: [], InputResource: [] }),
    processImportResourceData: jest.fn().mockResolvedValue({ isSuccess: true, summary: { total: 1 }, company_id: 'C01', zone_id: 'Z01', periodKey: 202401 }),
    recalculateSummaryRecord: jest.fn().mockResolvedValue(),
}));

jest.mock('../../models/fuelResourcesModel', () => ({
    findById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../models/wasteResourcesModel', () => ({
    findById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../utils/cloudinaryReferenceTracker', () => ({
    destroyUnusedCloudinaryUrls: jest.fn().mockResolvedValue(),
}));

jest.mock('../../utils/cloudinaryFolders', () => ({
    getFuelBillFolder: jest.fn().mockReturnValue('fuel-bills'),
    getWasteAttachmentFolder: jest.fn().mockReturnValue('waste-attachments'),
}));

jest.mock('../../config/cloudinary', () => ({
    uploadOrReuseAttachment: jest.fn().mockResolvedValue('https://cloudinary.com/image.jpg'),
}));

jest.mock('../../services/versionManagerService', () => ({
    commitChange: jest.fn().mockResolvedValue(),
}));

const resoureceAndWasteService = require('../../services/resoureceAndWasteService');
const FuelResourceModel = require('../../models/fuelResourcesModel');
const WasteResourceModel = require('../../models/wasteResourcesModel');
const { destroyUnusedCloudinaryUrls } = require('../../utils/cloudinaryReferenceTracker');
const { uploadOrReuseAttachment } = require('../../config/cloudinary');
const { commitChange } = require('../../services/versionManagerService');

const {
    insertDataResourceAndWaste,
    updateDataResourceAndWaste,
    getDataResource,
    getAllResourceDataWithHistory,
    importDataResourceFromExcel,
    uploadFuelBillImage,
    uploadWasteAttachments,
} = require('../resourceAndWasteController');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('resourceAndWasteController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        uploadOrReuseAttachment.mockResolvedValue('https://cloudinary.com/image.jpg');
        jest.spyOn(global, 'setImmediate').mockImplementation((cb) => cb());
        jest.spyOn(console, 'time').mockImplementation(() => {});
        jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('insertDataResourceAndWaste', () => {
        test('inserts successfully', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].isSuccess).toBe(true);
        });

        test('uses periodKey from body', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202402' } };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(resoureceAndWasteService.processResourceDataCreate).toHaveBeenCalledWith(
                expect.any(Object), 'C01', 'Z01', 202402, expect.anything(), 'U001'
            );
        });

        test('returns 409 on month conflict from service result', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockResolvedValue({ success: false, statusCode: 409, conflict: 'month_exists' });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 409 on month conflict error', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockRejectedValue({ statusCode: 409 });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 400 on general error', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockRejectedValue(new Error('Bad input'));
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 409 on MONTH_CONFLICT code', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockRejectedValue({ code: 'MONTH_CONFLICT' });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 409 on duplicate key error with summary keys', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockRejectedValue({
                code: 11000,
                keyPattern: { company_id: 1, zone_id: 1, periodKey: 1 },
            });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('returns 400 on non-summary duplicate key error', async () => {
            resoureceAndWasteService.processResourceDataCreate.mockRejectedValue({
                code: 11000,
                keyPattern: { company_id: 1 },
            });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('retries on transient transaction error', async () => {
            const retryErr = new Error('Unable to acquire lock');
            retryErr.hasErrorLabel = jest.fn().mockReturnValue(true);
            resoureceAndWasteService.processResourceDataCreate
                .mockRejectedValueOnce(retryErr)
                .mockResolvedValueOnce({ success: true, company_id: 'C01', zone_id: 'Z01', periodKey: 202401 });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await insertDataResourceAndWaste(req, res);
            expect(resoureceAndWasteService.processResourceDataCreate).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
        });

    });

    describe('updateDataResourceAndWaste', () => {
        test('updates successfully', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await updateDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when service fails', async () => {
            resoureceAndWasteService.processResourceDataUpdate.mockResolvedValue({ success: false });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await updateDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('uses error statusCode if present', async () => {
            resoureceAndWasteService.processResourceDataUpdate.mockRejectedValue({ message: 'err', statusCode: 403 });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await updateDataResourceAndWaste(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('uses periodKey from body', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202405' } };
            const res = mockRes();
            await updateDataResourceAndWaste(req, res);
            expect(resoureceAndWasteService.processResourceDataUpdate).toHaveBeenCalledWith(
                expect.any(Object), 'C01', 202405, expect.anything(), 'U001'
            );
        });

        test('computes current periodKey when not provided', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: {} };
            const res = mockRes();
            await updateDataResourceAndWaste(req, res);
            expect(resoureceAndWasteService.processResourceDataUpdate).toHaveBeenCalledWith(
                expect.any(Object), 'C01', expect.any(Number), expect.anything(), 'U001'
            );
        });

    });

    describe('getDataResource', () => {
        test('returns 400 when missing period keys', async () => {
            const req = { userDetails: { role: 'admin' }, query: {} };
            const res = mockRes();
            await getDataResource(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('fetches data successfully', async () => {
            const req = { userDetails: { role: 'admin' }, query: { periodKeyStart: '202401', periodKeyEnd: '202401', include: [1] } };
            const res = mockRes();
            await getDataResource(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].isSuccess).toBe(true);
        });

        test('handles include[] array from query', async () => {
            const req = { userDetails: { role: 'admin' }, query: { periodKeyStart: '202401', periodKeyEnd: '202401', 'include[]': ['1', '2'] } };
            const res = mockRes();
            await getDataResource(req, res);
            expect(resoureceAndWasteService.processGetListDataResource).toHaveBeenCalledWith(
                202401, 202401, [1, 2], 'admin', undefined, undefined
            );
        });

        test('returns 400 on error', async () => {
            resoureceAndWasteService.processGetListDataResource.mockRejectedValue(new Error('fail'));
            const req = { userDetails: { role: 'admin' }, query: { periodKeyStart: '202401', periodKeyEnd: '202412' } };
            const res = mockRes();
            await getDataResource(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getAllResourceDataWithHistory', () => {
        test('fetches single period', async () => {
            const req = { userDetails: { role: 'admin' }, query: { company_id: 'C01', zone_id: 'Z01', periodKey: '202401' } };
            const res = mockRes();
            await getAllResourceDataWithHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].dataResources).toHaveLength(1);
        });

        test('fetches multiple periods', async () => {
            resoureceAndWasteService.getAllResourceDataWithHistory
                .mockResolvedValueOnce({ resource_change: [{ _id: 'H1' }], InputResource: [{ _id: 'R1' }] })
                .mockResolvedValueOnce({ resource_change: [], InputResource: [] });
            const req = { userDetails: { role: 'admin' }, query: { company_id: 'C01', zone_id: 'Z01', periodKeys: '202401,202402' } };
            const res = mockRes();
            await getAllResourceDataWithHistory(req, res);
            expect(resoureceAndWasteService.getAllResourceDataWithHistory).toHaveBeenCalledTimes(2);
            const response = res.json.mock.calls[0][0];
            expect(response.dataResources).toHaveLength(1); // second has no data/history so filtered out
        });

        test('returns 400 when too many period keys', async () => {
            const keys = Array.from({ length: 13 }, (_, i) => 202401 + i).join(',');
            const req = { userDetails: { role: 'admin' }, query: { company_id: 'C01', zone_id: 'Z01', periodKeys: keys } };
            const res = mockRes();
            await getAllResourceDataWithHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 on error', async () => {
            resoureceAndWasteService.getAllResourceDataWithHistory.mockRejectedValue(new Error('fail'));
            const req = { userDetails: { role: 'admin' }, query: { company_id: 'C01', zone_id: 'Z01', periodKey: '202401' } };
            const res = mockRes();
            await getAllResourceDataWithHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('importDataResourceFromExcel', () => {
        test('imports successfully', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202401', data: { material: [] } } };
            const res = mockRes();
            await importDataResourceFromExcel(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('returns 400 when missing periodKey', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { data: {} } };
            const res = mockRes();
            await importDataResourceFromExcel(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when no data', async () => {
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202401', data: {} } };
            const res = mockRes();
            await importDataResourceFromExcel(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when import service fails', async () => {
            resoureceAndWasteService.processImportResourceData.mockResolvedValue({ isSuccess: false, message: 'Bad data' });
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202401', data: { material: [] } } };
            const res = mockRes();
            await importDataResourceFromExcel(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 on thrown error', async () => {
            resoureceAndWasteService.processImportResourceData.mockRejectedValue(new Error('import crash'));
            const req = { userDetails: { user_id: 'U001', company_id: 'C01', zone_id: 'Z01' }, body: { periodKey: '202401', data: { material: [] } } };
            const res = mockRes();
            await importDataResourceFromExcel(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('uploadFuelBillImage', () => {
        test('uploads successfully', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'el', fuelName: 'Điện', periodKey: '202401', billImage: null, save: jest.fn().mockResolvedValue() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01', zone_id: 'Z01', user_id: 'U001' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(uploadOrReuseAttachment).toHaveBeenCalled();
        });

        test('returns 400 when missing id', async () => {
            const req = { params: {}, user: { role: 'company' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when resource not found', async () => {
            FuelResourceModel.findById.mockResolvedValue(null);
            const req = { params: { id: 'R1' }, user: { role: 'company' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 403 for company role with different company', async () => {
            const resource = { _id: 'R1', company_id: 'C02', zone_id: 'Z01', main_group: 'el', save: jest.fn() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 403 for manager role with different zone', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z02', main_group: 'el', save: jest.fn() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'manager', zone_id: 'Z01' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 400 for unsupported main_group', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'co', save: jest.fn() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when no file', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'el', save: jest.fn() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rolls back Cloudinary on save error', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'el', fuelName: 'Điện', periodKey: '202401', billImage: null, save: jest.fn().mockRejectedValue(new Error('DB fail')) };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01', user_id: 'U001' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(destroyUnusedCloudinaryUrls).toHaveBeenCalledWith(['https://cloudinary.com/image.jpg']);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('destroys old image when replaced', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'wa', fuelName: 'Nước', periodKey: '202401', billImage: 'https://old.jpg', save: jest.fn().mockResolvedValue() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            uploadOrReuseAttachment.mockResolvedValue('https://new.jpg');
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01', user_id: 'U001' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(destroyUnusedCloudinaryUrls).toHaveBeenCalledWith(['https://old.jpg']);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('warns when history commit fails', async () => {
            commitChange.mockRejectedValue(new Error('history fail'));
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'el', fuelName: 'Điện', periodKey: '202401', billImage: null, save: jest.fn().mockResolvedValue() };
            FuelResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, user: { role: 'company', company_id: 'C01', user_id: 'U001' }, file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg', originalname: 'bill.jpg' } };
            const res = mockRes();
            await uploadFuelBillImage(req, res);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('history'), 'history fail');
        });
    });

    describe('uploadWasteAttachments', () => {
        test('uploads successfully', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'DO', attachments: [], save: jest.fn().mockResolvedValue() };
            WasteResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, userDetails: { role: 'company', company_id: 'C01', zone_id: 'Z01' }, files: [{ path: '/tmp/doc.pdf', mimetype: 'application/pdf', originalname: 'doc.pdf' }] };
            const res = mockRes();
            await uploadWasteAttachments(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].data.attachments).toHaveLength(1);
        });

        test('returns 404 when resource not found', async () => {
            WasteResourceModel.findById.mockResolvedValue(null);
            const req = { params: { id: 'R1' }, userDetails: { role: 'company', company_id: 'C01' } };
            const res = mockRes();
            await uploadWasteAttachments(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 403 for company with different company_id', async () => {
            const resource = { _id: 'R1', company_id: 'C02', zone_id: 'Z01', save: jest.fn() };
            WasteResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, userDetails: { role: 'company', company_id: 'C01' } };
            const res = mockRes();
            await uploadWasteAttachments(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 403 for manager with different zone_id', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z02', save: jest.fn() };
            WasteResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, userDetails: { role: 'manager', zone_id: 'Z01' } };
            const res = mockRes();
            await uploadWasteAttachments(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('rolls back Cloudinary on save error', async () => {
            const resource = { _id: 'R1', company_id: 'C01', zone_id: 'Z01', main_group: 'DO', attachments: [], save: jest.fn().mockRejectedValue(new Error('DB fail')) };
            WasteResourceModel.findById.mockResolvedValue(resource);
            const req = { params: { id: 'R1' }, userDetails: { role: 'company', company_id: 'C01' }, files: [{ path: '/tmp/doc.pdf', mimetype: 'application/pdf', originalname: 'doc.pdf' }] };
            const res = mockRes();
            await uploadWasteAttachments(req, res);
            expect(destroyUnusedCloudinaryUrls).toHaveBeenCalledWith(['https://cloudinary.com/image.jpg']);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
