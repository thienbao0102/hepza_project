const IndustrialZone = require('../models/industrialZoneModel');
const { normalizeZoneNameForCompare } = require('../utils/zoneNameNormalizer');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getZoneIdByName = async (zone_name) => {
  const normalizedZoneName = String(zone_name || '').trim();
  const compareName = normalizeZoneNameForCompare(normalizedZoneName);
  const IDzone = await IndustrialZone.findOne({
    deleted_at: null,
    $or: [
      { zone_name: { $regex: `^${escapeRegex(normalizedZoneName)}$`, $options: 'i' } },
      { zone_name_normalized: compareName },
    ],
  }).select({ zone_id: 1, _id: 0 });
  if (!IDzone) {
    throw new Error('Zone not found');
  }
  return IDzone.zone_id;
};

const getAllIndustrialZones = async (page = 1, limit = 10, query) => {
  const skip = (page - 1) * limit;
  const [zones, total] = await Promise.all([
    IndustrialZone.find(query)
      .select({ zone_id: 1, zone_name: 1, zone_type: 1, location: 1, established_year: 1, status: 1, image_url: 1, managers_ids: 1 }) // Thêm managers_ids
      .skip(skip)
      .limit(limit)
      .lean(),
    IndustrialZone.countDocuments(query),
  ]);
  return { zones, total };
};

const createIndustrialZone = async (zoneData) => {
  const zone = new IndustrialZone(zoneData);
  return await zone.save();
};

const updateIndustrialZone = async (zoneId, zoneData, userId) => {
  const zone = await IndustrialZone.findOne({ zone_id: zoneId, deleted_at: null });
  if (!zone) throw new Error('Zone not found');
  Object.assign(zone, { ...zoneData, updated_by: userId, updated_at: new Date() });
  return await zone.save();
};

const deleteIndustrialZone = async (zoneId, currentUser, session = null) => {
  const zone = await IndustrialZone.findOne({ zone_id: zoneId, deleted_at: null }).session(session);
  if (!zone) throw new Error('Zone not found');
  zone.deleted_at = new Date();
  zone.deleted_by = currentUser.user_id;
  return await zone.save({ session });
};

const restoreIndustrialZone = async (zoneId, session = null) => {
  const zone = await IndustrialZone.findOne({ zone_id: zoneId, deleted_at: { $ne: null } }).session(session);;
  if (!zone) throw new Error('Zone not found or already active');
  zone.deleted_at = null;
  zone.deleted_by = null;
  return await zone.save({ session });
};

const getZoneById = async (zoneId) => {
  return await IndustrialZone.findOne({ zone_id: zoneId, deleted_at: null }).lean();
};

const findOne = async (query, session = null) => {
  return await IndustrialZone.findOne(query).session(session).lean();
};

const findOneAndUpdate = async (query, updateData, options = { new: true }) => {
  return await IndustrialZone.findOneAndUpdate(query, { $set: updateData }, options);
};

const find = async (query, session = null) => {
  return await IndustrialZone.find(query).session(session).lean();
};

const getZonesMissingSearchFields = async (limit = 200) => {
  return await IndustrialZone.find({
    $or: [
      { zone_name_normalized: { $exists: false } },
      { location_normalized: { $exists: false } },
      { search_text: { $exists: false } },
      { zone_name_normalized: null },
      { location_normalized: null },
      { search_text: null },
    ],
  }).limit(limit);
};

const syncZoneSearchFields = async (limit = 200) => {
  const zones = await getZonesMissingSearchFields(limit);
  for (const zone of zones) {
    await zone.save();
  }
  return zones.length;
};

const deleteIndustrialZones = async (zoneIds, currentUser, session = null) => {
  return await IndustrialZone.updateMany(
    { zone_id: { $in: zoneIds }, deleted_at: null },
    { $set: { deleted_at: new Date(), deleted_by: currentUser.user_id } },
    { session }
  );
};

