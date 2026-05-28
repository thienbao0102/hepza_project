const notificationRepo = require('../dataAccess/notificationRepository');
const { notificationQueue } = require('../queues/notificationQueue');
const { convertToCron } = require('../utils/cronConverter');
const { bullRedisClient } = require('../config/redis');
const { VersionConflictError } = require('../utils/conflictError');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');

/**
 * Chuẩn hóa loại thông báo (viết hoa chữ cái đầu) để khớp với Mongoose Enum
 */
const normalizeType = (type) => {
    if (!type) return 'Info';
    const lower = type.toLowerCase();
    if (lower === 'warning') return 'Warning';
    if (lower === 'reminder') return 'Reminder';
    return 'Info'; // Default
};

const getSchedulerId = (templateOrId) => {
    if (!templateOrId) return null;
    return typeof templateOrId === 'string'
        ? templateOrId
        : templateOrId.notification_T_id || null;
};

const removeJobSchedulerSafely = async (jobId) => {
    const schedulerId = getSchedulerId(jobId);

    try {
        if (schedulerId) {
            await notificationQueue.removeJobScheduler(schedulerId);
        }

        const schedulers = await notificationQueue.getJobSchedulers();
        const legacySchedulers = schedulers.filter((scheduler) => {
            const schedulerIdentity = scheduler.id || scheduler.key || '';
            const schedulerTemplateId = scheduler.template?.data?.template_id;
            return scheduler.name === 'send-notification' && (
                schedulerIdentity.includes(jobId) ||
                schedulerTemplateId === jobId
            );
        });

        for (const scheduler of legacySchedulers) {
            await notificationQueue.removeJobScheduler(scheduler.id || scheduler.key);
        }
    } catch (err) {
        console.warn(`[removeJob] Failed to remove scheduler for ${jobId}:`, err.message);
    }
};

const initializeScheduledNotificationsSafely = async () => {
    const templates = await notificationRepo.find({
        isActive: true,
        'schedule.type': { $in: ['RECURRING', 'ONE_TIME'] }
    });

    const activeTemplateIds = new Set(templates.map((template) => template.notification_T_id));

    try {
        const existingSchedulers = await notificationQueue.getJobSchedulers();
        for (const scheduler of existingSchedulers) {
            const schedulerIdentity = scheduler.id || scheduler.key;
            const schedulerTemplateId = scheduler.template?.data?.template_id;
            const trackedTemplateId = activeTemplateIds.has(schedulerIdentity)
                ? schedulerIdentity
                : schedulerTemplateId;

            if (!trackedTemplateId || !activeTemplateIds.has(trackedTemplateId)) {
                await notificationQueue.removeJobScheduler(scheduler.id || scheduler.key);
            }
        }
    } catch (err) {
        console.warn('[Init] Failed to cleanup legacy schedulers:', err.message);
    }

    for (const template of templates) {
        try {
            await scheduleJob(template);
        } catch (err) {
            console.warn(`[Init] Failed to schedule template ${template.notification_T_id}:`, err.message);
        }
    }
};

/**
 * XÓA HOÀN TOÀN JOB (bao gồm RECURRING, ONE_TIME, IMMEDIATE)
 */
const removeJob = async (jobId) => {
    await removeJobSchedulerSafely(jobId);

    try {
        const job = await notificationQueue.getJob(jobId);
        if (job) {
            await job.remove();
        }
    } catch (err) {
        console.warn(`[removeJob] Failed to remove job instance ${jobId}:`, err.message);
    }

    const pattern = `bull:${notificationQueue.name}:${jobId}*`;
    const keys = await bullRedisClient.keys(pattern);
    if (keys.length > 0) {
        await bullRedisClient.del(...keys);
    }

    await bullRedisClient.del(`bull:${notificationQueue.name}:id:${jobId}`);

    const sets = ['delayed', 'waiting', 'failed', 'completed', 'active'];
    for (const set of sets) {
        await bullRedisClient.zrem(`bull:${notificationQueue.name}:${set}`, jobId);
    }
};

/**
 * Thêm/Cập nhật một job trong queue dựa trên template
 */
