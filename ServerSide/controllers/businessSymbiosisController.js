const businessSysmbiosisService = require('../services/businessSysmbiosisService');
const { uploadOrReuseAttachment } = require('../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');
const cacheManager = require('../lib/cacheManager');

const extractAttachmentUrl = (attachment) => {
    if (!attachment) return null;
    if (typeof attachment === 'string') return attachment;
    if (typeof attachment === 'object') return attachment.url || null;
    return null;
};

const rollbackUploadedAttachments = async (attachments = []) => {
    const urls = attachments.map((attachment) => extractAttachmentUrl(attachment)).filter(Boolean);
    if (urls.length > 0) {
        await destroyUnusedCloudinaryUrls(urls);
    }
};

const cleanupRemovedAttachments = async (previousAttachments = [], nextAttachments = []) => {
    const nextUrls = new Set(nextAttachments.map((attachment) => extractAttachmentUrl(attachment)).filter(Boolean));
    const removedUrls = previousAttachments
        .map((attachment) => extractAttachmentUrl(attachment))
        .filter((url) => url && !nextUrls.has(url));

    if (removedUrls.length > 0) {
        await destroyUnusedCloudinaryUrls(removedUrls);
    }
};

const invalidateSymbiosisCache = async () => {
    try {
        const patterns = [
            `cache:role:*:*/api/business-symbiosis/buy-demand/recommendations*`,
            `cache:role:*:*/api/business-symbiosis/sell-supply/recommendations*`,
        ];
        await Promise.all(patterns.map((p) => cacheManager.delByPattern(p).catch((e) => {
            console.warn(`[SYMBIOSIS CACHE INVALIDATE] Pattern failed: ${p}`, e.message);
            return false;
        })));
    } catch (err) {
        console.warn('Symbiosis cache invalidation failed (non-critical):', err.message);
    }
};

