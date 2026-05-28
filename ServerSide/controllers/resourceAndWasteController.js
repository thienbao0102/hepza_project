const { default: mongoose } = require('mongoose');
const resoureceAndWasteService = require('../services/resoureceAndWasteService');
const WasteResourceModel = require('../models/wasteResourcesModel');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const cacheManager = require('../lib/cacheManager');
const {
    getFuelBillFolder,
    getWasteAttachmentFolder,
} = require('../utils/cloudinaryFolders');

require('dotenv').config();

const MONTH_ALREADY_DECLARED_MESSAGE = 'Tháng này đã có dữ liệu tài nguyên/chất thải. Vui lòng vào trang cập nhật.';

const isMonthConflictError = (error) => {
    if (!error) return false;

    if (error.statusCode === 409 || error.code === 'MONTH_CONFLICT') {
        return true;
    }

    if (error.code !== 11000) {
        return false;
    }

    const keyPattern = error.keyPattern || {};
    const summaryKeys = ['company_id', 'zone_id', 'periodKey'];
    return summaryKeys.every(key => Object.prototype.hasOwnProperty.call(keyPattern, key));
};

// Retry helper cho transaction bị lock timeout
const runWithRetry = async (fn, maxRetries = 5) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            const isRetryable = error.hasErrorLabel?.('TransientTransactionError') ||
                error.message?.includes('Unable to acquire') ||
                error.code === 24; // LockTimeout
            if (isRetryable && attempt < maxRetries) {
                const delay = Math.min(100 * Math.pow(2, attempt), 2000);
                console.warn(`Transaction retry ${attempt}/${maxRetries}, waiting ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        } finally {
            session.endSession();
        }
    }
};

const invalidateResourceWasteCache = async (company_id, zone_id) => {
    try {
        const patterns = [
            // REST middleware cache — resource/waste endpoints
            `cache:role:*:*/api/resource-waste/get-data-resource*`,
            `cache:role:*:*/api/resource-waste/get-all-data-resource-with-history*`,
            // REST middleware cache — dashboard/summary/report endpoints affected by resource changes
            `cache:role:*:*/api/summary-record*`,
            `cache:role:*:*/api/report*`,
            `cache:role:*:*/api/emission*`,
            // Socket cache — resource/waste
            `cache:socket:resourceWaste:getData:*`,
            `cache:socket:resourceWaste:getAllWithHistory*`,
            // Socket cache — summary (dashboard depends on this)
            `cache:socket:summary:getRecord:*`,
            `cache:socket:summary:getByPeriodKey:*`,
            // Socket cache — emission (derived from resource data)
            `cache:socket:emission:getData:*`,
        ];

        console.log('[CACHE INVALIDATE] Patterns:', patterns);
        const results = await Promise.all(
            patterns.map((p) =>
                cacheManager.delByPattern(p).catch((e) => {
                    console.warn(`[CACHE INVALIDATE] Pattern failed: ${p}`, e.message);
                    return false;
                })
            )
        );
        console.log('[CACHE INVALIDATE] Done. Patterns:', patterns.length, 'Errors:', results.filter((r) => r === false).length);
    } catch (err) {
        console.warn('Cache invalidation failed (non-critical):', err.message);
    }
};

//insert data
const insertDataResourceAndWaste = async (req, res) => {
    try {
        const user = req.userDetails;
        const insertData = req.body;
        //handler get periodKey — ưu tiên từ FE, fallback tháng hiện tại
        let periodKey;
        if (insertData.periodKey) {
            periodKey = Number(insertData.periodKey);
            delete insertData.periodKey; // Xóa khỏi data trước khi truyền vào service
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            periodKey = Number(`${year}${month.toString().padStart(2, '0')}`);
        }
        const userId = user?.user_id || user?._id;

        console.time('[PERF] insert-transaction');
        const result = await runWithRetry(async (session) => {
            return await resoureceAndWasteService.processResourceDataCreate(insertData, user.company_id, user.zone_id, periodKey, session, userId);
        });
        console.timeEnd('[PERF] insert-transaction');

        if (!result?.success) {
            const statusCode = result.statusCode || (result.conflict ? 409 : 400);
            return res.status(statusCode).json({
                message: result.message || MONTH_ALREADY_DECLARED_MESSAGE,
                isSuccess: false,
                conflict: result.conflict || null,
            });
        }

        // Invalidate cache so new data appears immediately
        await invalidateResourceWasteCache(result.company_id, result.zone_id);

        // Recalculate summary in the background (DO NOT BLOCK HTTP)
        setImmediate(async () => {
            try {
                console.time(`[PERF] insert-recalculate-${result.company_id}`);
                await resoureceAndWasteService.recalculateSummaryRecord(result.company_id, result.zone_id, 'company', result.periodKey, null);
                console.timeEnd(`[PERF] insert-recalculate-${result.company_id}`);
            } catch (e) {
                console.warn('Post-tx recalculate failed (non-critical):', e.message);
            }
        });

        res.status(200).json({
            message: "success",
            isSuccess: true,
            createdFuelIds: result.createdFuelIds || [],
            createdWasteIds: result.createdWasteIds || []
        })
    } catch (error) {
        console.error("insertDataResourceAndWaste error:", error);
        if (isMonthConflictError(error)) {
            return res.status(409).json({
                message: MONTH_ALREADY_DECLARED_MESSAGE,
                isSuccess: false,
                conflict: 'month_exists',
            });
        }

        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//update data
const updateDataResourceAndWaste = async (req, res) => {
    try {
        const user = req.userDetails;
        const insertData = req.body;

        //handler get periodKey
        let periodKey;
        if (insertData.periodKey) {
            periodKey = Number(insertData.periodKey);
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            periodKey = Number(`${year}${month.toString().padStart(2, '0')}`);
        }

        const userId = user?.user_id || user?._id;

        console.time('[PERF] update-transaction');
        const result = await runWithRetry(async (session) => {
            return await resoureceAndWasteService.processResourceDataUpdate(insertData, user.company_id, periodKey, session, userId);
        });
        console.timeEnd('[PERF] update-transaction');

        if (!result?.success) {
            return res.status(400).json({ message: "failed", isSuccess: false });
        }

        // Invalidate cache so updated data appears immediately
        await invalidateResourceWasteCache(result.company_id, result.zone_id);

        // Recalculate summary in the background
        setImmediate(async () => {
            try {
                console.time(`[PERF] update-recalculate-${result.company_id}`);
                await resoureceAndWasteService.recalculateSummaryRecord(result.company_id, result.zone_id, 'company', result.periodKey, null);
                console.timeEnd(`[PERF] update-recalculate-${result.company_id}`);
            } catch (e) {
                console.warn('Post-tx recalculate failed (non-critical):', e.message);
            }
        });

        res.status(200).json({
            message: "success",
            isSuccess: true,
            createdFuelIds: result.createdFuelIds || [],
            createdWasteIds: result.createdWasteIds || []
        })
    } catch (error) {
        console.error("updateDataResourceAndWaste error:", error);
        res.status(error.statusCode || 400).json({
            error: error.message,
            code: error.code || undefined,
            isSuccess: false
        });
    }
}
//get data resource
const getDataResource = async (req, res) => {
    try {
        const user = req.userDetails;
        let { periodKeyStart, periodKeyEnd, include, company_id, zone_id } = req.query;

        if (!periodKeyStart && !periodKeyEnd) {
            return res.status(400).json({ message: "periodKeyStart and periodKeyEnd is required", isSuccess: false });
        }
        // lấy mảng include
        include = req.query["include[]"] || [1];

        // Ép kiểu mảng
        if (!Array.isArray(include)) include = [include];
        // Chuyển sang số
        include = include.map((v) => Number(v));
        //chuyển đổi qua số
        periodKeyStart = Number(periodKeyStart);
        periodKeyEnd = Number(periodKeyEnd);

        const dataResources = await resoureceAndWasteService
            .processGetListDataResource(periodKeyStart, periodKeyEnd, include, user.role, company_id, zone_id);

        res.status(200).json({ message: 'Get data Resources successfull', isSuccess: true, dataResources })
    } catch (error) {
        res.status(400).json({ error: error.message, isSuccess: false })
    }
}

//get all data resource with history
const getAllResourceDataWithHistory = async (req, res) => {
    try {
        const user = req.userDetails;
        const { company_id, zone_id, periodKey, periodKeys } = req.query;

        const include = [1, 2, 3, 4, 5, 6];

        if (periodKeys) {
            const keys = periodKeys.split(',').map(Number).filter(k => !isNaN(k) && k > 0);

            const MAX_PERIOD_KEYS = 12;
            if (keys.length > MAX_PERIOD_KEYS) {
                return res.status(400).json({ message: `Tối đa ${MAX_PERIOD_KEYS} kỳ`, isSuccess: false });
            }

            const promises = keys.map(key => resoureceAndWasteService.getAllResourceDataWithHistory(company_id, zone_id, key, include, user.role));
            const results = await Promise.all(promises);

            // Map results and add periodKey, then filter out months with completely no data or history
            const dataResources = results.map((result, index) => {
                return {
                    ...result,
                    periodKey: keys[index]
                };
            }).filter(item => {
                // return true if it has history or have some resource actual data
                const hasHistory = item.resource_change && item.resource_change.length > 0;
                const hasData = Object.keys(item).some(k => k !== 'resource_change' && k !== 'periodKey' && Array.isArray(item[k]) && item[k].length > 0);
                return hasHistory || hasData;
            });

            res.status(200).json({ message: 'Get all data Resources with history successfull', isSuccess: true, dataResources })
        } else {
            const dataResourcesRaw = await resoureceAndWasteService
                .getAllResourceDataWithHistory(company_id, zone_id, Number(periodKey), include, user.role);

            // To be consistent on frontend, wrap single object in array and inject periodKey
            const dataResources = [{ ...dataResourcesRaw, periodKey: Number(periodKey) }];

            res.status(200).json({ message: 'Get all data Resources with history successfull', isSuccess: true, dataResources })
        }
    }
    catch (error) {
        res.status(error.statusCode || 400).json({
            error: error.message,
            code: error.code || undefined,
            isSuccess: false
        })
    }
}

// Import data from Excel
const importDataResourceFromExcel = async (req, res) => {
    try {
        const user = req.userDetails;
        const { periodKey, data, options = {} } = req.body;

        if (!periodKey) {
            return res.status(400).json({ message: "periodKey is required", isSuccess: false });
        }

        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ message: "No data to import", isSuccess: false });
        }

        const userId = user?.user_id || user?._id;
        const company_id = user.company_id;
        const zone_id = user.zone_id;

        const result = await runWithRetry(async (session) => {
            return await resoureceAndWasteService.processImportResourceData(
                data,
                company_id,
                zone_id,
                Number(periodKey),
                session,
                userId,
                options
            );
        });

        if (!result.isSuccess) {
            return res.status(400).json({ message: result.message || "Import failed", isSuccess: false });
        }

        // Invalidate cache so imported data appears immediately
        await invalidateResourceWasteCache(result.company_id, result.zone_id);

        // Recalculate summary in the background
        setImmediate(async () => {
            try {
                await resoureceAndWasteService.recalculateSummaryRecord(result.company_id, result.zone_id, 'company', result.periodKey, null);
            } catch (e) {
                console.warn('Post-tx recalculate failed (non-critical):', e.message);
            }
        });

        res.status(200).json({
            message: "Import successful",
            isSuccess: true,
            summary: result.summary
        });
    } catch (error) {
        console.error("Import error:", error.message);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}

// Upload bill image for fuel resources (electricity/water)
const FuelResourceModel = require('../models/fuelResourcesModel');
const { uploadOrReuseAttachment } = require('../config/cloudinary');

const uploadFuelBillImage = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(400).json({ message: 'Resource ID is required', isSuccess: false });
        }

        // Find the resource first (needed for authorization + old image cleanup)
        const resource = await FuelResourceModel.findById(id);
        if (!resource) {
            return res.status(404).json({ message: 'Fuel resource not found', isSuccess: false });
        }

        // --- GAP FIX #1: Resource ownership authorization ---
        if (user.role === 'company' && String(resource.company_id) !== String(user.company_id)) {
            return res.status(403).json({
                message: 'You can only upload bill images for your own company resources',
                isSuccess: false
            });
        }
        if (user.role === 'manager' && String(resource.zone_id) !== String(user.zone_id)) {
            return res.status(403).json({
                message: 'You can only upload bill images for resources in your managed zone',
                isSuccess: false
            });
        }

        // --- GAP FIX #3: main_group validation ---
        if (!['el', 'wa'].includes(resource.main_group)) {
            return res.status(400).json({
                message: 'Bill images are only supported for electricity (el) and water (wa) resources',
                isSuccess: false
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided', isSuccess: false });
        }

        // Upload to Cloudinary (auto-deletes local temp file)
        const folder = getFuelBillFolder(resource.main_group);
        const imageUrl = await uploadOrReuseAttachment(req.file.path, {
            folder,
            resource_type: 'image',
            mime_type: req.file.mimetype,
            original_filename: req.file.originalname,
        });

        // Lưu URL vào FuelResource — rollback Cloudinary nếu save fail
        const oldBillImage = resource.billImage || null;
        resource.billImage = imageUrl;
        try {
            await resource.save();
        } catch (saveErr) {
            // Rollback: xóa file vừa upload lên Cloudinary
            await destroyUnusedCloudinaryUrls([imageUrl]);
            throw saveErr;
        }

        if (oldBillImage && oldBillImage !== imageUrl) {
            await destroyUnusedCloudinaryUrls([oldBillImage]);
        }

        // Invalidate cache so the updated bill image appears immediately
        invalidateResourceWasteCache(resource.company_id, resource.zone_id);

        // --- Log to history ---
        try {
            const { commitChange } = require('../services/versionManagerService');
            const sectionNameStr = resource.main_group === 'el' ? 'Điện' : resource.main_group === 'wa' ? 'Nước' : 'hạng mục';
            await commitChange({
                resourceType: 'FuelResource',
                resourceId: id,
                oldObj: { billImage: oldBillImage, fuelName: resource.fuelName },
                newObj: { billImage: imageUrl, fuelName: resource.fuelName },
                company_id: resource.company_id,
                zone_id: resource.zone_id,
                periodKey: resource.periodKey,
                modifiedBy: user?.user_id || user?._id,
                actionType: 'update',
                commitMessage: oldBillImage
                    ? `Thay đổi hóa đơn đính kèm cho ${sectionNameStr} - ${resource.fuelName || '(Không rõ tên)'}`
                    : `Thêm hóa đơn đính kèm cho ${sectionNameStr} - ${resource.fuelName || '(Không rõ tên)'}`,
                groupLabel: sectionNameStr
            });
        } catch (historyErr) {
            console.warn('Could not save history for bill image upload:', historyErr.message);
        }

        res.status(200).json({
            message: 'Bill image uploaded successfully',
            isSuccess: true,
            data: { imageUrl, resourceId: id }
        });
    } catch (error) {
        console.error('uploadFuelBillImage error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

const uploadWasteAttachments = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.userDetails;

        const resource = await WasteResourceModel.findById(id);
        if (!resource) {
            return res.status(404).json({ message: 'Waste resource not found', isSuccess: false });
        }

        if (user.role === 'company' && String(resource.company_id) !== String(user.company_id)) {
            return res.status(403).json({ message: 'You can only upload attachments for your own company resources', isSuccess: false });
        }
        if (user.role === 'manager' && String(resource.zone_id) !== String(user.zone_id)) {
            return res.status(403).json({ message: 'You can only upload attachments for resources in your managed zone', isSuccess: false });
        }

        const newAttachments = [];
        if (req.files && req.files.length > 0) {
            const { uploadOrReuseAttachment } = require('../config/cloudinary');
            const folder = getWasteAttachmentFolder(resource.main_group);

            for (const file of req.files) {
                const url = await uploadOrReuseAttachment(file.path, {
                    folder,
                    resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
                    mime_type: file.mimetype,
                    original_filename: file.originalname,
                });
                newAttachments.push({
                    url,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                });
            }
        }

        // Cập nhật record (hiện tại replace toàn bộ, do FE thường gửi đủ nếu muốn update). Nếu muốn merge có thể bổ sung logic sau.
        // Để linh hoạt, ta chỉ thêm file mới vào.
        const mergedAttachments = [...(resource.attachments || []), ...newAttachments];
        resource.attachments = mergedAttachments;
        try {
            await resource.save();
        } catch (saveErr) {
            // Rollback: xóa tất cả file vừa upload lên Cloudinary
            await destroyUnusedCloudinaryUrls(newAttachments.map((att) => att.url).filter(Boolean));
            throw saveErr;
        }

        // Invalidate cache so the updated attachments appear immediately
        invalidateResourceWasteCache(resource.company_id, resource.zone_id);

        res.status(200).json({
            message: 'Waste attachments uploaded successfully',
            isSuccess: true,
            data: { attachments: mergedAttachments, resourceId: id }
        });
    } catch (error) {
        console.error('uploadWasteAttachments error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

// getAllResourceDataWithHistory();
module.exports = {
    insertDataResourceAndWaste,
    getDataResource,
    updateDataResourceAndWaste,
    getAllResourceDataWithHistory,
    importDataResourceFromExcel,
    uploadFuelBillImage,
    uploadWasteAttachments,
    invalidateResourceWasteCache,
}