const scheduleJob = async (template) => {
    const jobId = template.notification_T_id;

    await removeJob(jobId);

    if (!template.isActive) {
        return;
    }

    const jobData = {
        template_id: template.notification_T_id,
        target: template.target,
        admin_id: template.created_by
    };

    if (template.schedule.type === 'RECURRING') {
        const cronPattern = template.schedule?.cronString?.trim();
        if (!cronPattern) {
            throw new Error(`Template ${jobId} thiếu cronString cho lịch gửi định kỳ.`);
        }

        const repeatOptions = {
            pattern: cronPattern,
            tz: 'Asia/Ho_Chi_Minh'
        };

        await notificationQueue.upsertJobScheduler(jobId, repeatOptions, {
            name: 'send-notification',
            data: jobData,
            opts: {
                removeOnComplete: true,
                removeOnFail: { count: 50, age: 24 * 3600 }
            }
        });

        if (template.repeatJobKey !== jobId) {
            await notificationRepo.updateTemplate(jobId, { repeatJobKey: jobId });
        }
        return;
    } else if (template.schedule.type === 'ONE_TIME') {
        const sendAtMs = new Date(template.schedule.sendAt).getTime();
        if (Number.isNaN(sendAtMs)) {
            throw new Error(`Template ${jobId} có thời gian gửi không hợp lệ.`);
        }

        const delay = sendAtMs - Date.now();
        if (delay > -120000) {
            await notificationQueue.add('send-notification', jobData, {
                jobId,
                delay: Math.max(0, delay),
                removeOnComplete: true,
            });
        }
        return;
    }

    if (template.schedule.type === 'IMMEDIATE') {
        await notificationQueue.add('send-notification', jobData, { jobId });
    }
};

const resolveRecurringCronString = (schedule, existingSchedule = null) => {
    if (schedule?.type !== 'RECURRING') {
        return null;
    }

    if (typeof schedule?.cronString === 'string' && schedule.cronString.trim()) {
        return schedule.cronString.trim();
    }

    if (schedule?.repeat) {
        return convertToCron(schedule);
    }

    if (existingSchedule?.type === 'RECURRING' && typeof existingSchedule?.cronString === 'string' && existingSchedule.cronString.trim()) {
        return existingSchedule.cronString.trim();
    }

    throw new Error('Thiếu cấu hình lịch gửi định kỳ.');
};

const resolveOneTimeSendAt = (schedule, existingSchedule = null) => {
    if (schedule?.type !== 'ONE_TIME') {
        return null;
    }

    const rawSendAt = schedule?.sendAt ?? existingSchedule?.sendAt;
    if (!rawSendAt) {
        throw new Error('Thiếu thời gian gửi cho lịch một lần.');
    }

    const sendAt = new Date(rawSendAt);
    if (Number.isNaN(sendAt.getTime())) {
        throw new Error('sendAt không hợp lệ (ISO string)');
    }

    const hasExplicitNewSendAt = schedule?.sendAt !== undefined && schedule?.sendAt !== null;
    const existingSendAtMs = existingSchedule?.sendAt ? new Date(existingSchedule.sendAt).getTime() : null;
    const isChangedSendAt = !hasExplicitNewSendAt
        ? false
        : existingSendAtMs === null || sendAt.getTime() !== existingSendAtMs;

    if (isChangedSendAt && sendAt <= new Date()) {
        throw new Error('Thời gian gửi phải lớn hơn hiện tại');
    }

    return sendAt;
};

