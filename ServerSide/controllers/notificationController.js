const notificationService = require('../services/notificationService');
const notificationLogRepo = require('../dataAccess/notificationLogRepository');
const notificationRepo = require('../dataAccess/notificationRepository');
const NotificationInstance = require('../models/notificationInstanceModel');
const NotificationTemplate = require('../models/notificationTemplateModel');
const NotificationSendLog = require('../models/notificationSendLogModel');
const User = require('../models/userModel');
const { uploadOrReuseAttachment } = require('../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');

const parseRequestPayload = (req) => {
    if (typeof req.body?.data === 'string') {
        const parsed = JSON.parse(req.body.data);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    return req.body || {};
};

const normalizeAttachments = (attachments) => {
    if (!attachments) return [];
    if (typeof attachments === 'string') {
        try {
            return JSON.parse(attachments);
        } catch (_) {
            return [];
        }
    }
    return Array.isArray(attachments) ? attachments : [];
};

const uploadNotificationAttachments = async (files = []) => {
    const attachments = [];

    for (const file of files) {
        const url = await uploadOrReuseAttachment(file.path, {
            folder: CLOUDINARY_FOLDERS.notifications,
            resource_type: file.mimetype?.startsWith('image/') ? 'image' : 'raw',
            mime_type: file.mimetype,
            original_filename: file.originalname,
        });

        attachments.push({
            url,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size || 0,
        });
    }

    return attachments;
};

const cleanupRemovedAttachments = async (previousAttachments = [], nextAttachments = []) => {
    const nextUrls = new Set((nextAttachments || []).map((item) => item?.url).filter(Boolean));
    const removedUrls = (previousAttachments || [])
        .map((item) => item?.url)
        .filter((url) => url && !nextUrls.has(url));

    if (removedUrls.length > 0) {
        await destroyUnusedCloudinaryUrls(removedUrls);
    }
};

const createTemplate = async (req, res) => {
    let uploadedAttachments = [];
    try {
        const templateData = parseRequestPayload(req);
        uploadedAttachments = await uploadNotificationAttachments(req.files || []);
        templateData.attachments = [...normalizeAttachments(templateData.attachments), ...uploadedAttachments];
        const template = await notificationService.createTemplate(templateData, req.user);
        res.status(201).json({
            message: 'Mẫu thông báo được tạo thành công',
            template
        });
    } catch (error) {
        const attachmentUrls = uploadedAttachments.map((item) => item?.url).filter(Boolean);
        if (attachmentUrls.length > 0) {
            await destroyUnusedCloudinaryUrls(attachmentUrls);
        }
        res.status(400).json({ error: error.message });
    }
};

const updateTemplate = async (req, res) => {
    let uploadedAttachments = [];
    try {
        const template_id = req.params.template_id;
        const existingTemplate = await notificationRepo.findTemplateById(template_id);
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Không tìm thấy template' });
        }

        const updateData = parseRequestPayload(req);
        uploadedAttachments = await uploadNotificationAttachments(req.files || []);
        const existingAttachments = normalizeAttachments(updateData.existingAttachments ?? updateData.attachments ?? existingTemplate.attachments);
        updateData.attachments = [...existingAttachments, ...uploadedAttachments];
        delete updateData.existingAttachments;

        const template = await notificationService.updateTemplate(template_id, updateData, req.user);
        await cleanupRemovedAttachments(existingTemplate.attachments || [], template.attachments || []);
        res.status(200).json({
            message: 'Mẫu thông báo được cập nhật thành công',
            template
        });
    } catch (error) {
        const errorStatus = error.statusCode || 400;
        const attachmentUrls = uploadedAttachments.map((item) => item?.url).filter(Boolean);
        if (attachmentUrls.length > 0) {
            await destroyUnusedCloudinaryUrls(attachmentUrls);
        }
        res.status(errorStatus).json({ error: error.message, code: error.code || undefined });
    }
};

