const NotificationSendLog = require('../models/notificationSendLogModel');

const createLog = async (logData) => {
    const log = new NotificationSendLog(logData);
    await log.save();

    // === GIỚI HẠN 40 LOG/SENDER ===
    const sentBy = logData.sent_by;
    const total = await NotificationSendLog.countDocuments({ sent_by: sentBy });
    if (total > 40) {
        const excess = total - 40;
        const toDelete = await NotificationSendLog.find({ sent_by: sentBy })
            .sort({ sent_at: 1 }) // cũ nhất lên đầu
            .limit(excess)
            .select('_id');

        if (toDelete.length > 0) {
            await NotificationSendLog.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
        }
    }

    return log;
};

const getLogs = async (page = 1, limit = 10, filters = {}, user = null) => {
    const skip = (page - 1) * limit;

    let matchQuery = {};

    // === PHÂN QUYỀN THEO ROLE ===
    if (user?.role === 'manager') {
        matchQuery.sent_by = user.user_id;
    }

    // === ÁP DỤNG FILTERS ===
    if (filters.type) matchQuery.type = filters.type;
    if (filters.schedule_type) matchQuery.schedule_type = filters.schedule_type;

    // === FILTER THEO KHOẢNG THỜI GIAN ===
    if (filters.date_range && (filters.date_range.from || filters.date_range.to)) {
        matchQuery.sent_at = {};
        if (filters.date_range.from) matchQuery.sent_at.$gte = new Date(filters.date_range.from);
        if (filters.date_range.to) matchQuery.sent_at.$lte = new Date(filters.date_range.to);
    }

    // Specific sender filter (applied before lookup if possible, or after if combined with role)
    if (filters.sent_by && (user?.role === 'admin' || user?.user_id === filters.sent_by)) {
        matchQuery.sent_by = filters.sent_by;
    }

    const pipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'users', // Tên collection trong MongoDB
                localField: 'sent_by',
                foreignField: 'user_id',
                as: 'sender_info'
            }
        },
        { $unwind: { path: '$sender_info', preserveNullAndEmptyArrays: true } },
        // === LỌC THEO ROLE NGƯỜI GỬI (ADMIN VIEW) ===
        // Filter by sender_info.role after lookup
        ...(user?.role === 'admin' && filters.sender_role ? [
            { $match: { 'sender_info.role': filters.sender_role } }
        ] : []),
        
        // --- LOOKUP TÊN DOANH NGHIỆP CHO TARGET (IF ANY) ---
        {
            $lookup: {
                from: 'companies',
                localField: 'target.company_ids',
                foreignField: 'company_id',
                as: 'target_companies'
            }
        },

        {
            $project: {
                _id: 1,
                log_id: 1,
                template_id: 1,
                template_name: 1,
                title: 1,
                body: 1,
                attachments: 1,
                type: 1,
                schedule_type: 1,
                target: 1,
                total_recipients: 1,
                sent_by: 1,
                sent_at: 1,
                sender_full_name: { $ifNull: ['$sender_info.full_name', 'Tài khoản đã xóa'] },
                sender_role: '$sender_info.role',
                sender_zone_id: '$sender_info.zone_id',
                target_company_names: '$target_companies.company_name'
            }
        },
        { $sort: { sent_at: -1 } },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }]
            }
        }
    ];

    const [result] = await NotificationSendLog.aggregate(pipeline);
    const totalItems = result.metadata[0]?.total || 0;
    const logs = result.data;

    return {
        logs,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        page,
        limit
    };
};

const getUniqueSenders = async (roleFilter = null, user = null) => {
    let matchQuery = {};

    if (user?.role === 'manager') {
        matchQuery.user_id = user.user_id;
    } else if (roleFilter) {
        matchQuery.role = roleFilter;
    }

    // Pipeline lấy danh sách người gửi duy nhất đã từng gửi thông báo
    const pipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'notificationsendlogs',
                localField: 'user_id',
                foreignField: 'sent_by',
                as: 'logs'
            }
        },
        { $match: { "logs.0": { $exists: true } } }, // Chỉ những user đã từng gửi
        {
            $project: {
                user_id: 1,
                full_name: 1,
                role: 1,
                zone_id: 1
            }
        },
        { $sort: { full_name: 1 } }
    ];

    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    return await User.aggregate(pipeline);
};

const findByLogId = async (log_id) => {
    return await NotificationSendLog.findOne({ log_id }).lean();
};

const findByExecutionKey = async (execution_key) => {
    return await NotificationSendLog.findOne({ execution_key }).lean();
};

const findByLogIdAndUpdate = async (log_id, updateData, options = { new: true }) => {
    return await NotificationSendLog.findOneAndUpdate(
        { log_id },
        updateData,
        options
    );
};

const getLatestSenderByTemplateIds = async (templateIds) => {
    if (!templateIds || templateIds.length === 0) return {};

    const logs = await NotificationSendLog.find(
        { template_id: { $in: templateIds } },
        { template_id: 1, sent_by: 1, sent_at: 1 }
    )
        .sort({ sent_at: -1 })
        .lean();

    // Lấy log mới nhất cho mỗi template_id
    const latestMap = {};
    logs.forEach(log => {
        if (!latestMap[log.template_id] || new Date(log.sent_at) > new Date(latestMap[log.template_id].sent_at)) {
            latestMap[log.template_id] = {
                sent_by: log.sent_by
            };
        }
    });

    return latestMap;
};

const getLatestSenderByTemplateId = async (template_id) => {
    const log = await NotificationSendLog.findOne(
        { template_id },
        { sent_by: 1 }
    )
        .sort({ sent_at: -1 })
        .lean();

    return log ? { sent_by: log.sent_by } : null;
};

const getStats = async (user = null) => {
    let query = {};
    if (user?.role === 'manager') {
        query.sent_by = user.user_id;
    }

    const [totalSent, rawStats] = await Promise.all([
        NotificationSendLog.countDocuments(query),
        NotificationSendLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRecipients: { $sum: "$total_recipients" }
                }
            }
        ])
    ]);

    return {
        totalSent,
        totalRecipients: rawStats[0]?.totalRecipients || 0
    };
};

module.exports = {
    createLog,
    getLogs,
    findByLogId,
    findByExecutionKey,
    findByLogIdAndUpdate,
    getLatestSenderByTemplateIds,
    getLatestSenderByTemplateId,
    getUniqueSenders
};
