const { registerDomainHandlers } = require('./registerDomainHandlers');

const getNotificationService = () => require('../services/notificationService');
const getNotificationLogRepo = () => require('../dataAccess/notificationLogRepository');
const getNotificationRepo = () => require('../dataAccess/notificationRepository');
const getNotificationInstanceModel = () => require('../models/notificationInstanceModel');
const getNotificationTemplateModel = () => require('../models/notificationTemplateModel');
const getUserModel = () => require('../models/userModel');
const getActor = (socket) => socket.userDetails || socket.user || {};

const registerNotificationHandlers = (socket) => {
  registerDomainHandlers(socket, [
    // ─── Template CRUD ───
    {
      event: 'notification:template:create',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const template = await getNotificationService().createTemplate(payload || {}, actor.user_id);
        return { message: 'Mẫu thông báo được tạo thành công', template };
      },
    },
    {
      event: 'notification:template:update',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const templateId = payload?.template_id;
        const template = await getNotificationService().updateTemplate(templateId, payload || {}, actor.user_id);
        return { message: 'Mẫu thông báo được cập nhật thành công', template };
      },
    },
    {
      event: 'notification:template:disable',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const templateId = payload?.template_id || payload;
        await getNotificationService().disableTemplate(templateId, actor.user_id);
        return { message: 'Mẫu thông báo đã được tạm dừng' };
      },
    },
    {
      event: 'notification:template:getAll',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const { page = 1, limit = 10 } = payload || {};
        const result = await getNotificationService().getTemplates(parseInt(page), parseInt(limit), actor);
        return { message: 'Danh sách mẫu thông báo', ...result };
      },
    },
    {
      event: 'notification:template:getById',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const templateId = payload?.template_id || payload;
        const template = await getNotificationService().getTemplateById(templateId, actor);
        return { message: 'Chi tiết template', template };
      },
    },
    {
      event: 'notification:template:restore',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const templateId = payload?.template_id || payload;
        const template = await getNotificationService().restoreTemplate(templateId, actor.user_id);
        return { message: 'Đã khôi phục template', template };
      },
    },
    {
      event: 'notification:template:getDisabled',
      execute: async ({ payload }) => {
        const { page = 1, limit = 10 } = payload || {};
        const result = await getNotificationRepo().getDisabledTemplates(parseInt(page), parseInt(limit));
        return { message: 'Danh sách template đã vô hiệu hóa', ...result };
      },
    },
    {
      event: 'notification:template:hardDelete',
      execute: async ({ payload }) => {
        const templateId = payload?.template_id || payload;
        const result = await getNotificationService().hardDeleteTemplate(templateId);
        return result;
      },
    },

    // ─── Send ───
    {
      event: 'notification:send',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const { template_id, target } = payload || {};
        const result = await getNotificationService().sendNotification(
          template_id, target, actor.user_id, actor.role, actor.zone_id
        );
        return { message: 'Thông báo đã được gửi thành công', result };
      },
    },
    {
      event: 'notification:sendImmediate',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const result = await getNotificationService().sendImmediateNotification(
          payload || {}, actor.user_id, actor.role, actor.zone_id
        );
        return result;
      },
    },
    {
      event: 'notification:getSendHistory',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const { page = 1, limit = 10, sent_by, type, schedule_type, sort = 'newest' } = payload || {};
        const filters = {};
        if (type) filters.type = type;
        if (schedule_type) filters.schedule_type = schedule_type;
        if (sent_by) filters.sent_by = sent_by;

        const result = await getNotificationLogRepo().getLogs(parseInt(page), parseInt(limit), filters, actor);

        result.logs.sort((a, b) => {
          if (a.pin && !b.pin) return -1;
          if (!a.pin && b.pin) return 1;
          const dateA = new Date(a.sent_at);
          const dateB = new Date(b.sent_at);
          return sort === 'oldest' ? dateA - dateB : dateB - dateA;
        });

        return { message: 'Lịch sử gửi thông báo', ...result };
      },
    },

    // ─── Send Log Pin/Unpin ───
    {
      event: 'notification:log:pin',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const logId = payload?.log_id || payload;
        const notificationLogRepo = getNotificationLogRepo();

        const log = await notificationLogRepo.findByLogId(logId);
        if (!log) throw new Error('Không tìm thấy lịch sử gửi');
        if (log.pin) throw new Error('Lịch sử này đã được ghim');

        if (actor.role === 'manager') {
          const hasAccess = log.zone_ids?.includes(actor.zone_id);
          if (!hasAccess) throw new Error('Bạn không có quyền thao tác với lịch sử này');
        }

        let pinnedCount;
        if (actor.role === 'admin') {
          pinnedCount = await notificationLogRepo.countPinnedLogs();
        } else if (actor.role === 'manager') {
          pinnedCount = await notificationLogRepo.countPinnedLogsInZone(actor.zone_id);
        }
        if (pinnedCount >= 5) throw new Error('Đã đạt giới hạn 5 lịch sử ghim. Vui lòng bỏ ghim 1 cái trước.');

        const updated = await notificationLogRepo.findByLogIdAndUpdate(logId, { pin: true }, { new: true });
        return { message: 'Đã ghim lịch sử gửi', log: updated };
      },
    },
    {
      event: 'notification:log:unpin',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const logId = payload?.log_id || payload;
        const notificationLogRepo = getNotificationLogRepo();

        const log = await notificationLogRepo.findByLogId(logId);
        if (!log) throw new Error('Không tìm thấy lịch sử gửi');
        if (!log.pin) throw new Error('Lịch sử này chưa được ghim');

        if (actor.role === 'manager') {
          const hasAccess = log.zone_ids?.includes(actor.zone_id);
          if (!hasAccess) throw new Error('Bạn không có quyền thao tác với lịch sử này');
        }

        const updated = await notificationLogRepo.findByLogIdAndUpdate(logId, { pin: false }, { new: true });
        return { message: 'Đã bỏ ghim lịch sử gửi', log: updated };
      },
    },
    {
      event: 'notification:log:getById',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const logId = payload?.log_id || payload;
        const log = await getNotificationLogRepo().findByLogId(logId);
        if (!log) throw new Error('Không tìm thấy lịch sử gửi');

        if (actor.role === 'manager') {
          const hasAccess = log.zone_ids?.includes(actor.zone_id) || log.sent_by.startsWith('MG');
          if (!hasAccess) throw new Error('Bạn không có quyền xem lịch sử này');
        }

        return { message: 'Chi tiết lịch sử gửi', log };
      },
    },

    // ─── User Notifications ───
    {
      event: 'notification:user:getMy',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const { page = 1, limit = 10, sender_role, status, sort, type, search } = payload || {};
        const filters = { sender_role, status, sort, type, search };

        const result = await getNotificationService().getUserNotifications(
          actor.user_id, parseInt(page), parseInt(limit), filters
        );

        if (result.notifications?.length > 0) {
          const NotificationTemplate = getNotificationTemplateModel();
          const User = getUserModel();
          const notificationLogRepo = getNotificationLogRepo();

          const templateIds = [...new Set(result.notifications.map((n) => n.template_id))];
          const realTemplates = await NotificationTemplate.find(
            { notification_T_id: { $in: templateIds } },
            { notification_T_id: 1, created_by: 1 }
          ).lean();
          const realSenderMap = Object.fromEntries(realTemplates.map((t) => [t.notification_T_id, t.created_by]));

          const missingIds = templateIds.filter((id) => !realSenderMap[id]);
          const logSenderMap = missingIds.length > 0
            ? await notificationLogRepo.getLatestSenderByTemplateIds(missingIds)
            : {};

          const finalSenderMap = { ...realSenderMap };
          for (const [templateId, data] of Object.entries(logSenderMap)) {
            if (data.sent_by && !data.sent_by.startsWith('system')) {
              finalSenderMap[templateId] = data.sent_by;
            }
          }

          const senderIds = Object.values(finalSenderMap).filter((id) => id && !id.startsWith('system'));
          const uniqueIds = [...new Set(senderIds)];
          const users = uniqueIds.length > 0
            ? await User.find({ user_id: { $in: uniqueIds } }, { user_id: 1, full_name: 1, role: 1 }).lean()
            : [];
          const userMap = Object.fromEntries(users.map((u) => [u.user_id, { full_name: u.full_name, role: u.role }]));

          result.notifications = result.notifications.map((n) => ({
            ...n,
            sender: finalSenderMap[n.template_id] ? userMap[finalSenderMap[n.template_id]] || null : null,
          }));
        }

        return { message: 'Danh sách thông báo', ...result };
      },
    },
    {
      event: 'notification:user:markRead',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIId = payload?.notification_I_id || payload;
        const notification = await getNotificationService().markAsRead(notificationIId, actor.user_id);
        return { message: 'Thông báo đã được đánh dấu là đã đọc', notification };
      },
    },
    {
      event: 'notification:user:pin',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIId = payload?.notification_I_id || payload;
        const notificationRepo = getNotificationRepo();
        const NotificationInstance = getNotificationInstanceModel();

        const notification = await notificationRepo.findNotificationById(notificationIId);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== actor.user_id) throw new Error('Không có quyền');
        if (notification.pin) throw new Error('Thông báo đã được ghim');

        const pinnedCount = await NotificationInstance.countDocuments({ user_id: actor.user_id, pin: true });
        if (pinnedCount >= 5) throw new Error('Đã đạt giới hạn 5 thông báo ghim. Vui lòng bỏ ghim 1 thông báo trước.');

        const updated = await notificationRepo.updateNotification(notificationIId, { pin: true, updated_at: new Date() });
        return { message: 'Đã ghim thông báo', notification: updated };
      },
    },
    {
      event: 'notification:user:unpin',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIId = payload?.notification_I_id || payload;
        const notificationRepo = getNotificationRepo();

        const notification = await notificationRepo.findNotificationById(notificationIId);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== actor.user_id) throw new Error('Không có quyền');

        const updated = await notificationRepo.updateNotification(notificationIId, { pin: false, updated_at: new Date() });
        return { message: 'Đã bỏ ghim thông báo', notification: updated };
      },
    },
    {
      event: 'notification:user:getInstanceById',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIId = payload?.notification_I_id || payload;
        const notificationRepo = getNotificationRepo();
        const NotificationTemplate = getNotificationTemplateModel();
        const User = getUserModel();
        const notificationLogRepo = getNotificationLogRepo();

        const notification = await notificationRepo.findNotificationById(notificationIId);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== actor.user_id) throw new Error('Không có quyền truy cập thông báo này');

        let sender = null;
        const template = await NotificationTemplate.findOne(
          { notification_T_id: notification.template_id },
          { created_by: 1 }
        ).lean();
        let senderId = template?.created_by;

        if (!senderId) {
          const logData = await notificationLogRepo.getLatestSenderByTemplateId(notification.template_id);
          senderId = logData?.sent_by;
        }

        if (senderId && !senderId.startsWith('system')) {
          const user = await User.findOne({ user_id: senderId }, { full_name: 1, role: 1 }).lean();
          sender = user ? { full_name: user.full_name, role: user.role } : null;
        }

        return {
          message: 'Chi tiết thông báo',
          notification: { ...(notification.toObject ? notification.toObject() : notification), sender },
        };
      },
    },
    {
      event: 'notification:user:deleteOne',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIId = payload?.notification_I_id || payload;
        const notificationRepo = getNotificationRepo();

        const notification = await notificationRepo.findNotificationById(notificationIId);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.user_id !== actor.user_id) throw new Error('Không có quyền xóa thông báo này');

        await notificationRepo.deleteNotification(notificationIId);
        return { message: 'Đã xóa thông báo thành công' };
      },
    },
    {
      event: 'notification:user:deleteMany',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const notificationIIds = payload?.notification_I_ids || payload || [];
        const NotificationInstance = getNotificationInstanceModel();
        const notificationRepo = getNotificationRepo();

        if (!Array.isArray(notificationIIds) || notificationIIds.length === 0) throw new Error('Danh sách thông báo trống');
        if (notificationIIds.length > 100) throw new Error('Chỉ có thể xóa tối đa 100 thông báo mỗi lần');

        const notifications = await NotificationInstance.find({ notification_I_id: { $in: notificationIIds } }).lean();
        const unauthorized = notifications.filter((n) => n.user_id !== actor.user_id);
        if (unauthorized.length > 0) throw new Error('Không có quyền xóa một số thông báo trong danh sách');

        const validIds = notifications.filter((n) => n.user_id === actor.user_id).map((n) => n.notification_I_id);
        if (validIds.length === 0) throw new Error('Không tìm thấy thông báo nào để xóa');

        const result = await notificationRepo.deleteMultipleNotifications(validIds);
        return { message: `Đã xóa ${result.deletedCount} thông báo thành công`, deletedCount: result.deletedCount };
      },
    },

    // ─── Admin Operations ───
    {
      event: 'notification:admin:deleteOne',
      execute: async ({ payload }) => {
        const notificationIId = payload?.notification_I_id || payload;
        const notificationRepo = getNotificationRepo();

        const notification = await notificationRepo.findNotificationById(notificationIId);
        if (!notification) throw new Error('Không tìm thấy thông báo');

        await notificationRepo.deleteNotification(notificationIId);
        return { message: 'Admin đã xóa thông báo thành công', deletedNotificationId: notificationIId };
      },
    },
    {
      event: 'notification:admin:deleteByTemplate',
      execute: async ({ payload }) => {
        const templateId = payload?.template_id || payload;
        const NotificationInstance = getNotificationInstanceModel();

        const result = await NotificationInstance.deleteMany({ template_id: templateId });
        return {
          message: `Admin đã xóa ${result.deletedCount} thông báo từ template ${templateId}`,
          deletedCount: result.deletedCount,
          templateId,
        };
      },
    },
    {
      event: 'notification:admin:deleteMany',
      execute: async ({ payload }) => {
        const notificationIIds = payload?.notification_I_ids || payload || [];
        const notificationRepo = getNotificationRepo();

        if (!Array.isArray(notificationIIds) || notificationIIds.length === 0) throw new Error('Danh sách thông báo trống');
        if (notificationIIds.length > 100) throw new Error('Chỉ có thể xóa tối đa 100 thông báo mỗi lần');

        const result = await notificationRepo.deleteMultipleNotifications(notificationIIds);
        return { message: `Admin đã xóa ${result.deletedCount} thông báo thành công`, deletedCount: result.deletedCount };
      },
    },
    {
      event: 'notification:admin:deleteManySendLogs',
      execute: async ({ payload }) => {
        const logIds = payload?.log_ids || payload || [];
        if (!Array.isArray(logIds) || logIds.length === 0) throw new Error('Danh sách log trống');

        const result = await getNotificationLogRepo().deleteMultipleSendLogs(logIds);
        return { message: `Admin đã xóa ${result.deletedCount} lịch sử gửi thành công`, deletedCount: result.deletedCount };
      },
    },
  ]);
};

module.exports = { registerNotificationHandlers };
