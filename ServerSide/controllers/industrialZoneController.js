const { default: mongoose } = require('mongoose');
const industrialZoneService = require('../services/industrialZoneService');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const cacheManager = require('../lib/cacheManager');
const { invalidateAllUserSessions } = require('../utils/sessionManager');

const emitZoneChange = (payload = {}) => {
  try {
    const { getIo } = require('../config/socket');
    const io = getIo();
    if (io) {
      io.emit('zone:updated', payload);
    }
  } catch (_) {
    // Socket sync is best-effort only.
  }
};

const invalidateZoneManagerAccess = async (managerUserIds = [], message) => {
  for (const userId of managerUserIds) {
    await invalidateAllUserSessions(userId, message);
    await cacheManager.del(`user:${userId}`);
    await cacheManager.del(`audit:${userId}`);
  }
};

const clearZoneManagerCache = async (managerUserIds = []) => {
  for (const userId of managerUserIds) {
    await cacheManager.del(`user:${userId}`);
    await cacheManager.del(`audit:${userId}`);
  }
};

const getAllIndustrialZones = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filterParams = req.query.filters ? JSON.parse(req.query.filters) : {};
    const search = req.query.search || '';
    const { zones, total } = await industrialZoneService.getAllIndustrialZones(page, limit, filterParams, search);
    res.status(200).json({ message: 'Industrial zones retrieved successfully', zones, total });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getZoneById = async (req, res) => {
  try {
    const zoneId = req.params.zone_id;
    const zone = await industrialZoneService.getZoneById(zoneId);
    if (!zone) {
      return res.status(404).json({ error: 'Industrial zone not found' });
    }
    res.status(200).json({ message: 'Industrial zone retrieved successfully', zone });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createIndustrialZone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let zoneData = req.body.zoneData;
    if (!zoneData) {
      return res.status(400).json({ error: 'zoneData is required' });
    }
    try {
      zoneData = JSON.parse(zoneData); // Parse chuỗi JSON từ form-data
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format for zoneData' });
    }
    if (!zoneData.zone_name || !zoneData.zone_type) {
      return res.status(400).json({ error: 'Missing required fields: zone_name, zone_type' });
    }

    const userId = req.user.user_id;

    const zone = await industrialZoneService.createIndustrialZone({ ...zoneData, image_url: req.file?.path }, userId, session, req);
    await session.commitTransaction();
    emitZoneChange({ zone_id: zone?.zone_id || null, action: 'created' });
    res.status(201).json({ message: 'Industrial zone added successfully', zone }); // Trả về toàn bộ zone thay vì chỉ zone_id
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// Helper function to safely compare values
const isValueChanged = (newValue, oldValue) => {
  // Handle null/undefined cases
  if (newValue === null || newValue === undefined) {
    return oldValue !== null && oldValue !== undefined;
  }
  if (oldValue === null || oldValue === undefined) {
    return newValue !== null && newValue !== undefined;
  }

  // Handle array comparison (for managers_ids)
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    if (newValue.length !== oldValue.length) return true;
    return newValue.some((item, index) => item !== oldValue[index]);
  }

  // Handle number comparison (for established_year)
  if (typeof newValue === 'number' && typeof oldValue === 'number') {
    return newValue !== oldValue;
  }

  // Convert both to string for comparison to handle different types
  const newStr = String(newValue).trim();
  const oldStr = String(oldValue).trim();
  return newStr !== oldStr;
};

const updateIndustrialZone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const zoneId = req.params.zone_id;
    let zoneData = req.body.zoneData;

    if (!zoneData) {
      return res.status(400).json({ error: 'zoneData is required' });
    }

    try {
      zoneData = JSON.parse(zoneData); // Parse chuỗi JSON từ form-data
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format for zoneData' });
    }

    const userId = req.user.user_id;
    const existingZone = await industrialZoneService.getZoneById(zoneId);
    if (!existingZone) {
      return res.status(404).json({ error: 'Industrial zone not found' });
    }

    // Define fields that can be updated (excluding system fields and zone_type)
    const updatableFields = ['zone_name', 'location', 'established_year', 'status', 'managers_ids'];
    const updateData = {};
    let hasChanged = false;

    // Check for changes in updatable fields only
    for (const field of updatableFields) {
      if (zoneData.hasOwnProperty(field)) {
        if (isValueChanged(zoneData[field], existingZone[field])) {
          updateData[field] = zoneData[field];
          hasChanged = true;
        }
      }
    }

    // Check if a new image is being uploaded
    if (req.file) {
      updateData.image_url = req.file.path; // Cloudinary path from upload middleware
      hasChanged = true;
    } else if (zoneData.hasOwnProperty('image_url') && zoneData.image_url === null && existingZone.image_url) {
      updateData.image_url = null;
      hasChanged = true;
    }

    if (!hasChanged) {
      return res.status(400).json({ error: 'Không có thay đổi nào được thực hiện.' });
    }

    const zone = await industrialZoneService.updateIndustrialZone(zoneId, updateData, userId, session, req);
    await session.commitTransaction();
    res.status(200).json({ message: 'Industrial zone updated successfully', zone });
  } catch (error) {
    await session.abortTransaction();
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const deleteIndustrialZone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const zoneId = req.params.zone_id;
    const currentUser = req.user;
    const result = await industrialZoneService.deleteIndustrialZone(zoneId, currentUser, session);
    await session.commitTransaction();
    await invalidateZoneManagerAccess(
      result.affectedManagerUserIds,
      'Khu công nghiệp của bạn đã bị vô hiệu hóa khỏi hệ thống.'
    );
    emitZoneChange({ zone_id: zoneId, action: 'deleted' });
    res.status(200).json({ message: 'Industrial zone deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const restoreIndustrialZone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const zoneId = req.params.zone_id;
    const currentUser = req.user;
    const result = await industrialZoneService.restoreIndustrialZone(zoneId, currentUser, session);
    await session.commitTransaction();
    await clearZoneManagerCache(result.affectedManagerUserIds);
    emitZoneChange({ zone_id: zoneId, action: 'restored' });
    res.status(200).json({ message: 'Industrial zone restored successfully', zone: result.zone });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const deleteIndustrialZones = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { zoneIds } = req.body;
    if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
      return res.status(400).json({ error: 'zoneIds array is required' });
    }
    const currentUser = req.user;
    const result = await industrialZoneService.deleteIndustrialZones(zoneIds, currentUser, session);
    await session.commitTransaction();
    await invalidateZoneManagerAccess(
      result.affectedManagerUserIds,
      'Khu công nghiệp của bạn đã bị vô hiệu hóa khỏi hệ thống.'
    );
    emitZoneChange({ action: 'deleted-many', zone_ids: zoneIds });
    res.status(200).json({ message: 'Industrial zones deleted successfully', ...result });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const restoreIndustrialZones = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { zoneIds } = req.body;
    if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
      return res.status(400).json({ error: 'zoneIds array is required' });
    }
    const currentUser = req.user;
    const result = await industrialZoneService.restoreIndustrialZones(zoneIds, currentUser, session);
    await session.commitTransaction();
    await clearZoneManagerCache(result.affectedManagerUserIds);
    emitZoneChange({ action: 'restored-many', zone_ids: zoneIds });
    res.status(200).json({ message: 'Industrial zones restored successfully', ...result });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const hardDeleteIndustrialZone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const zoneId = req.params.zone_id;
    const currentUser = req.user;
    const result = await industrialZoneService.hardDeleteIndustrialZone(zoneId, currentUser, session);
    await session.commitTransaction();
    await invalidateZoneManagerAccess(
      result.affectedManagerUserIds,
      'Khu công nghiệp của bạn đã bị xóa khỏi hệ thống.'
    );
    await destroyUnusedCloudinaryUrls(result.deletedZoneImages || []);
    emitZoneChange({ zone_id: zoneId, action: 'hard-deleted' });
    res.status(200).json({ message: 'Industrial zone permanently deleted successfully', ...result });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const hardDeleteIndustrialZones = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { zoneIds } = req.body;
    if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
      return res.status(400).json({ error: 'zoneIds array is required' });
    }
    const currentUser = req.user;
    const result = await industrialZoneService.hardDeleteIndustrialZones(zoneIds, currentUser, session);
    await session.commitTransaction();
    await invalidateZoneManagerAccess(
      result.affectedManagerUserIds,
      'Khu công nghiệp của bạn đã bị xóa khỏi hệ thống.'
    );
    await destroyUnusedCloudinaryUrls(result.deletedZoneImages || []);
    emitZoneChange({ action: 'hard-deleted-many', zone_ids: zoneIds });
    res.status(200).json({ message: 'Industrial zones permanently deleted successfully', ...result });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  } finally {
    session.endSession();
  }
};

