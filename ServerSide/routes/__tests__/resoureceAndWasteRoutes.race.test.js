const express = require('express');
const request = require('supertest');

const mockProcessResourceDataCreate = jest.fn();
const mockRecalculateSummaryRecord = jest.fn().mockResolvedValue(true);
const mockStartSession = jest.fn();

jest.mock('mongoose', () => ({
    default: {
        startSession: mockStartSession,
    },
}));

jest.mock('../../services/resoureceAndWasteService', () => ({
    processResourceDataCreate: (...args) => mockProcessResourceDataCreate(...args),
    recalculateSummaryRecord: (...args) => mockRecalculateSummaryRecord(...args),
}));

jest.mock('../../middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            role: 'company',
            user_id: 'U_TEST_RACE',
            company_id: 'KCN025DN00001',
            zone_id: 'KCN025',
        };
        req.userDetails = {
            user_id: 'U_TEST_RACE',
            role: 'company',
            company_id: 'KCN025DN00001',
            zone_id: 'KCN025',
            firstLogin: false,
        };
        next();
    },
    authorize: () => (req, res, next) => next(),
    checkFirstLogin: (req, res, next) => next(),
    checkAccessByRole: (req, res, next) => next(),
}));

jest.mock('../../middleware/csrf', () => ({
    verifyCsrfToken: (req, res, next) => next(),
}));

jest.mock('../../middleware/redisCache', () => () => (req, res, next) => next());
jest.mock('../../models/wasteResourcesModel', () => ({}));
jest.mock('../../models/fuelResourcesModel', () => ({}));
jest.mock('../../config/cloudinary', () => ({
    uploadOrReuseAttachment: jest.fn(),
}));
jest.mock('../../utils/cloudinaryReferenceTracker', () => ({
    destroyUnusedCloudinaryUrls: jest.fn(),
}));
jest.mock('../../utils/cloudinaryFolders', () => ({
    getFuelBillFolder: jest.fn(),
    getWasteAttachmentFolder: jest.fn(),
}));
jest.mock('../../config/multer', () => ({
    imageUpload: { single: () => (req, res, next) => next() },
    mixedUpload: { array: () => (req, res, next) => next() },
    processUploadedFiles: (req, res, next) => next(),
}));
jest.mock('../../utils/abbreviationInMemory', () => ({
    getCode: (name) => name,
    getName: (code) => code,
    loadAbbreviations: jest.fn().mockResolvedValue(),
    convertUsingGetName: (item) => item,
}));

process.env.NODE_ENV = 'test';

const resoureceAndWasteRoutes = require('../../routes/resoureceAndWasteRoutes');

const buildPayload = () => ({
    periodKey: 209912,
    'Nguyên vật liệu': {
        MET: Array.from({ length: 10 }, (_, index) => ({
            label: `Kim loại race ${index + 1}`,
            value: 1,
            unit: 'Tấn',
            note: `race-${index + 1}`,
        })),
    },
});

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(),
    abortTransaction: jest.fn().mockResolvedValue(),
    endSession: jest.fn(),
});

describe('POST /api/resource-waste/insert-data concurrency', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/resource-waste', resoureceAndWasteRoutes);

    beforeEach(() => {
        jest.clearAllMocks();
        mockStartSession
            .mockResolvedValueOnce(createSession())
            .mockResolvedValueOnce(createSession());
        mockProcessResourceDataCreate
            .mockResolvedValueOnce({
                success: true,
                company_id: 'KCN025DN00001',
                zone_id: 'KCN025',
                periodKey: 209912,
                createdFuelIds: [],
                createdWasteIds: [],
            })
            .mockResolvedValueOnce({
                success: false,
                statusCode: 409,
                conflict: 'month_exists',
                message: 'Tháng này đã có dữ liệu tài nguyên/chất thải. Vui lòng vào trang cập nhật.',
            });
    });

    test('only one of two simultaneous create requests succeeds', async () => {
        const payload = buildPayload();

        const [responseA, responseB] = await Promise.all([
            request(app).post('/api/resource-waste/insert-data').send(payload),
            request(app).post('/api/resource-waste/insert-data').send(payload),
        ]);

        const statuses = [responseA.status, responseB.status].sort();
        expect(statuses).toEqual([200, 409]);
        expect(mockProcessResourceDataCreate).toHaveBeenCalledTimes(2);
        expect(mockRecalculateSummaryRecord).toHaveBeenCalledTimes(1);
        expect([responseA.body, responseB.body]).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ isSuccess: true }),
                expect.objectContaining({
                    isSuccess: false,
                    conflict: 'month_exists',
                }),
            ])
        );
    });
});
