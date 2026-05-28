import {
    CREATE_TEMPLATE_ROUTE,
    UPDATE_TEMPLATE_ROUTE,
    GET_TEMPLATES_ROUTE,
    SEND_NOTIFICATION_ROUTE,
    GET_USER_NOTIFICATIONS_ROUTE,
    MARK_NOTIFICATION_AS_READ_ROUTE,
    GET_SEND_HISTORY_ROUTE,
    UNPIN_NOTIFICATION_ROUTE,
    PIN_NOTIFICATION_ROUTE,
    RESTORE_TEMPLATE_ROUTE,
    GET_TEMPLATE_BY_ID_ROUTE,
    HARD_DELETE_TEMPLATE_ROUTE,
    SEND_IMMEDIATE_NOTIFICATION_ROUTE,
    GET_SEND_LOG_BY_ID_ROUTE,
    GET_SEND_LOG_SENDERS_ROUTE,
    GET_NOTIFICATION_INSTANCE_BY_ID_ROUTE,
    DELETE_NOTIFICATION_ROUTE,
    DELETE_MULTIPLE_NOTIFICATIONS_ROUTE,
    REVOKE_SEND_LOGS_ROUTE,
    DISABLED_TEMPLATE_ROUTE,
    ESTIMATE_RECIPIENTS_ROUTE
} from '@constants/constants';
import { apiClient } from '@lib/api-client';

const formDataConfig = {};

const buildNotificationFormData = (payload = {}) => {
    const formData = new FormData();
    const { attachments = [], ...data } = payload;

    formData.append('data', JSON.stringify({
        ...data,
        attachments: attachments
            .filter((item) => item?.url && !item?.file)
            .map((item) => ({
                url: item.url,
                originalName: item.originalName || item.name,
                mimeType: item.mimeType || item.type,
                size: item.size || 0,
            })),
    }));

    attachments
        .filter((item) => item?.file instanceof File)
        .forEach((item) => {
            formData.append('attachments', item.file);
        });

    return formData;
};

/**
 * Lấy danh sách mẫu thông báo (có phân trang).
 * Backend controller của bạn chỉ nhận page và limit, không có search/filters.
 */
export const handlerGetTemplates = async (params = {}, abortSignal = null) => {
    const { page = 1, limit = 20 } = params;
    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
        };

        const response = await apiClient.get(GET_TEMPLATES_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        // Backend trả về { message, templates }, với templates là một mảng.
        // Backend sẽ cần cập nhật để trả về totalItems, totalPages.
        // TẠM THỜI: sẽ trả về dữ liệu thô.
        const { templates = [], totalItems = 0, totalPages = 0 } = response.data || {};

        return {
            templates,
            totalItems,
            totalPages,
            currentPage: Number(page),
        };
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        throw new Error(error.response?.data?.error || 'Lấy danh sách template thất bại');
    }
};

/**
 * Lấy thông báo của người dùng (có phân trang + filter + sort).
 * Hỗ trợ: sender_role=admin|manager, status=delivered|read, sort=newest|oldest
 */
export const handlerGetUserNotifications = async (params = {}, abortSignal = null) => {
    const {
        page = 1,
        limit = 20,
        sender_role,
        status,
        sort,
        type,
        date_range,
    } = params;

    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
        };

        // Thêm filter nếu có
        if (sender_role && ['admin', 'manager'].includes(sender_role)) {
            queryParams.sender_role = sender_role;
        }
        if (status && ['delivered', 'read'].includes(status)) {
            queryParams.status = status;
        }
        if (sort && ['newest', 'oldest'].includes(sort)) {
            queryParams.sort = sort;
        }
        if (type) {
            queryParams.type = type;
        }
        if (date_range && (date_range.from || date_range.to)) {
            if (date_range.from) queryParams.date_from = new Date(date_range.from).toISOString();
            if (date_range.to) queryParams.date_to = new Date(date_range.to).toISOString();
        }

        const response = await apiClient.get(GET_USER_NOTIFICATIONS_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        const { notifications = [], totalItems = 0, totalPages = 0 } = response.data || {};

        return {
            notifications,
            totalItems,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
        };
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.error('Service error (handlerGetUserNotifications):', error);
        throw new Error(error.response?.data?.error || 'Lấy thông báo thất bại');
    }
};

/**
 * Tạo một mẫu thông báo mới.
 */
