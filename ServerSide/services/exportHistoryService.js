const exportHistoryRepository = require('../dataAccess/exportHistoryRepository');

// tạo bản ghi lịch sử xuất file
const createExportHistory = async (user_id, company_ids, periodKeyStart, periodKeyEnd, infor_export) => {
    return await exportHistoryRepository.createExportHistory(user_id, company_ids, periodKeyStart, periodKeyEnd, infor_export);
};
// cập nhật trạng thái xuất file
const updateExportHistoryStatus = async (export_id, status) => {
    return await exportHistoryRepository.updateExportHistoryStatus(export_id, status);
};
//lấy tất cả bảng ghi lịch sử xuất file của doanh nghiệp
const getExportHistoriesByCompanyId = async (company_id) => {
    return await exportHistoryRepository.getExportHistoriesByCompanyId(company_id);
};

//lấy lịch sử theo user_id
const getExportHistoriesByUserId = async (user_id) => {
    return await exportHistoryRepository.getExportHistoriesByUserId(user_id);
};

// xóa lịch sử xuất file
const deleteExportHistory = async (export_id) => {
    return await exportHistoryRepository.deleteExportHistory(export_id);
};

const updateExportJobState = async (export_id, updates) => {
    return await exportHistoryRepository.updateExportJobState(export_id, updates);
};

const getExportHistoryByExportIdForUser = async (export_id, user_id) => {
    return await exportHistoryRepository.getExportHistoryByExportIdForUser(export_id, user_id);
};

const findExpiredCompletedExports = async (now = new Date()) => {
    return await exportHistoryRepository.findExpiredCompletedExports(now);
};

const markExportExpired = async (export_id) => {
    return await exportHistoryRepository.markExportExpired(export_id);
};

const findActiveExportByPath = async (file_path) => {
    return await exportHistoryRepository.findActiveExportByPath(file_path);
};

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
    findActiveExportByPath
};