//recommendation list output by buy demand
const getBusinessSymbiosisByBuyDemand = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const buyDemandList = await businessSysmbiosisService.fetchBusinessSymbiosisByBuyDemand(companyId);
        res.status(200).json({ message: "success to get buy demand list", data: buyDemandList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//recommendation list input by sell supply
const getBusinessSymbiosisBySellSupply = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const sellSupplyList = await businessSysmbiosisService.fetchBusinessSymbiosisBySellSupply(companyId);
        res.status(200).json({ message: "success to get sell supply list", data: sellSupplyList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//insert data buy demand
const insertDataBusinessSymbiosisBuyDemand = async (req, res) => {
    try {
        const user = req.userDetails;
        // Multipart: body fields may be JSON strings
        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        // Upload files to Cloudinary
        const attachments = [];
        try {
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const url = await uploadOrReuseAttachment(file.path, {
                        folder: CLOUDINARY_FOLDERS.symbiosisBuyDemand,
                        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
                        mime_type: file.mimetype,
                        original_filename: file.originalname,
                    });
                    attachments.push({
                        url,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                    });
                }
            }

            const newData = await businessSysmbiosisService.processBusinessSymbiosisBuyDemandCreate(
                user.user_id, user.company_id, user.zone_id, { ...data, attachments }
            );

            invalidateSymbiosisCache();
            res.status(200).json({ message: "success to insert buy demand data", data: newData, isSuccess: true })
        } catch (error) {
            await rollbackUploadedAttachments(attachments);
            throw error;
        }
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//insert data sell supply
const insertDataBusinessSymbiosisSellSupply = async (req, res) => {
    try {
        const user = req.userDetails;
        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        // Upload files to Cloudinary
        const attachments = [];
        try {
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const url = await uploadOrReuseAttachment(file.path, {
                        folder: CLOUDINARY_FOLDERS.symbiosisSellSupply,
                        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
                        mime_type: file.mimetype,
                        original_filename: file.originalname,
                    });
                    attachments.push({
                        url,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                    });
                }
            }

            const newData = await businessSysmbiosisService.processBusinessSymbiosisSellSupplyCreate(
                user.user_id, user.company_id, user.zone_id, { ...data, attachments }
            );

            invalidateSymbiosisCache();
            res.status(200).json({ message: "success to insert sell supply data", data: newData, isSuccess: true })
        } catch (error) {
            await rollbackUploadedAttachments(attachments);
            throw error;
        }
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//get list data buy demand
const getBusinessSymbiosisBuyDemandList = async (req, res) => {
    try {
        const user = req.userDetails;
        const buyDemandList = await businessSysmbiosisService.getBusinessSymbiosisBuyDemandList(user.company_id);
        res.status(200).json({ message: "get list data buy demand success", data: buyDemandList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//get list data sell supply
const getBusinessSymbiosisSellSupplyList = async (req, res) => {
    try {
        const user = req.userDetails;
        const sellSupplyList = await businessSysmbiosisService.getBusinessSymbiosisSellSupplyList(user.company_id);
        res.status(200).json({ message: "get list data sell supply success", data: sellSupplyList, isSuccess: true });
    }
    catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//search and sort data output by buy demand
const recommandSearchBusinessSymbiosisByBuyDemand = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const { searchKey, sortKey, sortOrder } = req.query;
        const buyDemandList = await businessSysmbiosisService.searchAndSortBusinessSymbiosisByBuyDemand(companyId, searchKey, sortKey, sortOrder);
        res.status(200).json({ message: "search data success", data: buyDemandList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//search and sort data input by sell supply
const recommandSearchBusinessSymbiosisBySellSupply = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const { searchKey, sortKey, sortOrder } = req.query;
        const sellSupplyList = await businessSysmbiosisService.searchAndSortBusinessSymbiosisBySellSupply(companyId, searchKey, sortKey, sortOrder);
        res.status(200).json({ message: "search data success", data: sellSupplyList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//delete buy demand by id
const deleteBusinessSymbiosisBuyDemandById = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = req.userDetails;
        const result = await businessSysmbiosisService.deleteBusinessSymbiosisBuyDemandById(_id, user.company_id);
        if (!result) {
                return res.status(403).json({ error: "Unauthorized or record not found", isSuccess: false });
        }
        await destroyUnusedCloudinaryUrls((result.attachments || []).map((attachment) => attachment?.url).filter(Boolean));
        invalidateSymbiosisCache();
        res.status(200).json({ message: "delete buy demand success", isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//delete sell supply by id
const deleteBusinessSymbiosisSellSupplyById = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = req.userDetails;
        const result = await businessSysmbiosisService.deleteBusinessSymbiosisSellSupplyById(_id, user.company_id);
        if (!result) {
            return res.status(403).json({ error: "Unauthorized or record not found", isSuccess: false });
        }
        await destroyUnusedCloudinaryUrls((result.attachments || []).map((attachment) => attachment?.url).filter(Boolean));
        invalidateSymbiosisCache();
        res.status(200).json({ message: "delete sell supply success", isSuccess: true });
    }
    catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//update buy demand by id
const updateBusinessSymbiosisBuyDemandById = async (req, res) => {
    const newAttachments = [];
    try {
        const { _id } = req.params;
        const user = req.userDetails;
        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const currentRecord = await businessSysmbiosisService.getOwnedBuyDemandById(_id, user.company_id);
        if (!currentRecord) {
            return res.status(403).json({ error: "Unauthorized or record not found", isSuccess: false });
        }

        // Upload new files to Cloudinary
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadOrReuseAttachment(file.path, {
                    folder: CLOUDINARY_FOLDERS.symbiosisBuyDemand,
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

        // Merge: keep existing attachments that aren't removed + add new ones
        const existingAttachments = Array.isArray(data.existingAttachments) ? data.existingAttachments : [];
        const mergedAttachments = [...existingAttachments, ...newAttachments];
        delete data.existingAttachments;

        const updatedData = await businessSysmbiosisService.updateBusinessSymbiosisBuyDemandById(
            _id, user.company_id, { ...data, attachments: mergedAttachments }
        );
        await cleanupRemovedAttachments(currentRecord.attachments || [], mergedAttachments);
        invalidateSymbiosisCache();
        res.status(200).json({ message: "update buy demand success", data: updatedData, isSuccess: true });
    } catch (error) {
        if (newAttachments.length > 0) {
            await rollbackUploadedAttachments(newAttachments);
        }
        console.log("error", error);
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message, code: error.code || undefined, isSuccess: false });
    }
}
const updateBusinessSymbiosisSellSupplyById = async (req, res) => {
    const newAttachments = [];
    try {
        const { _id } = req.params;
        const user = req.userDetails;
        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const currentRecord = await businessSysmbiosisService.getOwnedSellSupplyById(_id, user.company_id);
        if (!currentRecord) {
            return res.status(403).json({ error: "Unauthorized or record not found", isSuccess: false });
        }

        // Upload new files to Cloudinary
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadOrReuseAttachment(file.path, {
                    folder: CLOUDINARY_FOLDERS.symbiosisSellSupply,
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

        const existingAttachments = Array.isArray(data.existingAttachments) ? data.existingAttachments : [];
        const mergedAttachments = [...existingAttachments, ...newAttachments];
        delete data.existingAttachments;

        const updatedData = await businessSysmbiosisService.updateBusinessSymbiosisSellSupplyById(
            _id, user.company_id, { ...data, attachments: mergedAttachments }
        );
        await cleanupRemovedAttachments(currentRecord.attachments || [], mergedAttachments);
        invalidateSymbiosisCache();
        res.status(200).json({ message: "update sell supply success", data: updatedData, isSuccess: true });
    } catch (error) {
        if (newAttachments.length > 0) {
            await rollbackUploadedAttachments(newAttachments);
        }
        console.log("error", error);
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message, code: error.code || undefined, isSuccess: false });
    }
}
//get all buy demand exlduding company
const findAllBuyDemandsExcludingCompany = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const buyDemandList = await businessSysmbiosisService.findAllBuyDemandsExcludingCompany(companyId);
        res.status(200).json({ message: "get all buy demands excluding company success", data: buyDemandList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}
//get all sell supply exlduding company
const findAllSellSuppliesExcludingCompany = async (req, res) => {
    try {
        const user = req.userDetails;
        const companyId = user.company_id;
        const sellSupplyList = await businessSysmbiosisService.findAllSellSuppliesExcludingCompany(companyId);
        res.status(200).json({ message: "get all sell supplies excluding company success", data: sellSupplyList, isSuccess: true });
    } catch (error) {
        console.log("error", error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
}// Proxy download file from Cloudinary (bypass CORS/401 for raw resources)
const proxyDownloadAttachment = async (req, res) => {
    try {
        const { url: originalUrl } = req.query;
        if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
            return res.status(400).json({ error: 'Invalid URL', isSuccess: false });
        }

        const https = require('https');
        const { cloudinary } = require('../config/cloudinary');
        const filename = req.query.filename || 'download';

        // Extract resource_type và public_id từ Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud}/{resource_type}/upload/{version}/{public_id}
        const urlMatch = originalUrl.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
        const resourceType = originalUrl.includes('/raw/upload/') ? 'raw' : 'image';

        let fetchUrl = originalUrl;

        // Nếu là raw resource, tạo signed URL
        if (resourceType === 'raw' && urlMatch) {
            const publicId = urlMatch[1].split('?')[0]; // giữ nguyên extension cho raw, bỏ query params
            fetchUrl = cloudinary.url(publicId, {
                resource_type: 'raw',
                type: 'upload',
                sign_url: true,
                secure: true,
            });
        }

        const parsedUrl = new URL(fetchUrl);
        https.get(parsedUrl, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                // KHÔNG forward 401/403 từ Cloudinary (sẽ trigger logout ở frontend)
                const safeStatus = [401, 403].includes(proxyRes.statusCode) ? 502 : proxyRes.statusCode;
                return res.status(safeStatus).json({ 
                    error: `Cloudinary returned ${proxyRes.statusCode}. File may require re-upload.`, 
                    isSuccess: false 
                });
            }

            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
            if (proxyRes.headers['content-length']) {
                res.setHeader('Content-Length', proxyRes.headers['content-length']);
            }
            proxyRes.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy download error:', err);
            res.status(500).json({ error: 'Download failed', isSuccess: false });
        });
    } catch (error) {
        console.error('Proxy download error:', error);
        res.status(500).json({ error: error.message, isSuccess: false });
    }
};

module.exports = {
    getBusinessSymbiosisByBuyDemand,
    getBusinessSymbiosisBySellSupply,
    insertDataBusinessSymbiosisBuyDemand,
    insertDataBusinessSymbiosisSellSupply,
    getBusinessSymbiosisBuyDemandList,
    getBusinessSymbiosisSellSupplyList,
    recommandSearchBusinessSymbiosisByBuyDemand,
    recommandSearchBusinessSymbiosisBySellSupply,
    deleteBusinessSymbiosisBuyDemandById,
    deleteBusinessSymbiosisSellSupplyById,
    updateBusinessSymbiosisBuyDemandById,
    updateBusinessSymbiosisSellSupplyById,
    findAllBuyDemandsExcludingCompany,
    findAllSellSuppliesExcludingCompany,
    proxyDownloadAttachment
}