export const handlerCreateTemplate = async (templateData) => {
    try {
        const response = await apiClient.post(
            CREATE_TEMPLATE_ROUTE,
            buildNotificationFormData(templateData),
            formDataConfig
        );
        return response.data; // Trả về: { message, template }
    } catch (error) {
        console.error('Error creating template:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Failed to create template');
    }
};

/**
 * Cập nhật một mẫu thông báo.
 */
export const handlerUpdateTemplate = async (templateId, updateData) => {
    try {
        const response = await apiClient.put(
            UPDATE_TEMPLATE_ROUTE(templateId),
            buildNotificationFormData(updateData),
            formDataConfig
        );
        return response.data; // Trả về: { message, template }
    } catch (error) {
        console.error('Error updating template:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Failed to update template');
    }
};

// === VÔ HIỆU HÓA TEMPLATE (Tạm dừng) ===
export const handlerDisableTemplate = async (templateId) => {
    try {
        const response = await apiClient.patch(DISABLED_TEMPLATE_ROUTE(templateId));
        return response.data; // { message: 'Mẫu thông báo đã được tạm dừng' }
    } catch (error) {
        console.error('Error disabling template:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Tạm dừng template thất bại');
    }
};

/**
 * Gửi thông báo thủ công (thêm job vào queue).
 */
export const handlerSendNotification = async (template_id, target) => {
    try {
        const response = await apiClient.post(SEND_NOTIFICATION_ROUTE, { template_id, target });
        return response.data; // Trả về: { message, result }
    } catch (error) {
        console.error('Error sending notification:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Failed to send notification');
    }
};

/**
 * Đánh dấu thông báo đã đọc.
 */
export const handlerMarkAsRead = async (notificationId) => {
    try {
        const response = await apiClient.put(MARK_NOTIFICATION_AS_READ_ROUTE(notificationId));
        return response.data; // Trả về: { message, notification }
    } catch (error) {
        console.error('Error marking notification as read:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Failed to mark as read');
    }
};

/**
 * Lấy lịch sử gửi thông báo (admin)
 */
export const handlerGetSendHistory = async (params = {}, abortSignal = null) => {
    const { page = 1, limit = 20, type, schedule_type, sent_by, sender_role, sort = 'newest', date_range } = params;
    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
        };
        if (type) queryParams.type = type;
        if (schedule_type) queryParams.schedule_type = schedule_type;
        if (sent_by) queryParams.sent_by = sent_by;
        if (sender_role) queryParams.sender_role = sender_role;
        if (sort && ['newest', 'oldest'].includes(sort)) {
            queryParams.sort = sort;
        }
        if (date_range && (date_range.from || date_range.to)) {
            if (date_range.from) queryParams.date_from = new Date(date_range.from).toISOString();
            if (date_range.to) queryParams.date_to = new Date(date_range.to).toISOString();
        }

        const response = await apiClient.get(GET_SEND_HISTORY_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        const { logs = [], totalItems = 0, totalPages = 0 } = response.data || {};

        return {
            logs,
            totalItems,
            totalPages,
            currentPage: Number(page),
        };
    } catch (error) {
        if (error.name === 'CanceledError') throw error;
        console.error('Service error (getSendHistory):', error);
        throw new Error(error.response?.data?.error || 'Lấy lịch sử gửi thất bại');
    }
};

/**
 * Lấy danh sách người gửi duy nhất tương ứng với vai trò
 */
export const handlerGetLogSenders = async (role = null, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_SEND_LOG_SENDERS_ROUTE, {
            params: { role },
            signal: abortSignal
        });
        return response.data; // { senders: [...] }
    } catch (error) {
        if (error.name === 'CanceledError') throw error;
        console.error('Service error (handlerGetLogSenders):', error);
        throw new Error(error.response?.data?.error || 'Lấy danh sách người gửi thất bại');
    }
};

/**
 * Ghim thông báo lên đầu
 */
export const handlerPinNotification = async (notification_I_id) => {
    try {
        const response = await apiClient.put(PIN_NOTIFICATION_ROUTE(notification_I_id));
        return response.data; // { message, notification }
    } catch (error) {
        console.error('Error pinning notification:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Ghim thông báo thất bại');
    }
};

/**
 * Bỏ ghim thông báo
 */
export const handlerUnpinNotification = async (notification_I_id) => {
    try {
        const response = await apiClient.put(UNPIN_NOTIFICATION_ROUTE(notification_I_id));
        return response.data; // { message, notification }
    } catch (error) {
        console.error('Error unpinning notification:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Bỏ ghim thông báo thất bại');
    }
};

