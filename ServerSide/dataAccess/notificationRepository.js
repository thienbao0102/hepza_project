const NotificationTemplate = require('../models/notificationTemplateModel');
const NotificationInstance = require('../models/notificationInstanceModel');
const userRepository = require('./userRepository');

const createTemplate = async (templateData) => {
    const template = new NotificationTemplate(templateData);
    return await template.save();
};

const updateTemplate = async (template_id, updateData) => {
    const filter = { notification_T_id: template_id };

    const dataToUpdate = { ...updateData };
    if (dataToUpdate.__v !== undefined) {
        filter.__v = dataToUpdate.__v;
        delete dataToUpdate.__v;
    }

    const updateQuery = { $set: dataToUpdate };
    if (updateData.__v !== undefined) {
        updateQuery.$inc = { __v: 1 };
    }

    return await NotificationTemplate.findOneAndUpdate(
        filter,
        updateQuery,
        { new: true }
    );
};

const getTemplates = async (page, limit, user) => {
    const skip = (page - 1) * limit;

    // User muốn lấy cả disabled template trên 1 UI -> bỏ điều kiện isActive
    const query = {};

    if (user.role === 'manager') {
        // Manager chỉ thấy template của chính mình
        query.created_by = user.user_id;
    } else if (user.role === 'admin') {
        // Admin thấy toàn bộ kho template của role admin (kho chung)
        query.creator_role = 'admin';
    }

    // Chạy song song 2 query: 1 đếm, 1 lấy dữ liệu
    const [templates, totalItems] = await Promise.all([
        NotificationTemplate.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(), // Thêm .lean() để tăng tốc độ query
        NotificationTemplate.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return { templates, totalItems, totalPages };
};

const findTemplateById = async (template_id) => {
    const results = await NotificationTemplate.aggregate([
        { $match: { notification_T_id: template_id } },
        {
            $lookup: {
                from: 'companies',
                localField: 'target.company_ids',
                foreignField: 'company_id',
                as: 'target_companies'
            }
        },
        {
            $addFields: {
                'target.company_details': {
                    $map: {
                        input: '$target_companies',
                        as: 'c',
                        in: {
                            company_id: '$$c.company_id',
                            company_name: '$$c.company_name'
                        }
                    }
                }
            }
        },
        { $project: { target_companies: 0 } }
    ]);
    return results.length > 0 ? results[0] : null;
};

const createNotifications = async (notifications) => {
    return await NotificationInstance.insertMany(notifications);
};

const getUserIdsByRole = async (role) => {
    const users = await userRepository.find({ role });
    return users.map(u => u.user_id);
};

const getUserNotifications = async (user_id, page = 1, limit = 10, filters = {}) => {
    const skip = (page - 1) * limit;
    const {
        sender_role,
        status,
        sort,
        type,
        search,
    } = filters;

    const query = { user_id };

    // === FILTER THEO SEARCH (title, body) ===
    if (search && search.trim().length > 0) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
            { title: searchRegex },
            { body: searchRegex },
        ];
    }

    // === FILTER THEO SENDER ROLE (admin/manager) ===
    const senderRoleToFilter = Array.isArray(sender_role) ? sender_role[0] : sender_role;
    if (senderRoleToFilter && ['admin', 'manager'].includes(senderRoleToFilter)) {
        // Join với NotificationTemplate để lấy created_by → role
        const userIds = await getUserIdsByRole(senderRoleToFilter);
        const templateIdsDocs = await NotificationTemplate.find(
            { created_by: { $in: userIds } },
            { notification_T_id: 1 }
        ).lean();

        if (templateIdsDocs.length > 0) {
            query.template_id = { $in: templateIdsDocs.map(t => t.notification_T_id) };
        } else {
            return { notifications: [], totalItems: 0, totalPages: 0 };
        }
    }

    // === FILTER THEO STATUS ===
    let statusToFilter = status;
    if (status === 'unread') statusToFilter = 'delivered';

    if (statusToFilter && ['delivered', 'read'].includes(statusToFilter)) {
        query.status = statusToFilter;
    }

    if (type) {
        query.type = type;
    }

    // === FILTER THEO KHOẢNG THỜI GIAN ===
    if (filters.date_range && (filters.date_range.from || filters.date_range.to)) {
        query.deliveredAt = {};
        if (filters.date_range.from) query.deliveredAt.$gte = new Date(filters.date_range.from);
        if (filters.date_range.to) query.deliveredAt.$lte = new Date(filters.date_range.to);
    }

    // === SORT ===
    let sortObj = { pin: -1, deliveredAt: -1, _id: -1 }; // Mặc định: pinned lên đầu, mới nhất
    if (sort === 'oldest') {
        sortObj = { pin: -1, deliveredAt: 1, _id: 1 }; // cũ nhất trước
    }

    const [notifications, totalItems] = await Promise.all([
        NotificationInstance.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .select('notification_I_id title body attachments type status deliveredAt readAt pin template_id')
            .lean(),
        NotificationInstance.countDocuments(query)
    ]);

    return {
        notifications,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        page,
        limit
    };
};

const findNotificationById = async (notification_I_id) => {
    return await NotificationInstance.findOne({ notification_I_id });
};

const updateNotification = async (notification_I_id, updateData) => {
    return await NotificationInstance.findOneAndUpdate(
        { notification_I_id },
        { $set: updateData },
        { new: true }
    );
};

const find = async (query) => {
    return await NotificationTemplate.find(query);
};

const getDisabledTemplates = async (page, limit) => {
    const skip = (page - 1) * limit;
    const query = { isActive: false }; // ← chỉ lấy bị disable
    const [templates, totalItems] = await Promise.all([
        NotificationTemplate.find(query)
            .sort({ updated_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationTemplate.countDocuments(query)
    ]);
    return { templates, totalItems, totalPages: Math.ceil(totalItems / limit) };
};

const deleteOne = async (query) => {
    return await NotificationTemplate.deleteOne(query);
};

// === DELETE NOTIFICATION INSTANCE ===
const deleteNotification = async (notification_I_id) => {
    return await NotificationInstance.deleteOne({ notification_I_id });
};

const deleteMultipleNotifications = async (notification_I_ids) => {
    return await NotificationInstance.deleteMany({
        notification_I_id: { $in: notification_I_ids }
    });
};

const countAdminTemplates = async () => {
    return await NotificationTemplate.countDocuments({ creator_role: 'admin' });
};

const countManagerTemplates = async (user_id) => {
    return await NotificationTemplate.countDocuments({ created_by: user_id, creator_role: 'manager' });
};

module.exports = {
    createTemplate,
    updateTemplate,
    getTemplates,
    countAdminTemplates,
    countManagerTemplates,
    findTemplateById,
    createNotifications,
    getUserNotifications,
    findNotificationById,
    updateNotification,
    find,
    getDisabledTemplates,
    deleteOne,
    deleteNotification,
    deleteMultipleNotifications
};