const previewSoftDelete = async (req, res) => {
  try {
    const { parseZoneIds } = require('../utils/parseIds');
    const zone_ids = parseZoneIds(req.query.zone_ids);

    const zones = await industrialZoneService.previewSoftDeleteZones(zone_ids);

    if (zones.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy khu công nghiệp nào phù hợp (có thể đã bị xóa hoặc không tồn tại)'
      });
    }

    res.json({
      action: 'soft-delete',
      message: 'Khu công nghiệp và các công ty/user liên quan sẽ bị xóa mềm',
      totalZones: zones.length,
      zones: zones
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const previewHardDelete = async (req, res) => {
  try {
    const { parseZoneIds } = require('../utils/parseIds');
    const zone_ids = parseZoneIds(req.query.zone_ids);

    const zones = await industrialZoneService.previewHardDeleteZones(zone_ids);

    res.json({
      action: 'hard-delete',
      message: 'CẢNH BÁO: KCN và các công ty/user đã xóa mềm liên quan sẽ bị XÓA VĨNH VIỄN!',
      warning: 'Dữ liệu sẽ không thể khôi phục',
      totalZones: zones.length,
      zones: zones
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getAllIndustrialZones,
  getZoneById,
  createIndustrialZone,
  updateIndustrialZone,
  deleteIndustrialZone,
  restoreIndustrialZone,
  deleteIndustrialZones,
  restoreIndustrialZones,
  hardDeleteIndustrialZone,
  hardDeleteIndustrialZones,
  previewSoftDelete,
  previewHardDelete,
};
