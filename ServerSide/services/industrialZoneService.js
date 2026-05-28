const industrialZoneRepository = require('../dataAccess/industrialZoneRepository');
const companyRepository = require('../dataAccess/companyRepository');
const companyService = require('../services/companyService');
const userRepository = require('../dataAccess/userRepository');
const fs = require('fs');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const { uploadOrReuseAttachment } = require('../config/cloudinary');
const { VersionConflictError, StateConflictError } = require('../utils/conflictError');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');
const {
  normalizeZoneNameForCompare,
  normalizeZoneSearchText,
} = require('../utils/zoneNameNormalizer');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let zoneSearchSyncPromise = null;

const ensureZoneSearchFields = async () => {
  if (!zoneSearchSyncPromise) {
    zoneSearchSyncPromise = industrialZoneRepository
      .syncZoneSearchFields()
      .catch((error) => {
        console.warn('Failed to sync industrial zone search fields:', error.message);
      })
      .finally(() => {
        zoneSearchSyncPromise = null;
      });
  }

  await zoneSearchSyncPromise;
};

const initQuery = (filterParams, search) => {
  const query = {};
  const conditions = [];

  if (filterParams && (filterParams.isDisable === true || filterParams.isDisable === 'true')) {
    conditions.push({ deleted_at: { $ne: null } });
  } else {
    conditions.push({ deleted_at: null });
  }

  const establishedYearRanges = {
    'Dưới năm 2000': { $lt: 2000 },
    'Từ năm 2000 - 2010': { $gte: 2000, $lte: 2010 },
    'Trên năm 2010': { $gt: 2010 },
  };

  if (search && typeof search === 'string' && search.trim() !== '') {
    const rawSearch = search.trim();
    const normalizedSearch = normalizeZoneSearchText(rawSearch);

    conditions.push({
      $or: [
        { zone_id: { $regex: escapeRegex(rawSearch), $options: 'i' } },
        { zone_name: { $regex: escapeRegex(rawSearch), $options: 'i' } },
        { search_text: { $regex: escapeRegex(normalizedSearch), $options: 'i' } },
      ],
    });
  }

  if (filterParams && typeof filterParams === 'object') {
    if (filterParams.zoneType && typeof filterParams.zoneType === 'string' && filterParams.zoneType !== '') {
      conditions.push({ zone_type: filterParams.zoneType });
    }

    if (filterParams.district && typeof filterParams.district === 'string' && filterParams.district !== '') {
      const rawDistrict = filterParams.district.trim();
      const normalizedDistrict = normalizeZoneSearchText(rawDistrict);
      conditions.push({
        $or: [
          { location: { $regex: escapeRegex(rawDistrict), $options: 'i' } },
          { location_normalized: { $regex: escapeRegex(normalizedDistrict), $options: 'i' } },
        ],
      });
    }

    if (filterParams.location && Array.isArray(filterParams.location) && filterParams.location.length > 0) {
      conditions.push({
        $or: filterParams.location.map((loc) => {
          const rawLocation = String(loc || '').trim();
          const normalizedLocation = normalizeZoneSearchText(rawLocation);

          return {
            $or: [
              { location: { $regex: escapeRegex(rawLocation), $options: 'i' } },
              { location_normalized: { $regex: escapeRegex(normalizedLocation), $options: 'i' } },
            ],
          };
        }),
      });
    }

    if (filterParams.zone_name && Array.isArray(filterParams.zone_name) && filterParams.zone_name.length > 0) {
      conditions.push({ zone_name: { $in: filterParams.zone_name } });
    }

    if (filterParams.establishedYear && establishedYearRanges[filterParams.establishedYear]) {
      conditions.push({ established_year: establishedYearRanges[filterParams.establishedYear] });
    }

    if (filterParams.status && typeof filterParams.status === 'string' && filterParams.status !== '') {
      conditions.push({ status: filterParams.status });
    }

    if (filterParams.zone_id) {
      conditions.push({ zone_id: filterParams.zone_id });
    }
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  if (conditions.length > 1) {
    query.$and = conditions;
  }

  return query;
};
const buildStateConflictMessage = (entityLabel, actionLabel) => (
  `${entityLabel} này đã được người khác thay đổi trạng thái trước khi ${actionLabel}. Vui lòng tải lại danh sách rồi thử lại.`
);

const getManagersByZoneIds = async (zoneIds, deletedFilter, session = null) => {
  const normalizedZoneIds = (Array.isArray(zoneIds) ? zoneIds : [zoneIds]).filter(Boolean);
  if (normalizedZoneIds.length === 0) {
    return [];
  }

  return userRepository.find({
    role: 'manager',
    zone_id: { $in: normalizedZoneIds },
    deleted_at: deletedFilter,
  }, session);
};

const getZoneIdByName = async (zone_name) => {
  return await industrialZoneRepository.getZoneIdByName(zone_name);
};

const assertNoDuplicateZoneName = async (zoneName, excludeZoneId = null) => {
  const normalizedInput = normalizeZoneNameForCompare(zoneName);
  if (!normalizedInput) {
    throw new Error('zone_name is required');
  }

  const existingZones = await industrialZoneRepository.find({ deleted_at: null });
  const conflictedZone = existingZones.find((zone) => (
    zone.zone_id !== excludeZoneId
    && normalizeZoneNameForCompare(zone.zone_name) === normalizedInput
  ));

  if (conflictedZone) {
    throw new Error(`Tên KCN/KCX bị trùng với "${conflictedZone.zone_name}". Vui lòng dùng tên thống nhất hoặc cập nhật KCN hiện có.`);
  }
};

const getAllIndustrialZones = async (page = 1, limit = 10, filterParams, search) => {
  try {
    await ensureZoneSearchFields();
    const query = initQuery(filterParams, search);
    const { zones, total } = await industrialZoneRepository.getAllIndustrialZones(page, limit, query);
    return { zones, total };
  } catch (error) {
    throw error;
  }
};

const createIndustrialZone = async (zoneData, userId, session, req) => { // Thêm req làm tham số
  try {
    await assertNoDuplicateZoneName(zoneData.zone_name);

    let imageUrl = zoneData.image_url;

    if (req.file && await fs.promises.stat(req.file.path).catch(() => false)) {
      imageUrl = await uploadOrReuseAttachment(req.file.path, {
        resource_type: 'image',
        folder: CLOUDINARY_FOLDERS.industrialZones,
        mime_type: req.file.mimetype,
        original_filename: req.file.originalname,
      });
      zoneData.image_url = imageUrl; // Cập nhật lại zoneData với URL mới
    }

    try {
      const zoneDataToSave = { ...zoneData, created_by: userId, updated_by: userId };
      const zone = await industrialZoneRepository.createIndustrialZone(zoneDataToSave, session);
      return zone;
    } catch (error) {
      if (imageUrl) {
        await destroyUnusedCloudinaryUrls([imageUrl]);
      }
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

const updateIndustrialZone = async (zoneId, zoneData, userId, session, req) => { // Thêm req làm tham số
  try {
    const existingZone = await industrialZoneRepository.findOne(
      { zone_id: zoneId, deleted_at: null },
      session
    );
    if (!existingZone) {
      throw new Error('Zone not found');
    }

    const dataToUpdate = { ...zoneData };
    // Remove __v from data before passing to repository (handled by Mongoose .save())
    delete dataToUpdate.__v;
    let nextImageUrl = null;

    if (dataToUpdate.zone_name) {
      await assertNoDuplicateZoneName(dataToUpdate.zone_name, zoneId);
    }

    if (req.file && await fs.promises.stat(req.file.path).catch(() => false)) {
      nextImageUrl = await uploadOrReuseAttachment(req.file.path, {
        resource_type: 'image',
        folder: CLOUDINARY_FOLDERS.industrialZones,
        mime_type: req.file.mimetype,
        original_filename: req.file.originalname,
      });
      dataToUpdate.image_url = nextImageUrl;
    }

    let zone;
    try {
      zone = await industrialZoneRepository.updateIndustrialZone(zoneId, dataToUpdate, userId, session);
    } catch (error) {
      if (nextImageUrl) {
        await destroyUnusedCloudinaryUrls([nextImageUrl]);
      }
      throw error;
    }

    const shouldCleanupOldImage = (
      existingZone.image_url &&
      (
        (nextImageUrl && nextImageUrl !== existingZone.image_url) ||
        dataToUpdate.image_url === null
      )
    );

    if (shouldCleanupOldImage) {
      await destroyUnusedCloudinaryUrls([existingZone.image_url]);
    }

    // ── Real-time sync via Socket.IO ────────────────────────────────
    try {
      const { getIo } = require('../config/socket'); // lazy-require
      const io = getIo();
      if (io) {
        io.emit('zone:updated', {
          zone_id: zoneId,
          __v: zone.__v,
          updated_by: userId
        });
      }
    } catch (_) { /* best-effort */ }

    return zone;
  } catch (error) {
    // Mongoose .save() throws VersionError when __v doesn't match
    if (error.name === 'VersionError') {
      throw new VersionConflictError();
    }
    throw error;
  }
};

const deleteIndustrialZone = async (zoneId, currentUser, session) => { // Thay userId bằng currentUser để khớp với deleteCompaniesByIds
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can delete industrial zone');
    }
    const currentZone = await industrialZoneRepository.findOne({ zone_id: zoneId }, session);
    if (!currentZone || currentZone.deleted_at) {
      throw new StateConflictError(buildStateConflictMessage('Khu công nghiệp', 'vô hiệu hóa'));
    }
    const activeManagers = await getManagersByZoneIds(zoneId, null, session);
    // Tìm tất cả doanh nghiệp thuộc khu công nghiệp này (giả sử company model có trường zone_id)
    const companies = await companyRepository.find(
      { zone_id: zoneId, deleted_at: null },
      session
    ); // Giả sử companyRepository có hàm find(query, session) tương tự userRepository

    let companyIds = [];
    if (companies.length > 0) {
      companyIds = companies.map(c => c.company_id);
      const companyService = require('../services/companyService');
      // Xóa mềm các doanh nghiệp và tài khoản liên kết, sử dụng cùng session để đảm bảo transaction
      await companyService.deleteCompaniesByIds(companyIds, currentUser, session); // Truyền session vào deleteCompaniesByIds (cần cập nhật hàm đó để hỗ trợ)
    }

    if (activeManagers.length > 0) {
      await userRepository.updateMany(
        {
          user_id: { $in: activeManagers.map((manager) => manager.user_id) },
          deleted_at: null,
        },
        {
          deleted_at: new Date(),
          deleted_by: currentUser.user_id,
        },
        session
      );
    }

    // Sau đó xóa mềm khu công nghiệp
    const zone = await industrialZoneRepository.deleteIndustrialZone(zoneId, currentUser, session); // Đã cập nhật repo để hỗ trợ session
    return {
      zone,
      message: `Industrial zone and ${companyIds.length} linked companies (with their users) deleted successfully`,
      affectedManagerUserIds: activeManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const restoreIndustrialZone = async (zoneId, currentUser, session = null) => {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can restore industrial zone');
    }

    const deletedManagers = await getManagersByZoneIds(zoneId, { $ne: null }, session);

    // Restore khu công nghiệp
    const zone = await industrialZoneRepository.restoreIndustrialZone(zoneId, session);
    if (!zone) {
      throw new StateConflictError(buildStateConflictMessage('Khu công nghiệp', 'khôi phục'));
    }

    // Tìm tất cả doanh nghiệp bị soft-delete thuộc KCN này
    const deletedCompanies = await companyRepository.find(
      { zone_id: zoneId, deleted_at: { $ne: null } },
      session
    );

    let restoredCount = 0;

    if (deletedCompanies.length > 0) {
      const companyIds = deletedCompanies.map(c => c.company_id);

      // Cascade restore companies + users (giống delete)
      const companyService = require('../services/companyService');
      await companyService.restoreCompanies(companyIds, currentUser, session);

      restoredCount = companyIds.length;
    }

    if (deletedManagers.length > 0) {
      await userRepository.restoreUsers(
        deletedManagers.map((manager) => manager.user_id),
        currentUser.user_id,
        session
      );
    }

    return {
      zone,
      message: `Industrial zone restored successfully. Restored ${restoredCount} linked companies and their users.`,
      affectedManagerUserIds: deletedManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const getZoneById = async (zoneId) => {
  const zone = await industrialZoneRepository.getZoneById(zoneId);
  if (!zone) return null;

  // Populate manager details from User collection
  if (Array.isArray(zone.managers_ids) && zone.managers_ids.length > 0) {
    const userRepository = require('../dataAccess/userRepository');
    const users = await userRepository.find({
      user_id: { $in: zone.managers_ids },
      deleted_at: null
    });

    zone.managers = users.map(u => ({
      user_id: u.user_id,
      full_name: u.full_name || '(Chưa cập nhật)',
      email: u.email || '',
      phone_number: u.phone_number || '',
    }));

    // Derive contact info from first manager
    if (zone.managers.length > 0 && !zone.contact_person) {
      zone.contact_person = zone.managers[0].full_name;
      zone.contact_email = zone.managers[0].email;
      zone.contact_phone = zone.managers[0].phone_number;
    }
  } else {
    zone.managers = [];
  }

  return zone;
};

const deleteIndustrialZones = async (zoneIds, currentUser, session) => {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can delete industrial zones');
    }
    const activeZones = await industrialZoneRepository.find(
      { zone_id: { $in: zoneIds }, deleted_at: null },
      session
    );
    if (activeZones.length !== zoneIds.length) {
      throw new StateConflictError('Một hoặc nhiều khu công nghiệp đã thay đổi trạng thái trước khi vô hiệu hóa. Vui lòng tải lại danh sách rồi thử lại.');
    }
    const activeManagers = await getManagersByZoneIds(zoneIds, null, session);
    const companies = await companyRepository.find(
      { zone_id: { $in: zoneIds }, deleted_at: null },
      session
    );

    let companyIds = [];
    if (companies.length > 0) {
      companyIds = companies.map(c => c.company_id);
      const companyService = require('../services/companyService');
      await companyService.deleteCompaniesByIds(companyIds, currentUser, session);
    }

    if (activeManagers.length > 0) {
      await userRepository.updateMany(
        {
          user_id: { $in: activeManagers.map((manager) => manager.user_id) },
          deleted_at: null,
        },
        {
          deleted_at: new Date(),
          deleted_by: currentUser.user_id,
        },
        session
      );
    }

    const result = await industrialZoneRepository.deleteIndustrialZones(zoneIds, currentUser, session);
    return {
      result,
      message: `${result.modifiedCount} Industrial zones and ${companyIds.length} linked companies deleted successfully`,
      affectedManagerUserIds: activeManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const restoreIndustrialZones = async (zoneIds, currentUser, session = null) => {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can restore industrial zones');
    }

    const deletedManagers = await getManagersByZoneIds(zoneIds, { $ne: null }, session);

    const deletedZones = await industrialZoneRepository.find(
      { zone_id: { $in: zoneIds }, deleted_at: { $ne: null } },
      session
    );
    if (deletedZones.length !== zoneIds.length) {
      throw new StateConflictError('Một hoặc nhiều khu công nghiệp đã thay đổi trạng thái trước khi khôi phục. Vui lòng tải lại danh sách rồi thử lại.');
    }

    const result = await industrialZoneRepository.restoreIndustrialZones(zoneIds, session);

    const deletedCompanies = await companyRepository.find(
      { zone_id: { $in: zoneIds }, deleted_at: { $ne: null } },
      session
    );

    let restoredCount = 0;
    if (deletedCompanies.length > 0) {
      const companyIds = deletedCompanies.map(c => c.company_id);
      const companyService = require('../services/companyService');
      await companyService.restoreCompanies(companyIds, currentUser, session);
      restoredCount = companyIds.length;
    }

    if (deletedManagers.length > 0) {
      await userRepository.restoreUsers(
        deletedManagers.map((manager) => manager.user_id),
        currentUser.user_id,
        session
      );
    }

    return {
      result,
      message: `${result.modifiedCount} Industrial zones restored successfully. Restored ${restoredCount} linked companies and their users.`,
      affectedManagerUserIds: deletedManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const hardDeleteIndustrialZone = async (zoneId, currentUser, session = null) => {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can hard delete industrial zone');
    }

    const zone = await industrialZoneRepository.findOne(
      { zone_id: zoneId, deleted_at: { $ne: null } },
      session
    );
    if (!zone) {
      throw new StateConflictError(buildStateConflictMessage('Khu công nghiệp', 'xóa vĩnh viễn'));
    }

    const deletedManagers = await getManagersByZoneIds(zoneId, { $ne: null }, session);

    const deletedCompanies = await companyRepository.find(
      { zone_id: zoneId, deleted_at: { $ne: null } },
      session
    );

    if (deletedCompanies.length > 0) {
      const companyIds = deletedCompanies.map(c => c.company_id);
      const companyService = require('../services/companyService');
      await companyService.hardDeleteCompanies(companyIds, currentUser, session);
    }

    if (deletedManagers.length > 0) {
      await userRepository.deleteMany(
        {
          user_id: { $in: deletedManagers.map((manager) => manager.user_id) },
          deleted_at: { $ne: null },
        },
        session
      );
    }

    await industrialZoneRepository.hardDeleteIndustrialZone(zoneId, session);
    return {
      message: `Industrial zone and all associated soft-deleted companies permanently deleted`,
      deletedZoneImages: zone.image_url ? [zone.image_url] : [],
      affectedManagerUserIds: deletedManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const hardDeleteIndustrialZones = async (zoneIds, currentUser, session = null) => {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only admin can hard delete industrial zones');
    }

    const zones = await industrialZoneRepository.find(
      { zone_id: { $in: zoneIds }, deleted_at: { $ne: null } },
      session
    );

    if (zones.length !== zoneIds.length) {
      throw new StateConflictError('Một hoặc nhiều khu công nghiệp đã thay đổi trạng thái trước khi xóa vĩnh viễn. Vui lòng tải lại danh sách rồi thử lại.');
    }

    const validZoneIds = zones.map(z => z.zone_id);
    const deletedManagers = await getManagersByZoneIds(validZoneIds, { $ne: null }, session);

    const deletedCompanies = await companyRepository.find(
      { zone_id: { $in: validZoneIds }, deleted_at: { $ne: null } },
      session
    );

    if (deletedCompanies.length > 0) {
      const companyIds = deletedCompanies.map(c => c.company_id);
      const companyService = require('../services/companyService');
      await companyService.hardDeleteCompanies(companyIds, currentUser, session);
    }

    if (deletedManagers.length > 0) {
      await userRepository.deleteMany(
        {
          user_id: { $in: deletedManagers.map((manager) => manager.user_id) },
          deleted_at: { $ne: null },
        },
        session
      );
    }

    await industrialZoneRepository.hardDeleteIndustrialZones(validZoneIds, session);
    return {
      message: `${validZoneIds.length} industrial zones and all associated soft-deleted companies permanently deleted`,
      deletedZoneImages: zones.map((zone) => zone.image_url).filter(Boolean),
      affectedManagerUserIds: deletedManagers.map((manager) => manager.user_id),
    };
  } catch (error) {
    throw error;
  }
};

const previewSoftDeleteZones = async (zone_ids) => {
  return await industrialZoneRepository.getZonesWithAffectedCompaniesAndUsers(zone_ids, false);
};

const previewHardDeleteZones = async (zone_ids) => {
  return await industrialZoneRepository.getZonesWithAffectedCompaniesAndUsers(zone_ids, true);
};

module.exports = {
  getZoneIdByName,
  getAllIndustrialZones,
  createIndustrialZone,
  updateIndustrialZone,
  deleteIndustrialZone,
  restoreIndustrialZone,
  getZoneById,
  deleteIndustrialZones,
  restoreIndustrialZones,
  hardDeleteIndustrialZone,
  hardDeleteIndustrialZones,
  previewSoftDeleteZones,
  previewHardDeleteZones,
};
