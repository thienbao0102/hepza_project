const Company = require('../../models/companyModel');
const EnvironmentalReport = require('../../models/environmentalReportModel');
const ErrorLog = require('../../models/errorLog');
const FuelResource = require('../../models/fuelResourcesModel');
const IndustrialZone = require('../../models/industrialZoneModel');
const NotificationInstance = require('../../models/notificationInstanceModel');
const NotificationSendLog = require('../../models/notificationSendLogModel');
const NotificationTemplate = require('../../models/notificationTemplateModel');
const WasteBuyDemand = require('../../models/wasteBuyDemandModel');
const WasteResource = require('../../models/wasteResourcesModel');
const WasteSellOffer = require('../../models/wasteSellOfferModel');
const { destroyCloudinaryUrls } = require('../cloudinaryAssetUtils');

jest.mock('../../models/companyModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/environmentalReportModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/errorLog', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/fuelResourcesModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/industrialZoneModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/notificationInstanceModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/notificationSendLogModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/notificationTemplateModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/wasteBuyDemandModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/wasteResourcesModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/wasteSellOfferModel', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../cloudinaryAssetUtils', () => ({ destroyCloudinaryUrls: jest.fn().mockResolvedValue() }));

const { countCloudinaryUrlReferences, destroyUnusedCloudinaryUrls } = require('../cloudinaryReferenceTracker');

describe('cloudinaryReferenceTracker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Company.countDocuments.mockResolvedValue(0);
        EnvironmentalReport.countDocuments.mockResolvedValue(0);
        ErrorLog.countDocuments.mockResolvedValue(0);
        FuelResource.countDocuments.mockResolvedValue(0);
        IndustrialZone.countDocuments.mockResolvedValue(0);
        NotificationInstance.countDocuments.mockResolvedValue(0);
        NotificationSendLog.countDocuments.mockResolvedValue(0);
        NotificationTemplate.countDocuments.mockResolvedValue(0);
        WasteBuyDemand.countDocuments.mockResolvedValue(0);
        WasteResource.countDocuments.mockResolvedValue(0);
        WasteSellOffer.countDocuments.mockResolvedValue(0);
    });

    test('countCloudinaryUrlReferences returns 0 for empty url', async () => {
        const result = await countCloudinaryUrlReferences('');
        expect(result).toBe(0);
    });

    test('countCloudinaryUrlReferences returns 0 for null url', async () => {
        const result = await countCloudinaryUrlReferences(null);
        expect(result).toBe(0);
    });

    test('countCloudinaryUrlReferences sums all model counts', async () => {
        WasteBuyDemand.countDocuments.mockResolvedValue(1);
        WasteSellOffer.countDocuments.mockResolvedValue(2);
        WasteResource.countDocuments.mockResolvedValue(3);
        FuelResource.countDocuments.mockResolvedValue(4);
        IndustrialZone.countDocuments.mockResolvedValue(5);
        ErrorLog.countDocuments.mockResolvedValue(6);
        Company.countDocuments.mockResolvedValue(7);
        EnvironmentalReport.countDocuments.mockResolvedValue(8);
        NotificationTemplate.countDocuments.mockResolvedValue(9);
        NotificationSendLog.countDocuments.mockResolvedValue(10);
        NotificationInstance.countDocuments.mockResolvedValue(11);

        const result = await countCloudinaryUrlReferences('http://example.com/img.jpg');
        expect(result).toBe(66);
        expect(WasteBuyDemand.countDocuments).toHaveBeenCalledWith({ 'attachments.url': 'http://example.com/img.jpg' });
        expect(FuelResource.countDocuments).toHaveBeenCalledWith({ billImage: 'http://example.com/img.jpg' });
        expect(ErrorLog.countDocuments).toHaveBeenCalledWith({ $or: [{ screenshot: 'http://example.com/img.jpg' }, { screenshots: 'http://example.com/img.jpg' }] });
    });

    test('destroyUnusedCloudinaryUrls deletes urls with zero references', async () => {
        const result = await destroyUnusedCloudinaryUrls(['http://a.jpg', 'http://b.jpg']);
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith(['http://a.jpg', 'http://b.jpg']);
        expect(result).toEqual(['http://a.jpg', 'http://b.jpg']);
    });

    test('destroyUnusedCloudinaryUrls skips referenced urls', async () => {
        WasteResource.countDocuments.mockResolvedValueOnce(1).mockResolvedValue(0);
        const result = await destroyUnusedCloudinaryUrls(['http://a.jpg', 'http://b.jpg']);
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith(['http://b.jpg']);
        expect(result).toEqual(['http://b.jpg']);
    });

    test('destroyUnusedCloudinaryUrls deduplicates urls', async () => {
        const result = await destroyUnusedCloudinaryUrls(['http://a.jpg', 'http://a.jpg']);
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith(['http://a.jpg']);
        expect(result).toEqual(['http://a.jpg']);
    });

    test('destroyUnusedCloudinaryUrls filters falsy values', async () => {
        const result = await destroyUnusedCloudinaryUrls(['http://a.jpg', null, undefined, '']);
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith(['http://a.jpg']);
        expect(result).toEqual(['http://a.jpg']);
    });

    test('destroyUnusedCloudinaryUrls handles empty array', async () => {
        const result = await destroyUnusedCloudinaryUrls([]);
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith([]);
        expect(result).toEqual([]);
    });

    test('destroyUnusedCloudinaryUrls handles no arguments', async () => {
        const result = await destroyUnusedCloudinaryUrls();
        expect(destroyCloudinaryUrls).toHaveBeenCalledWith([]);
        expect(result).toEqual([]);
    });
});
