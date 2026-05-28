const exportHistoryModel = require('../models/exportHistoryModel');

// tạo bản ghi lich sử xuất file
const createExportHistory = async (user_id, company_ids, periodKeyStart, periodKeyEnd, infor_export) => {
    //kiểm tra bản ghi đã tồn tại chưa
    const existingExportHistory = await checkExportHistoryExists(user_id, company_ids, periodKeyStart, periodKeyEnd);
    if (existingExportHistory) {
        return existingExportHistory;
    }
    const newExportHistory = new exportHistoryModel({
        user_id,
        company_ids,
        periodKeyStart,
        periodKeyEnd,
        infor_export
    });
    return await newExportHistory.save();
};

// cập nhật trạng thái xuất file
const updateExportHistoryStatus = async (export_id, status) => {
    return await exportHistoryModel.findOneAndUpdate(
        { export_id },
        { status },
        { new: true }
    );
}

//kiểm tra bản ghi xuất file đã tồn tại chưa
const checkExportHistoryExists = async (user_id, company_ids, periodKeyStart, periodKeyEnd) => {
    //tìm và trả về export_id nếu tồn tại
    return await exportHistoryModel.findOne({
        user_id,
        company_ids: { $all: company_ids, $size: company_ids.length },
        periodKeyStart,
        periodKeyEnd,
        is_deleted: false
    }, { export_id: 1 });
};

//lất tất cả bảng ghi lịch sử xuất file của doanh nghiệp
const getExportHistoriesByCompanyId = async (company_id) => {
    return await exportHistoryModel.find({
        company_ids: company_id,
        isDeleted: false
    }).sort({ created_at: -1 });
};

//lấy lịch sử theo user_id
const getExportHistoriesByUserId = async (user_id) => {
    return await exportHistoryModel.find({ user_id, isDeleted: { $ne: true } }).sort({ created_at: -1 });
};

// xóa lịch sử xuất file
const deleteExportHistory = async (export_id) => {
    return await exportHistoryModel.findOneAndDelete({ export_id });
};

const updateExportJobState = async (export_id, updates) => {
    return await exportHistoryModel.findOneAndUpdate(
        { export_id },
        { $set: updates },
        { new: true }
    );
};

const getExportHistoryByExportIdForUser = async (export_id, user_id) => {
    return await exportHistoryModel.findOne({
        export_id,
        user_id,
        isDeleted: { $ne: true }
    });
};

const findExpiredCompletedExports = async (now = new Date()) => {
    return await exportHistoryModel.find({
        status: 'success',
        expires_at: { $lte: now },
        file_path: { $exists: true, $ne: '' },
        isDeleted: { $ne: true }
    });
};

const markExportExpired = async (export_id) => {
    return await exportHistoryModel.findOneAndUpdate(
        { export_id },
        {
            $set: { status: 'expired', file_path: '', file_size: 0 },
        },
        { new: true }
    );
};

const findActiveExportByPath = async (file_path) => {
    return await exportHistoryModel.findOne({
        file_path,
        status: { $in: ['queued', 'processing', 'success'] },
        isDeleted: { $ne: true }
    });
};

//soft delete export history by company_id
const deleteSoftExportHistory = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await exportHistoryModel.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false }
            ]
        },
        {
            $set: {
                isDeleted: true,
            }
        },
        options
    );
}
//hard delete export history by company_id
const deleteHardExportHistory = async (company_id, session = null) => {
    const options = session ? { session } : {};
    return await exportHistoryModel.deleteMany({ company_id }, options);
}
//restore export history by company_id
const restoreExportHistory = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await exportHistoryModel.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: true } },
                { isDeleted: true }
            ]
        },
        {
            $set: {
                isDeleted: false,
            }
        },
        options
    );
}

module.exports = {
    createExportHistory,
    updateExportHistoryStatus,
    getExportHistoriesByCompanyId,
    getExportHistoriesByUserId,
    deleteExportHistory,
    updateExportJobState,
    getExportHistoryByExportIdForUser,
    findExpiredCompletedExports,
    markExportExpired,
    findActiveExportByPath,
    deleteSoftExportHistory,
    deleteHardExportHistory,
    restoreExportHistory
};