const createTemplate = async (templateData, user) => {

    const createdBy = user.user_id;

    // KIỂM TRA GIỚI HẠN SỐ LƯỢNG TEMPLATE
    if (user.role === 'admin') {
        const adminCount = await notificationRepo.countAdminTemplates();
        if (adminCount >= 10) {
            throw new Error('Hệ thống đã đạt giới hạn tối đa 10 mẫu thông báo dành cho Admin. Vui lòng xóa bớt.');
        }
    } else if (user.role === 'manager') {
        const managerCount = await notificationRepo.countManagerTemplates(createdBy);
        if (managerCount >= 5) {
            throw new Error('Bạn đã đạt giới hạn tối đa 5 mẫu thông báo. Vui lòng xóa bớt.');
        }
    }

    const { schedule } = templateData;

    let cronString = null;
    let sendAt = null;

    if (schedule?.type === 'RECURRING') {
        cronString = resolveRecurringCronString(schedule);
    } else if (schedule?.type === 'ONE_TIME') {
        sendAt = resolveOneTimeSendAt(schedule);
    } else if (!['IMMEDIATE', 'MANUAL'].includes(schedule?.type)) {
        throw new Error('schedule.type phải là IMMEDIATE, ONE_TIME, RECURRING hoặc MANUAL');
    }

    const finalData = {
        ...templateData,
        attachments: Array.isArray(templateData.attachments) ? templateData.attachments : [],
        type: normalizeType(templateData.type),
        schedule: {
            type: schedule?.type || 'MANUAL',
            cronString,
            sendAt
        },
        created_by: createdBy,
        creator_role: user.role,
        updated_by: createdBy
    };

    try {
        const template = await notificationRepo.createTemplate(finalData);
        // CHỈ LÊN LỊCH NẾU KHÔNG PHẢI MANUAL
        if (template.schedule.type !== 'MANUAL') {
            await scheduleJob(template);
        }
        return template;
    } catch (error) {
        if (Array.isArray(finalData.attachments) && finalData.attachments.length > 0) {
            await destroyUnusedCloudinaryUrls(finalData.attachments.map((item) => item?.url).filter(Boolean));
        }
        if (error.code === 11000 && error.keyPattern?.name) {
            throw new Error('Tên template đã tồn tại');
        }
        throw error;
    }
};

const updateTemplate = async (template_id, updateData, user) => {
    const existingTemplate = await notificationRepo.findTemplateById(template_id);
    if (!existingTemplate) throw new Error('Không tìm thấy template');

    // Manager chỉ được update template của mình
    // Admin có thể update bất kỳ template nào trong kho admin chung
    if (user.role === 'manager' && existingTemplate.created_by !== user.user_id) {
        throw new Error('Bạn không có quyền cập nhật template này');
    }
    if (user.role === 'admin' && existingTemplate.creator_role !== 'admin') {
        throw new Error('Bạn không có quyền cập nhật template này');
    }

    const { schedule } = updateData;

    let cronString = null;
    let sendAt = null;

    if (schedule?.type === 'RECURRING') {
        cronString = resolveRecurringCronString(schedule, existingTemplate.schedule);
    } else if (schedule?.type === 'ONE_TIME') {
        sendAt = resolveOneTimeSendAt(schedule, existingTemplate.schedule);
    } else if (!['IMMEDIATE', 'MANUAL'].includes(schedule?.type)) {
        throw new Error('schedule.type phải là IMMEDIATE, ONE_TIME, RECURRING hoặc MANUAL');
    }

    const finalData = {
        ...updateData,
        type: updateData.type !== undefined ? normalizeType(updateData.type) : existingTemplate.type,
        schedule: {
            type: schedule?.type || existingTemplate.schedule?.type || 'MANUAL',
            cronString,
            sendAt
        },
        updated_by: user.user_id,
        updated_at: new Date()
    };

    // Lấy trạng thái hoạt động: ưu tiên dữ liệu gửi lên, nếu không có thì lấy giá trị cũ
    let currentIsActive = finalData.isActive !== undefined ? finalData.isActive : existingTemplate.isActive;

    // NẾU người dùng thay đổi lịch trình cho ONE_TIME thì TỰ ĐỘNG BẬT LẠI (Re-enable)
    if (finalData.isActive === undefined && finalData.schedule.type === 'ONE_TIME') {
        currentIsActive = true;
        finalData.isActive = true;
    }

    const template = await notificationRepo.updateTemplate(template_id, finalData);

    if (!template) {
        if (updateData.__v !== undefined) {
            throw new VersionConflictError();
        }
        throw new Error('Cập nhật thất bại hoặc không tìm thấy template (có thể do sai version)');
    }

    try {
        const { getIo } = require('../config/socket');
        const io = getIo();
        if (io) {
            io.emit('template:updated', {
                template_id: template_id,
                updated_by: user.user_id,
                __v: template.__v
            });
        }
    } catch (_) { /* best effort */ }

    // NẾU CHUYỂN SANG INACTIVE (hoặc template vốn Inactive) → DỪNG HOÀN TOÀN
    if (!currentIsActive) {
        await removeJob(template_id);
        return template;
    }

    // Nếu vẫn active → lên lịch lại
    await scheduleJob(template);
    return template;
};

