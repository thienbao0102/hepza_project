const crypto = require('crypto');
const jsondiffpatch = require('jsondiffpatch').create({
  objectHash: (obj, idx) => (obj && obj._id) ? obj._id : '$$index:' + idx,
  arrays: { detectMove: false }
});
const mongoose = require('mongoose');
const resourceVersionRepository = require('../dataAccess/resourceVersionRepository');

// ============================================================================
//  UTILITIES
// ============================================================================

/**
 * Tạo transactionId duy nhất để nhóm nhiều thay đổi cùng 1 hành động.
 * Format: TX + YYYYMMDDHHmmss + 4 ký tự random
 */
function createTransactionId(prefix = 'TX') {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${ts}${rand}`;
}

/**
 * Tính sự khác biệt (diff) giữa 2 object sử dụng jsondiffpatch.
 * @returns {Object|null} - diff object hoặc null nếu không có thay đổi
 */
function computeDiff(oldObj, newObj) {
  return jsondiffpatch.diff(oldObj, newObj) || null;
}

// ============================================================================
//  COMMIT MESSAGE GENERATOR
// ============================================================================

/**
 * Sinh commit message tự động dựa vào actionType, resourceType, và diff.
 * Hỗ trợ nhận groupLabel tùy chỉnh từ bên ngoài.
 */
function generateCommitMessage({ actionType, resourceType, newObj, oldObj, diff, groupLabel }) {
  if (actionType === 'import' || actionType === 'init') {
    return 'Khai báo dữ liệu lên hệ thống';
  }

  // Xác định label (nhóm tài nguyên)
  let label = groupLabel;
  if (!label) {
    const map = {
      material: 'nguyên vật liệu',
      chemical: 'hóa chất',
      fuel: 'nhiên liệu',
      waste: 'chất thải'
    };
    const mainGroup = newObj?.main_group || oldObj?.main_group || newObj?.mainGroup || oldObj?.mainGroup || newObj?.type || oldObj?.type || '';
    label = map[mainGroup] || mainGroup || resourceType;
  }

  // Xác định tên resource
  const name =
    newObj?.name ||
    newObj?.fuelName ||
    newObj?.wasteName ||
    oldObj?.name ||
    oldObj?.fuelName ||
    oldObj?.wasteName ||
    '(Không rõ tên)';

  if (actionType === 'create') return `Thêm dữ liệu ${label} - ${name}`;
  if (actionType === 'update') {
    const changedFields = diff ? Object.keys(diff).filter(f => !['_id', '__v', '_modifiedBy', 'updatedAt'].includes(f)) : [];
    const detailFields = ['production', 'domestic', 'irrigation', 'other'];
    const hasDetailChange = changedFields.some(f => detailFields.includes(f));

    // Nếu có thay đổi chi tiết (Production/Domestic/Other) → ẩn Quantity (vì nó là tổng)
    const filteredFields = hasDetailChange
      ? changedFields.filter(f => f !== 'quantity')
      : changedFields;

    if (filteredFields.length === 0) return null;

    const fieldMap = {
      name: 'Tên',
      fuelName: 'Tên nhiên liệu',
      wasteName: 'Tên chất thải',
      quantity: 'Số lượng',
      unit: 'Đơn vị',
      note: 'Ghi chú',
      price: 'Giá',
      main_group: 'Nhóm chính',
      sub_group: 'Nhóm phụ',
      codeWaste: 'Mã chất thải',
      wasteCodeName: 'Tên mã chất thải',
      treatmentMethods: 'Phương pháp xử lý',
      production: 'Sản xuất',
      domestic: 'Sinh hoạt',
      irrigation: 'Tưới tiêu',
      other: 'Mục đích sử dụng Khác',
      purpose: 'Mục đích',
      purchasingAddress: 'Địa chỉ thu mua',
      purchasingUnit: 'Đơn vị thu mua',
      hazardLevel: 'Mức độ nguy hại',
      billImage: 'Hóa đơn đính kèm'
    };

    const detailText = filteredFields.map(f => {
      const val = diff[f];
      const fLabel = fieldMap[f] || f;
      if (Array.isArray(val) && val.length === 2) {
        if (typeof val[0] === 'string' && typeof val[1] === 'string' &&
          val[0].toLowerCase() === val[1].toLowerCase()) {
          return null;
        }

        const oldVal = Number(val[0]) || 0;
        const newVal = Number(val[1]) || 0;

        let prefix = '';
        if (detailFields.includes(f)) {
          if (oldVal === 0 && newVal > 0) prefix = 'Thêm ';
          else if (oldVal > 0 && newVal === 0) prefix = 'Bỏ ';
        }

        return `${prefix}${fLabel} (từ ${val[0]} thành ${val[1]})`;
      }
      return fLabel;
    }).filter(Boolean).join(', ');

    if (!detailText) return null;

    return `Cập nhật dữ liệu ${name}: ${detailText}`;
  }
  if (actionType === 'delete') return `Xóa dữ liệu ${label} - ${name}`;
  return '';
}

// ============================================================================
//  VERSION DOC BUILDER
// ============================================================================

/**
 * Tạo 1 version document (plain object, KHÔNG insert vào DB).
 * Service layer chịu trách nhiệm xác định actionType trước khi gọi hàm này.
 *
 * @returns {Object|null} - version doc hoặc null nếu update không có thay đổi
 */
function buildVersionDoc({
  resourceType, resourceId, oldObj, newObj,
  company_id, zone_id, periodKey, modifiedBy,
  actionType, commitMessage = '', transactionId, groupLabel
}) {
  // Init action: chỉ ghi nhận metadata, không lưu data
  if (actionType === 'init') {
    return {
      _id: 'RV_' + crypto.randomBytes(8).toString('hex'),
      transactionId,
      resourceType, resourceId,
      company_id, zone_id, periodKey,
      actionType: 'init',
      changes: null, oldData: null, newData: null,
      modifiedBy, modifiedAt: new Date(),
      commitMessage: commitMessage || 'Khai báo dữ liệu lên hệ thống'
    };
  }

  // Tính diff giữa old và new
  const diff = computeDiff(oldObj, newObj);

  // Update mà không có khác biệt → skip
  if (actionType === 'update' && !diff) return null;

  // Sinh commit message nếu chưa có
  if (!commitMessage) {
    commitMessage = generateCommitMessage({ actionType, resourceType, newObj, oldObj, diff, groupLabel });
  }

  // Commit message rỗng (update nhưng chỉ khác case) → skip
  if (actionType === 'update' && !commitMessage) return null;

  return {
    _id: 'RV_' + crypto.randomBytes(8).toString('hex'),
    transactionId,
    resourceType, resourceId,
    company_id, zone_id, periodKey,
    actionType,
    changes: diff, oldData: oldObj, newData: newObj,
    modifiedBy, modifiedAt: new Date(),
    commitMessage
  };
}

// ============================================================================
//  PUBLIC API — Ghi version records qua Repository
// ============================================================================

/**
 * Commit 1 bản ghi thay đổi đơn lẻ.
 * Dùng cho versionPlugin (post-save, post-remove hooks).
 *
 * @param {Object} params
 * @param {Object} [params.session] - Mongoose session (nếu có)
 * @returns {Promise<boolean>} - true nếu ghi thành công, false nếu skip
 */
async function commitChange({
  resourceType, resourceId, oldObj, newObj,
  company_id, zone_id, periodKey, modifiedBy,
  actionType, commitMessage = '', transactionId = null,
  groupLabel = null, session = null
}) {
  const options = session ? { session } : {};
  const txId = transactionId || createTransactionId();

  const doc = buildVersionDoc({
    resourceType, resourceId, oldObj, newObj,
    company_id, zone_id, periodKey, modifiedBy,
    actionType, commitMessage, transactionId: txId, groupLabel
  });

  if (!doc) return false;

  // Gọi repository thay vì Model trực tiếp
  await resourceVersionRepository.create(doc, options);
  return true;
}

/**
 * Commit nhiều bản ghi cùng lúc — BULK insertMany.
 * Dùng cho resourceCrudService và resourceImportService.
 *
 * SESSION CONTRACT:
 * - Nếu truyền session → dùng session đó (caller chịu trách nhiệm commit/abort)
 * - Nếu KHÔNG truyền session → tự tạo session + transaction nội bộ
 *   ⚠️ Nhánh này chỉ nên dùng cho edge cases, callers nên luôn truyền session.
 *
 * @param {Object}   params
 * @param {Object[]} params.changes       - Mảng thay đổi cần commit
 * @param {string}   params.modifiedBy    - User ID
 * @param {string}   [params.commitMessage]
 * @param {Object}   [params.session]     - External Mongoose session
 * @returns {Promise<{ transactionId: string|null }>}
 */
async function commitTransaction({ changes = [], modifiedBy, commitMessage = '', session: externalSession = null }) {
  if (!Array.isArray(changes) || changes.length === 0) throw new Error('changes required');

  const transactionId = createTransactionId();

  // Build tất cả version docs, lọc nulls (update không có thay đổi)
  const docs = [];
  for (const ch of changes) {
    const doc = buildVersionDoc({
      ...ch,
      modifiedBy,
      commitMessage: ch.commitMessage || commitMessage,
      transactionId
    });
    if (doc) docs.push(doc);
  }

  if (docs.length === 0) return { transactionId: null };

  // ── Nhánh 1: Có session từ bên ngoài → dùng luôn, caller quản lý lifecycle ──
  if (externalSession) {
    await resourceVersionRepository.insertMany(docs, { session: externalSession });
    return { transactionId };
  }

  // ── Nhánh 2: Không có session → tự tạo session + transaction ──
  // ⚠️ WARNING: Callers nên truyền session để đảm bảo atomicity với các writes khác.
  //    Nhánh này chỉ dùng cho trường hợp standalone commit (không kèm writes khác).
  console.warn('[versionManager] commitTransaction gọi KHÔNG có session — tự tạo session nội bộ');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await resourceVersionRepository.insertMany(docs, { session });
    await session.commitTransaction();
    session.endSession();
    return { transactionId };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  createTransactionId,
  computeDiff,
  generateCommitMessage,
  buildVersionDoc,
  commitChange,
  commitTransaction
};