/**
 * KHÔI PHỤC TEMPLATE ĐÃ XÓA
 */
export const handlerRestoreTemplate = async (templateId) => {
    try {
        const response = await apiClient.put(RESTORE_TEMPLATE_ROUTE(templateId));
        return response.data;
    } catch (error) {
        console.error('Error restoring template:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Khôi phục template thất bại');
    }
};

/**
 * LẤY MẪU THÔNG BÁO THEO ID
 */
export const handlerGetTemplateById = async (templateId, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_TEMPLATE_BY_ID_ROUTE(templateId), { signal: abortSignal });
        return response.data; // Trả về: { message, template }
    } catch (error) {
        if (error.name === 'CanceledError') throw error;
        console.error('Error fetching template by ID:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Failed to fetch template by ID');
    }
};

// === XÓA CỨNG (VĨNH VIỄN) ===
export const handlerHardDeleteTemplate = async (templateId) => {
    try {
        const response = await apiClient.delete(HARD_DELETE_TEMPLATE_ROUTE(templateId));
        return response.data; // { message: 'Template đã bị xóa vĩnh viễn' }
    } catch (error) {
        console.error('Error hard deleting template:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Xóa vĩnh viễn template thất bại');
    }
};

// === GỬI NGAY (IMMEDIATE) ===
export const handlerSendImmediateNotification = async (data) => {
    try {
        const response = await apiClient.post(
            SEND_IMMEDIATE_NOTIFICATION_ROUTE,
            buildNotificationFormData(data),
            formDataConfig
        );
        return response.data; // { jobId, message }
    } catch (error) {
        console.error('Error sending immediate:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Gửi thông báo ngay thất bại');
    }
};

export const handlerGetSendLogById = async (logId, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_SEND_LOG_BY_ID_ROUTE(logId), { signal: abortSignal });
        return response.data; // { message, log }
    } catch (error) {
        if (error.name === 'CanceledError') throw error;
        console.error('Error fetching send log by ID:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Lấy lịch sử gửi theo ID thất bại');
    }
};

export const handlerGetNotificationInstanceById = async (notificationInstanceId, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_NOTIFICATION_INSTANCE_BY_ID_ROUTE(notificationInstanceId), { signal: abortSignal });
        return response.data; // { message, notification }
    } catch (error) {
        if (error.name === 'CanceledError') throw error;
        console.error('Error fetching notification instance by ID:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Lấy thông báo theo ID thất bại');
    }
};

/**
 * Xóa 1 thông báo
 */
export const handlerDeleteNotification = async (notificationId) => {
    try {
        const response = await apiClient.delete(DELETE_NOTIFICATION_ROUTE(notificationId));
        return response.data; // { message }
    } catch (error) {
        console.error('Error deleting notification:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Xóa thông báo thất bại');
    }
};

/**
 * Xóa nhiều thông báo cùng lúc
 */
export const handlerDeleteMultipleNotifications = async (notificationIds) => {
    try {
        const response = await apiClient.post(DELETE_MULTIPLE_NOTIFICATIONS_ROUTE, {
            notification_I_ids: notificationIds
        });
        return response.data; // { message, deletedCount }
    } catch (error) {
        console.error('Error deleting multiple notifications:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Xóa nhiều thông báo thất bại');
    }
};

/**
 * Thu hồi thông báo bằng danh sách log IDs hoặc template IDs (Admin & Manager)
 */
export const handlerRevokeSendLogs = async (data = {}) => {
    try {
        const response = await apiClient.post(REVOKE_SEND_LOGS_ROUTE, {
            log_ids: data.log_ids || [],
            template_ids: data.template_ids || []
        });
        return response.data; // { message, deletedCount }
    } catch (error) {
        console.error('Error revoking notifications:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || 'Thu hồi thông báo thất bại');
    }
};
/**
 * Ước lượng số người nhận tương ứng khớp với cấu hình target.
 */
export const handlerEstimateRecipients = async (target) => {
    try {
        const response = await apiClient.post(ESTIMATE_RECIPIENTS_ROUTE, { target });
        return response.data.count || 0;
    } catch (error) {
        console.error('Error estimating recipients:', error.response?.data?.error || error.message);
        return 0; // Trả về 0 nếu lỗi thay vì throw để không break UI
    }
};