const disableTemplate = async (template_id, user) => {
    const template = await notificationRepo.findTemplateById(template_id);
    if (!template) throw new Error('Không tìm thấy template');

    // Manager chỉ disable template của mình; admin có thể disable bất kỳ template admin nào
    if (user.role === 'manager' && template.created_by !== user.user_id) {
        throw new Error('Bạn không có quyền tạm dừng template này');
    }
    if (user.role === 'admin' && template.creator_role !== 'admin') {
        throw new Error('Bạn không có quyền tạm dừng template này');
    }

    if (!['RECURRING', 'ONE_TIME'].includes(template.schedule.type)) {
        throw new Error('Chỉ có thể tạm dừng/khởi động mẫu thông báo có lịch trình (Tự động hoặc Lặp lại). Lịch trình thủ công hoặc ngay lập tức không hỗ trợ chức năng này.');
    }

    if (!template.isActive) throw new Error('Mẫu thông báo này đang ở trạng thái dừng');

    const updated = await notificationRepo.updateTemplate(template_id, {
        isActive: false,
        updated_by: user.user_id,
        updated_at: new Date()
    });

    await removeJob(template_id); // Dừng job
    return updated;
};

const getTemplates = async (page, limit, user) => {
    return await notificationRepo.getTemplates(page, limit, user);
};

const sendNotification = async (template_id, target, sender_id, sender_role, sender_zone_id) => {
    const template = await notificationRepo.findTemplateById(template_id);
    if (!template) throw new Error('Không tìm thấy template');

    // === PHÂN QUYỀN GỬI: MANAGER LOGIC CŨ ĐÃ BỎ ===
    // Giờ manager tự tạo template, chỉ verify họ đang gửi đúng zone của họ
    // === PHÂN QUYỀN GỬI: Đảm bảo chỉ gửi template hợp lệ ===
    if (['manager', 'admin'].includes(sender_role)) {
        // Admin có thể gửi từ bất kỳ template nào trong kho admin chung
        // Manager chỉ được gửi từ template của chính mình
        const isAdminSendingAdminTemplate = sender_role === 'admin' && template.creator_role === 'admin';
        if (!isAdminSendingAdminTemplate && template.created_by !== sender_id) {
            throw new Error('Bạn không có quyền gửi thông báo từ mẫu này');
        }

        // Nếu là manager, giới hạn thêm target theo zone
        if (sender_role === 'manager') {
            target = {
                ...target,
                zone_ids: [sender_zone_id],
                roles: ['company']
            };
        }
    }

    // === THÊM VÀO QUEUE ===
    const job = await notificationQueue.add('send-notification', {
        template_id: template.notification_T_id,
        target: target || template.target,
        admin_id: sender_id,
        schedule_type: 'IMMEDIATE'
    });

    return { jobId: job.id };
};

const getUserNotifications = async (user_id, page, limit, filters) => {
    return await notificationRepo.getUserNotifications(user_id, page, limit, filters);
};

const markAsRead = async (notification_I_id, user_id) => {
    const notification = await notificationRepo.findNotificationById(notification_I_id);
    if (!notification) throw new Error('Không tìm thấy thông báo');
    if (notification.user_id !== user_id) throw new Error('Không có quyền truy cập');

    return await notificationRepo.updateNotification(notification_I_id, {
        status: 'read',
        readAt: new Date()
    });
};

const restoreTemplate = async (template_id, user) => {
    const template = await notificationRepo.findTemplateById(template_id);
    if (!template) throw new Error('Không tìm thấy template');

    // Manager chỉ restore template của mình; admin có thể restore bất kỳ template admin nào
    if (user.role === 'manager' && template.created_by !== user.user_id) {
        throw new Error('Bạn không có quyền khởi động lại template này');
    }
    if (user.role === 'admin' && template.creator_role !== 'admin') {
        throw new Error('Bạn không có quyền khởi động lại template này');
    }

    if (!['RECURRING', 'ONE_TIME'].includes(template.schedule.type)) {
        throw new Error('Chỉ có thể tạm dừng/khởi động mẫu thông báo có lịch trình (Tự động hoặc Lặp lại).');
    }

    const updated = await notificationRepo.updateTemplate(template_id, {
        isActive: true,
        updated_by: user.user_id,
        updated_at: new Date()
    });

    // KHÔI PHỤC LỊCH
    await scheduleJob(updated);

    return updated;
};

// Hàm này sẽ được gọi 1 LẦN DUY NHẤT khi server khởi động
const initializeScheduledNotifications = async () => {
    const lockKey = `bull:${notificationQueue.name}:init_lock`;
    const locked = await bullRedisClient.set(lockKey, '1', 'EX', 300, 'NX');
    if (!locked) {
        return;
    }

    await initializeScheduledNotificationsSafely();
};