const disableTemplate = async (req, res) => {
    try {
        const template_id = req.params.template_id;
        await notificationService.disableTemplate(template_id, req.user);
        res.status(200).json({ message: 'Mẫu thông báo đã được tạm dừng' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getTemplates = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await notificationService.getTemplates(parseInt(page), parseInt(limit), req.user);

        res.status(200).json({
            message: 'Danh sách mẫu thông báo',
            ...result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getTemplateById = async (req, res) => {
    try {
        const { template_id } = req.params;
        const template = await notificationService.getTemplateById(template_id, req.user);

        res.status(200).json({
            message: 'Chi tiết template',
            template
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// notificationController.js
const sendNotification = async (req, res) => {
    try {
        const { template_id, target } = req.body;
        const sender_id = req.user.user_id;
        const sender_role = req.user.role;
        const sender_zone_id = req.user.zone_id;

        const result = await notificationService.sendNotification(
            template_id,
            target,
            sender_id,
            sender_role,
            sender_zone_id
        );

        res.status(200).json({
            message: 'Thông báo đã được gửi thành công',
            result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUserNotifications = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { page = 1, limit = 20, sender_role, status, sort, type, search, date_from, date_to } = req.query;
        const date_range = (date_from || date_to) ? { from: date_from, to: date_to } : undefined;
        const filters = { sender_role, status, sort, type, search, date_range };

        const result = await notificationService.getUserNotifications(
            user_id,
            parseInt(page),
            parseInt(limit),
            filters
        );

        if (result.notifications?.length > 0) {
            const templateIds = [...new Set(result.notifications.map(n => n.template_id))];

            // 1. Template thật → lấy created_by
            const realTemplates = await NotificationTemplate.find(
                { notification_T_id: { $in: templateIds } },
                { notification_T_id: 1, created_by: 1 }
            ).lean();

            const realSenderMap = Object.fromEntries(
                realTemplates.map(t => [t.notification_T_id, t.created_by])
            );

            // 2. Template tạm → lấy từ log (dùng repo function)
            const missingIds = templateIds.filter(id => !realSenderMap[id]);
            const logSenderMap = missingIds.length > 0
                ? await notificationLogRepo.getLatestSenderByTemplateIds(missingIds)
                : {};

            // Gộp lại
            const finalSenderMap = { ...realSenderMap };
            for (const [templateId, data] of Object.entries(logSenderMap)) {
                if (data.sent_by && !data.sent_by.startsWith('system')) {
                    finalSenderMap[templateId] = data.sent_by;
                }
            }

            // 3. Lấy thông tin user
            const senderIds = Object.values(finalSenderMap).filter(id => id && !id.startsWith('system'));
            const uniqueIds = [...new Set(senderIds)];

            const users = uniqueIds.length > 0
                ? await User.find({ user_id: { $in: uniqueIds } }, { user_id: 1, full_name: 1, role: 1, zone_id: 1 }).lean()
                : [];

            const userMap = Object.fromEntries(users.map(u => [u.user_id, { full_name: u.full_name, role: u.role, zone_id: u.zone_id }]));

            // 4. Gán sender
            result.notifications = result.notifications.map(n => ({
                ...n,
                sender: finalSenderMap[n.template_id]
                    ? userMap[finalSenderMap[n.template_id]] || null
                    : null
            }));
        }

        res.json({ message: 'Danh sách thông báo', ...result });
    } catch (error) {
        console.error('getUserNotifications error:', error);
        res.status(500).json({ error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notification_I_id = req.params.notification_I_id;
        const user_id = req.user.user_id;
        const notification = await notificationService.markAsRead(notification_I_id, user_id);
        res.status(200).json({
            message: 'Thông báo đã được đánh dấu là đã đọc',
            notification
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getSendHistory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sent_by,
            type,
            schedule_type,
            sender_role,
            sort = 'newest',
            date_from,
            date_to
        } = req.query;
        const filters = {};
        if (type) filters.type = type;
        if (schedule_type) filters.schedule_type = schedule_type;
        if (sent_by) filters.sent_by = sent_by;
        if (sender_role) filters.sender_role = sender_role;
        if (date_from || date_to) filters.date_range = { from: date_from, to: date_to };

        // TRUYỀN USER ĐỂ LỌC THEO ZONE
        const result = await notificationLogRepo.getLogs(
            parseInt(page),
            parseInt(limit),
            filters,
            req.user
        );

        // === SORT THEO THỜI GIAN GỬI ===
        result.logs.sort((a, b) => {
            const dateA = new Date(a.sent_at);
            const dateB = new Date(b.sent_at);

            if (sort === 'oldest') {
                return dateA - dateB;  // Cũ → mới
            }
            return dateB - dateA;     // Mới → cũ (mặc định)
        });

        res.status(200).json({
            message: 'Lịch sử gửi thông báo',
            ...result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getLogSenders = async (req, res) => {
    try {
        const { role } = req.query;
        const senders = await notificationLogRepo.getUniqueSenders(role, req.user);
        res.status(200).json({ senders });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const pinNotification = async (req, res) => {
    try {
        const { notification_I_id } = req.params;
        const user_id = req.user.user_id;

        const notification = await notificationRepo.findNotificationById(notification_I_id);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== user_id) throw new Error('Không có quyền');
        if (notification.pin) throw new Error('Thông báo đã được ghim');

        // ĐẾM SỐ ĐÃ GHIM
        const pinnedCount = await NotificationInstance.countDocuments({
            user_id,
            pin: true
        });

        if (pinnedCount >= 10) {
            throw new Error('Đã đạt giới hạn 10 thông báo ghim. Vui lòng bỏ ghim 1 thông báo trước.');
        }

        const updated = await notificationRepo.updateNotification(notification_I_id, {
            pin: true,
            updated_at: new Date()
        });

        res.json({ message: 'Đã ghim thông báo', notification: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const unpinNotification = async (req, res) => {
    try {
        const { notification_I_id } = req.params;
        const user_id = req.user.user_id;

        const notification = await notificationRepo.findNotificationById(notification_I_id);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== user_id) throw new Error('Không có quyền');

        const updated = await notificationRepo.updateNotification(notification_I_id, {
            pin: false,
            updated_at: new Date()
        });

        res.json({
            message: 'Đã bỏ ghim thông báo',
            notification: updated
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const restoreTemplate = async (req, res) => {
    try {
        const { template_id } = req.params;
        const template = await notificationService.restoreTemplate(template_id, req.user);
        res.json({ message: 'Đã khôi phục template', template });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const sendImmediateNotification = async (req, res) => {
    let uploadedAttachments = [];
    try {
        const data = parseRequestPayload(req);
        uploadedAttachments = await uploadNotificationAttachments(req.files || []);
        data.attachments = [...normalizeAttachments(data.attachments), ...uploadedAttachments];
        const { user_id: sender_id, role: sender_role, zone_id: sender_zone_id } = req.user;

        const result = await notificationService.sendImmediateNotification(data, sender_id, sender_role, sender_zone_id);
        res.status(200).json(result);
    } catch (error) {
        const attachmentUrls = uploadedAttachments.map((item) => item?.url).filter(Boolean);
        if (attachmentUrls.length > 0) {
            await destroyUnusedCloudinaryUrls(attachmentUrls);
        }
        res.status(400).json({ error: error.message });
    }
};

const hardDeleteTemplate = async (req, res) => {
    try {
        const { template_id } = req.params;
        const user = req.user;
        const existingTemplate = await notificationRepo.findTemplateById(template_id);
        const result = await notificationService.hardDeleteTemplate(template_id, user);
        if (existingTemplate?.attachments?.length) {
            await destroyUnusedCloudinaryUrls(existingTemplate.attachments.map((item) => item?.url).filter(Boolean));
        }
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getNotificationInstanceById = async (req, res) => {
    try {
        const { notification_I_id } = req.params;
        const user_id = req.user.user_id;

        const notification = await notificationRepo.findNotificationById(notification_I_id);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== user_id) throw new Error('Không có quyền truy cập thông báo này');

        let sender = null;

        // 1. Ưu tiên template thật
        const template = await NotificationTemplate.findOne(
            { notification_T_id: notification.template_id },
            { created_by: 1 }
        ).lean();

        let senderId = template?.created_by;

        // 2. Nếu không có → lấy từ log
        if (!senderId) {
            const logData = await notificationLogRepo.getLatestSenderByTemplateId(notification.template_id);
            senderId = logData?.sent_by;
        }

        // 3. Lấy thông tin user
        if (senderId && !senderId.startsWith('system')) {
            const user = await User.findOne(
                { user_id: senderId },
                { full_name: 1, role: 1 }
            ).lean();
            sender = user ? { full_name: user.full_name, role: user.role } : null;
        }

        res.json({
            message: 'Chi tiết thông báo',
            notification: {
                ...notification.toObject(),
                sender
            }
        });
    } catch (error) {
        console.error('getNotificationInstanceById error:', error);
        res.status(400).json({ error: error.message });
    }
};

const getSendLogById = async (req, res) => {
    try {
        const { log_id } = req.params;

        const log = await notificationLogRepo.findByLogId(log_id);
        if (!log) throw new Error('Không tìm thấy lịch sử gửi');

        // === PHÂN QUYỀN: Manager chỉ xem được log trong zone của mình ===
        if (req.user.role === 'manager') {
            const hasAccess = log.zone_ids?.includes(req.user.zone_id) || log.sent_by.startsWith('MG');
            if (!hasAccess) throw new Error('Bạn không có quyền xem lịch sử này');
        }

        res.json({
            message: 'Chi tiết lịch sử gửi',
            log
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// === DELETE NOTIFICATION (User xóa thông báo của mình) ===
const deleteNotification = async (req, res) => {
    try {
        const { notification_I_id } = req.params;
        const user_id = req.user.user_id;

        // Kiểm tra thông báo có tồn tại và thuộc về user này
        const notification = await notificationRepo.findNotificationById(notification_I_id);
        if (!notification) {
            return res.status(404).json({ error: 'Không tìm thấy thông báo' });
        }
        if (notification.user_id !== user_id) {
            return res.status(403).json({ error: 'Không có quyền xóa thông báo này' });
        }

        await notificationRepo.deleteNotification(notification_I_id);
        res.json({ message: 'Đã xóa thông báo thành công' });
    } catch (error) {
        console.error('deleteNotification error:', error);
        res.status(500).json({ error: error.message });
    }
};

// === DELETE MULTIPLE NOTIFICATIONS (User xóa nhiều thông báo) ===
const deleteMultipleNotifications = async (req, res) => {
    try {
        const { notification_I_ids } = req.body;
        const user_id = req.user.user_id;

        if (!Array.isArray(notification_I_ids) || notification_I_ids.length === 0) {
            return res.status(400).json({ error: 'Danh sách thông báo trống' });
        }

        const notifications = await NotificationInstance.find({
            notification_I_id: { $in: notification_I_ids },
        }).lean();

        const unauthorized = notifications.filter(n => n.user_id !== user_id);
        if (unauthorized.length > 0) {
            return res.status(403).json({
                error: 'Không có quyền xóa một số thông báo trong danh sách',
                count: unauthorized.length
            });
        }

        const validIds = notifications
            .filter(n => n.user_id === user_id)
            .map(n => n.notification_I_id);

        if (validIds.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy thông báo nào để xóa' });
        }

        const result = await notificationRepo.deleteMultipleNotifications(validIds);
        res.json({
            message: `Đã xóa ${result.deletedCount} thông báo thành công`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('deleteMultipleNotifications error:', error);
        res.status(500).json({ error: error.message });
    }
};

// === THU HỒI THÔNG BÁO BẰNG LOG_IDS HOẶC TEMPLATE_IDS ===
const revokeSendLogs = async (req, res) => {
    try {
        const { log_ids, template_ids } = req.body;
        const user = req.user;

        if ((!log_ids || log_ids.length === 0) && (!template_ids || template_ids.length === 0)) {
            return res.status(400).json({ error: 'Danh sách log_ids hoặc template_ids trống' });
        }

        let totalDeleted = 0;

        // 1. Nếu có log_ids, thu hồi chính xác theo đợt gửi
        if (log_ids && log_ids.length > 0) {
            const resultInst = await NotificationInstance.deleteMany({ log_id: { $in: log_ids } });
            await NotificationSendLog.deleteMany({ log_id: { $in: log_ids } });
            totalDeleted += resultInst.deletedCount;
        }

        // 2. Nếu có template_ids
        if (template_ids && template_ids.length > 0) {
            const templates = await NotificationTemplate.find({
                notification_T_id: { $in: template_ids }
            }).lean();

            if (templates.length > 0) {
                if (user.role === 'manager') {
                    const unauthorized = templates.filter(t => t.created_by !== user.user_id);
                    if (unauthorized.length > 0) {
                        return res.status(403).json({
                            error: 'Bạn không có quyền thu hồi thông báo từ mẫu do người khác tạo'
                        });
                    }
                }
                const resultInst = await NotificationInstance.deleteMany({ template_id: { $in: template_ids } });
                await NotificationSendLog.deleteMany({ template_id: { $in: template_ids } });
                totalDeleted += resultInst.deletedCount;
            }
        }

        res.json({
            message: `Tiến trình thu hồi hoàn tất. Đã xóa ${totalDeleted} thông báo từ người dùng.`,
            deletedCount: totalDeleted
        });
    } catch (error) {
        console.error('revokeSendLogs error:', error);
        res.status(500).json({ error: error.message });
    }
};

const estimateRecipients = async (req, res) => {
    try {
        const { target } = req.body;
        const count = await notificationService.estimateRecipients(target);
        res.json({ count });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createTemplate,
    updateTemplate,
    disableTemplate,
    getTemplates,
    sendNotification,
    getUserNotifications,
    markAsRead,
    getSendHistory,
    pinNotification,
    unpinNotification,
    restoreTemplate,
    getTemplateById,
    sendImmediateNotification,
    getLogSenders,
    hardDeleteTemplate,
    getNotificationInstanceById,
    getSendLogById,
    deleteNotification,
    deleteMultipleNotifications,
    revokeSendLogs,
    estimateRecipients
};