const restoreIndustrialZones = async (zoneIds, session = null) => {
  return await IndustrialZone.updateMany(
    { zone_id: { $in: zoneIds }, deleted_at: { $ne: null } },
    { $set: { deleted_at: null, deleted_by: null } },
    { session }
  );
};

const hardDeleteIndustrialZone = async (zoneId, session = null) => {
  return await IndustrialZone.deleteOne({ zone_id: zoneId }, { session });
};

const hardDeleteIndustrialZones = async (zoneIds, session = null) => {
  return await IndustrialZone.deleteMany({ zone_id: { $in: zoneIds } }, { session });
};

//get name zone by _id
const getZoneNameById = async (zone_id) => {
  return await IndustrialZone.findOne({ zone_id, deleted_at: null }).select({ zone_name: 1, _id: 0 }).lean();
}

const normalizeZoneIds = (zone_ids) => {
  if (Array.isArray(zone_ids)) {
    return zone_ids.map((id) => String(id).trim()).filter(Boolean);
  }

  if (typeof zone_ids === 'string') {
    return zone_ids.split(',').map((id) => id.trim()).filter(Boolean);
  }

  if (zone_ids) {
    return [String(zone_ids).trim()].filter(Boolean);
  }

  return [];
};

const getZonesWithAffectedCompaniesAndUsers = async (zone_ids, forHardDelete = false) => {
  const ids = normalizeZoneIds(zone_ids);

  if (ids.length === 0) {
    return [];
  }

  const zoneMatch = forHardDelete
    ? { zone_id: { $in: ids }, deleted_at: { $ne: null } }
    : { zone_id: { $in: ids }, deleted_at: null };

  const companyCond = forHardDelete
    ? { $ne: [{ $ifNull: ['$$company.deleted_at', null] }, null] }  // deleted_at tồn tại → đã xóa
    : { $eq: [{ $ifNull: ['$$company.deleted_at', null] }, null] }; // deleted_at = null hoặc không tồn tại → còn sống

  const userCond = forHardDelete
    ? { $ne: [{ $ifNull: ['$$user.deleted_at', null] }, null] }
    : { $eq: [{ $ifNull: ['$$user.deleted_at', null] }, null] };

  return await IndustrialZone.aggregate([
    { $match: zoneMatch },
    {
      $lookup: {
        from: 'companies',
        localField: 'zone_id',
        foreignField: 'zone_id',
        as: 'affectedCompanies'
      }
    },
    {
      $addFields: {
        affectedCompanies: {
          $filter: {
            input: '$affectedCompanies',
            as: 'company',
            cond: companyCond
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'zone_id',
        foreignField: 'zone_id',
        as: 'affectedUsers'
      }
    },
    {
      $addFields: {
        affectedUsers: {
          $filter: {
            input: '$affectedUsers',
            as: 'user',
            cond: userCond
          }
        }
      }
    },
    {
      $project: {
        zone_id: 1,
        zone_name: 1,
        affectedCompaniesCount: { $size: '$affectedCompanies' },
        affectedUsersCount: { $size: '$affectedUsers' },
        affectedCompanies: {
          company_id: 1,
          company_name: 1,
        },
        affectedUsers: {
          user_id: 1,
          full_name: 1,
          email: 1
        }
      }
    }
  ]);
};
module.exports = {
  getZoneIdByName,
  getAllIndustrialZones,
  createIndustrialZone,
  updateIndustrialZone,
  deleteIndustrialZone,
  restoreIndustrialZone,
  getZoneById,
  findOne,
  findOneAndUpdate,
  find,
  getZonesMissingSearchFields,
  syncZoneSearchFields,
  deleteIndustrialZones,
  restoreIndustrialZones,
  hardDeleteIndustrialZone,
  hardDeleteIndustrialZones,
  getZoneNameById,
  getZonesWithAffectedCompaniesAndUsers
};