const getTemplateById = async (template_id, user) => {
    const template = await notificationRepo.findTemplateById(template_id);
    if (!template) throw new Error("Không tìm thấy template");

    // Manager chỉ xem template của mình; admin xem được toàn bộ kho admin chung
    if (user.role === 'manager' && template.created_by !== user.user_id) {
        throw new Error("Bạn không có quyền xem template này");
    }
    if (user.role === 'admin' && template.creator_role !== 'admin') {
        throw new Error("Bạn không có quyền xem template này");
    }

    return template;
};

const sendImmediateNotification = async (data, sender_id, sender_role, sender_zone_id) => {
    const { name, title, body, type, attachments = [] } = data;
    let { target } = data;

    // === PHÂN QUYỀN GỬI: MANAGER LOGIC ===
    if (sender_role === 'manager') {
        // Manager chỉ được gửi cho company trong zone của mình
        target = {
            ...target,
            zone_ids: [sender_zone_id],
            roles: ['company']
        };
    }

    const tempTemplate = {
        notification_T_id: `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || `Tạm thời - ${new Date().toLocaleString('vi-VN')}`,
        title,
        body,
        attachments,
        type: normalizeType(type),
        target,
        schedule: { type: 'IMMEDIATE' },
        created_by: sender_id
    };

    const job = await notificationQueue.add('send-notification', {
        template_id: tempTemplate.notification_T_id,
        target: target,
        admin_id: sender_id,
        schedule_type: 'IMMEDIATE',
        _tempTemplate: tempTemplate
    });

    return { jobId: job.id, message: 'Đã gửi thông báo ngay lập tức' };
};

const hardDeleteTemplate = async (template_id, user) => {
    const template = await notificationRepo.findTemplateById(template_id);
    if (!template) throw new Error('Không tìm thấy template');

    // Manager chỉ xóa template của mình; admin có thể xóa bất kỳ template admin nào
    if (user.role === 'manager' && template.created_by !== user.user_id) {
        throw new Error('Bạn không có quyền xóa mẫu thông báo này');
    }
    if (user.role === 'admin' && template.creator_role !== 'admin') {
        throw new Error('Bạn không có quyền xóa mẫu thông báo này');
    }

    await removeJob(template_id); // Xóa job (nếu có) trước
    await notificationRepo.deleteOne({ notification_T_id: template_id }); // XÓA MẠNH TRONG DB

    return { message: 'Mẫu thông báo đã bị xóa vĩnh viễn' };
};

const estimateRecipients = async (target) => {
    const { roles, zone_ids, company_ids } = target || {};
    if (!roles || roles.length === 0) return 0;

    let finalCompanyIds = [];
    if (roles.includes("company")) {
        if (company_ids && company_ids.length > 0) {
            finalCompanyIds = company_ids;
        } else if (zone_ids && zone_ids.length > 0) {
            const Company = require('../models/companyModel');
            const companiesInZones = await Company.find({ zone_id: { $in: zone_ids }, deleted_at: null }, { company_id: 1 }).lean();
            finalCompanyIds = companiesInZones.map(c => c.company_id);
        }
    }

    const User = require('../models/userModel');
    let totalCount = 0;

    for (const role of roles) {
        let query = { deleted_at: null, role: role };
        
        if (role === 'company') {
            if (finalCompanyIds.length > 0) {
                query.company_id = { $in: finalCompanyIds };
            } else if (zone_ids && zone_ids.length > 0) {
                // Nếu chưa có finalCompanyIds nhưng có lọc zone, có thể dùng zone_id làm fallback
                query.zone_id = { $in: zone_ids };
            }
        } else if (role === 'manager' && zone_ids && zone_ids.length > 0) {
            query.zone_id = { $in: zone_ids };
        }
        
        totalCount += await User.countDocuments(query);
    }

    return totalCount;
};

module.exports = {
    createTemplate,
    updateTemplate,
    disableTemplate,
    hardDeleteTemplate,
    getTemplates,
    sendNotification,
    getUserNotifications,
    markAsRead,
    initializeScheduledNotifications,
    restoreTemplate,
    getTemplateById,
    sendImmediateNotification,
    estimateRecipients
};
