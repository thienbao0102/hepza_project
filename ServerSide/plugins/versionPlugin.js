const VersionManager = require('../services/versionManagerService');

/**
 * Mongoose plugin: tự động ghi version history khi save/remove document.
 *
 * Lưu ý:
 * - Dùng pre('save') để lưu trạng thái isNew trước khi Mongoose reset nó
 * - actionType được set từ service layer (pre-hook), KHÔNG dựa vào doc.isNew sau save
 * - Sử dụng commitChange() → repository → DB (không gọi Model trực tiếp)
 */
function versionPlugin(schema) {
  schema.add({
    _modifiedBy: { type: String, required: false },
    _commitMessage: { type: String, required: false },
    _txId: { type: String, required: false } // để gom nhiều thay đổi chung 1 transaction
  });

  // ── PRE SAVE: Lưu trạng thái isNew trước khi Mongoose reset nó về false ──
  schema.pre('save', function (next) {
    this._wasNew = this.isNew;
    next();
  });

  // ── POST SAVE: Ghi version log ──
  schema.post('save', async function (doc) {
    try {
      const resourceType = doc.constructor.modelName;
      const resourceId = doc._id;
      const modifiedBy = doc._modifiedBy || 'system';
      const txId = doc._txId || VersionManager.createTransactionId();

      const newState = doc.toObject();
      delete newState._modifiedBy;
      delete newState._txId;
      delete newState._commitMessage;
      delete newState.__v;

      // Nếu là lần đầu khai báo dữ liệu → chỉ log commit init
      if (newState?.isInitialImport) {
        await VersionManager.commitChange({
          resourceType,
          resourceId,
          oldObj: null,
          newObj: null,
          company_id: newState.company_id || null,
          zone_id: newState.zone_id || null,
          periodKey: newState.periodKey || null,
          modifiedBy,
          actionType: 'init',
          commitMessage: 'Khai báo dữ liệu lên hệ thống',
          transactionId: txId
        });
        return;
      }

      // Lấy old state để tính diff (chỉ khi update)
      const oldState = doc._wasNew ? null : await doc.constructor.findById(resourceId).lean();

      // actionType được xác định từ _wasNew (set ở pre-save), KHÔNG phải doc.isNew
      await VersionManager.commitChange({
        resourceType,
        resourceId,
        oldObj: oldState,
        newObj: newState,
        company_id: newState.company_id || null,
        zone_id: newState.zone_id || null,
        periodKey: newState.periodKey || null,
        modifiedBy,
        actionType: doc._wasNew ? 'create' : 'update',
        transactionId: txId
      });
    } catch (err) {
      console.error('versionPlugin.post.save error', err);
    }
  });

  // ── POST REMOVE: Ghi version log xóa ──
  schema.post('remove', async function (doc) {
    try {
      const resourceType = doc.constructor.modelName;
      const resourceId = doc._id;
      const modifiedBy = doc._modifiedBy || 'system';
      const txId = doc._txId || VersionManager.createTransactionId();

      await VersionManager.commitChange({
        resourceType,
        resourceId,
        oldObj: doc.toObject(),
        newObj: null,
        company_id: doc.company_id || null,
        zone_id: doc.zone_id || null,
        periodKey: doc.periodKey || null,
        modifiedBy,
        actionType: 'delete',
        transactionId: txId
      });
    } catch (err) {
      console.error('versionPlugin.post.remove error', err);
    }
  });
}

module.exports = versionPlugin;
