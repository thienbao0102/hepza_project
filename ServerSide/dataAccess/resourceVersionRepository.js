const ResourceVersion = require('../models/resourceVersionModel');

// ============================================================================
//  WRITE — Ghi dữ liệu version
// ============================================================================

/**
 * Tạo 1 bản ghi version (single document).
 * Validate input trước khi ghi.
 *
 * @param {Object}   doc       - Document cần tạo (plain object từ buildVersionDoc)
 * @param {Object}   [options] - Mongoose options ({ session })
 * @returns {Promise<Object>}  - Document đã tạo
 */
const create = async (doc, options = {}) => {
    if (!doc || !doc._id) throw new Error('version doc phải có _id');
    if (!doc.transactionId) throw new Error('version doc phải có transactionId');
    if (!doc.actionType) throw new Error('version doc phải có actionType');

    return await ResourceVersion.create([doc], options);
};

/**
 * Ghi nhiều bản ghi version cùng lúc (bulk insert).
 * Validate cơ bản: mảng không rỗng, mỗi doc phải có _id + transactionId + actionType.
 *
 * @param {Object[]} docs      - Mảng documents (plain objects từ buildVersionDoc)
 * @param {Object}   [options] - Mongoose options ({ session })
 * @returns {Promise<Object[]>}
 */
const insertMany = async (docs, options = {}) => {
    if (!Array.isArray(docs) || docs.length === 0) {
        throw new Error('insertMany yêu cầu mảng docs không rỗng');
    }

    // Validate từng doc trước khi ghi
    for (const doc of docs) {
        if (!doc._id) throw new Error('Mỗi version doc phải có _id');
        if (!doc.transactionId) throw new Error('Mỗi version doc phải có transactionId');
        if (!doc.actionType) throw new Error('Mỗi version doc phải có actionType');
    }

    return await ResourceVersion.insertMany(docs, options);
};

// ============================================================================
//  READ — Truy vấn lịch sử version
// ============================================================================

/**
 * Lấy lịch sử theo transactionId (tất cả thay đổi trong cùng 1 hành động).
 *
 * @param {string} transactionId
 * @returns {Promise<Object[]>}
 */
const findByTransaction = async (transactionId) => {
    if (!transactionId) throw new Error('transactionId is required');
    return await ResourceVersion.find({ transactionId, isDeleted: { $ne: true } })
        .sort({ modifiedAt: 1 })
        .lean();
};

/**
 * Lấy lịch sử theo company + periodKey (tất cả thay đổi của 1 DN trong 1 kỳ).
 *
 * @param {string} company_id
 * @param {number} periodKey
 * @param {Object} [pagination]      - { page, limit }
 * @returns {Promise<Object[]>}
 */
const findByCompanyAndPeriod = async (company_id, periodKey, { page = 1, limit = 50 } = {}) => {
    if (!company_id) throw new Error('company_id is required');

    const query = { company_id, isDeleted: { $ne: true } };
    if (periodKey) query.periodKey = Number(periodKey);

    const skip = (page - 1) * limit;

    return await ResourceVersion.find(query)
        .sort({ modifiedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Lấy lịch sử thay đổi của 1 resource cụ thể.
 *
 * @param {string} resourceId
 * @param {string} [resourceType]
 * @returns {Promise<Object[]>}
 */
const findByResourceId = async (resourceId, resourceType) => {
    if (!resourceId) throw new Error('resourceId is required');

    const query = { resourceId, isDeleted: { $ne: true } };
    if (resourceType) query.resourceType = resourceType;

    return await ResourceVersion.find(query)
        .sort({ modifiedAt: -1 })
        .lean();
};

// ============================================================================
//  DELETE / RESTORE — Quản lý lifecycle (đã có sẵn, giữ nguyên)
// ============================================================================

/**
 * Soft delete tất cả version records của 1 company.
 */
const deleteSoftByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await ResourceVersion.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false }
            ]
        },
        { $set: { isDeleted: true } },
        options
    );
};

/**
 * Hard delete tất cả version records của 1 company.
 */
const deleteHardByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};
    return await ResourceVersion.deleteMany({ company_id }, options);
};

/**
 * Restore (khôi phục) tất cả version records đã bị soft-delete của 1 company.
 */
const restoreByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await ResourceVersion.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: true } },
                { isDeleted: true }
            ]
        },
        { $set: { isDeleted: false } },
        options
    );
};

module.exports = {
    // Write
    create,
    insertMany,
    // Read
    findByTransaction,
    findByCompanyAndPeriod,
    findByResourceId,
    // Delete / Restore
    deleteSoftByCompanyId,
    deleteHardByCompanyId,
    restoreByCompanyId,
    // Backward-compatible aliases (callers cũ dùng tên cũ)
    deleteSoftResourceVersionsByCompanyId: deleteSoftByCompanyId,
    deleteHardResourceVersionsByCompanyId: deleteHardByCompanyId,
    restoreResourceVersionsByCompanyId: restoreByCompanyId,
};