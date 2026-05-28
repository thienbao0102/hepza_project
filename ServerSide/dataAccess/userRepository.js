const mongoose = require('mongoose');
const User = require('../models/userModel');

const createUser = async (userData, session = null) => {
  const user = new User(userData);
  return await user.save({ session });
};
const findByUserId = async (user_id) => {
  return await User.findOne({ user_id, deleted_at: null }).lean();
};

const findByEmail = async (email) => {
  const normalized = email?.trim().toLowerCase();
  return await User.findOne({ email: normalized, deleted_at: null }).lean();
};

const findByPhoneNumber = async (phone_number) => {
  return await User.findOne({ phone_number, deleted_at: null }).lean();
};

const updateUserPassword = async (user_id, updateData, options = { new: true }) => {
  return await User.findOneAndUpdate(
    { user_id },
    { $set: updateData },
    options
  );
};

const updateUserResetToken = async (email, updateData, options = { new: true }) => {
  return await User.findOneAndUpdate(
    { email },
    { $set: updateData },
    options
  );
};

const findByResetToken = async (token) => {
  return await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: Date.now() }
  });
};

const updateUser = async (user_id, updateData, session = null) => {
  return await User.findOneAndUpdate(
    { user_id },
    { $set: { ...updateData, updated_at: new Date() } },
    { new: true, session }
  );
};

/**
 * Version-aware update — Optimistic Locking.
 * Includes `__v` in the filter so MongoDB only updates if the version matches.
 * Returns null when the version is stale → caller should throw VersionConflictError.
 */
const updateUserWithVersion = async (user_id, expectedVersion, updateData, session = null) => {
  return await User.findOneAndUpdate(
    { user_id, __v: expectedVersion },
    {
      $set: { ...updateData, updated_at: new Date() },
      $inc: { __v: 1 }
    },
    { new: true, session }
  );
};

const softDeleteUser = async (user_id, userId) => {
  return await User.findOneAndUpdate(
    { user_id, deleted_at: null },
    { deleted_at: new Date(), deleted_by: userId },
    { new: true }
  );
};

const applyUserListFilters = (query, filters = {}, dateField = 'updated_at') => {
  const zoneFilter = filters.zone_id ?? filters.zone;
  if (zoneFilter) {
    query.zone_id = Array.isArray(zoneFilter) ? { $in: zoneFilter } : zoneFilter;
  }

  const companyFilter = filters.company_id ?? filters.company;
  if (companyFilter) {
    query.company_id = Array.isArray(companyFilter) ? { $in: companyFilter } : companyFilter;
  }

  if (filters.date_range?.from && filters.date_range?.to) {
    query[dateField] = {
      $gte: new Date(filters.date_range.from),
      $lte: new Date(filters.date_range.to)
    };
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { full_name: searchRegex },
      { email: searchRegex },
      { phone_number: searchRegex }
    ];
  }

  return query;
};

const countUsers = async (role, filters = {}) => {
  const baseQuery = { role };
  if (!filters.include_deleted) {
    baseQuery.deleted_at = null;
  }
  const query = applyUserListFilters(baseQuery, filters);
  return await User.countDocuments(query);
};

const getUserById = async (user_id) => {
  return await User.aggregate([
    { $match: { user_id, deleted_at: null } },
    {
      $lookup: {
        from: 'industrialzones',
        localField: 'zone_id',
        foreignField: 'zone_id',
        as: 'zone_info'
      }
    },
    { $unwind: { path: '$zone_info', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'companies',
        localField: 'company_id',
        foreignField: 'company_id',
        as: 'company_info'
      }
    },
    { $unwind: { path: '$company_info', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        user_id: 1,
        full_name: 1,
        phone_number: 1,
        email: 1,
        role: 1,
        company_id: 1,
        zone_id: 1,
        firstLogin: 1,
        zone_name: '$zone_info.zone_name',
        company_name: '$company_info.company_name',
        representative_user_id: '$company_info.representative_user_id',
        updated_at: 1,
      }
    }
  ]).then(results => results[0]);
};

const getUsersByRole = async (role, skip, limit, filters = {}, sort = {}) => {
  const baseQuery = { role };
  if (!filters.include_deleted) {
    baseQuery.deleted_at = null;
  }
  const matchQuery = applyUserListFilters(baseQuery, filters);

  // Determine sort order
  let sortStage = { updated_at: -1, _id: 1 }; // Default sort
  if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
    const sortField = Object.keys(sort)[0];
    let order = sort[sortField];

    // Chuyển đổi string/number sang order hợp lệ
    if (order === 'asc' || order === 1 || order === 'Cũ nhất') order = 1;
    else if (order === 'desc' || order === -1 || order === 'Mới nhất') order = -1;
    else order = -1;

    sortStage = { [sortField]: order, _id: 1 };
  }

  return await User.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'industrialzones',
        localField: 'zone_id',
        foreignField: 'zone_id',
        as: 'zone_info'
      }
    },
    {
      $unwind: {
        path: '$zone_info',
        preserveNullAndEmptyArrays: true
      }
    },
    // THÊM: Join với Company để lấy company_name
    {
      $lookup: {
        from: 'companies',
        localField: 'company_id',
        foreignField: 'company_id',
        as: 'company_info'
      }
    },
    {
      $unwind: {
        path: '$company_info',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        user_id: 1,
        full_name: 1,
        phone_number: 1,
        email: 1,
        role: 1,
        company_id: 1,
        zone_id: 1,
        firstLogin: 1,
        zone_name: '$zone_info.zone_name',
        company_name: '$company_info.company_name',
        representative_user_id: '$company_info.representative_user_id',
        updated_at: 1,
        status: { $ifNull: ['$status', 'Đang Hoạt Động'] },
      }
    },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit }
  ]);
};

const restoreUser = async (user_id, session = null) => {
  const updater = User.findOneAndUpdate(
    { user_id },
    { $unset: { deleted_at: 1, deleted_by: 1 } },
    { new: true }
  );
  if (session) updater.session(session);
  return await updater;
};
const findOne = async (query, session = null) => {
  return await User.findOne(query).session(session).lean();
};

const find = async (query, session = null) => {
  const finder = User.find(query).lean();
  if (session) finder.session(session);
  return await finder;
};

const updateMany = async (query, updateData, session = null) => {
  const updater = User.updateMany(query, updateData);
  if (session) updater.session(session);
  return await updater;
};

const deleteMany = async (query, session = null) => {
  return await User.deleteMany(query, { session });
};

//get list name user by user_id
const getNameByUserId = async (user_ids) => {
  const normalizedIds = Array.isArray(user_ids)
    ? user_ids.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)
    : [String(user_ids || '').trim()].filter(Boolean);

  if (normalizedIds.length === 0) {
    return [];
  }

  let users = await User.find({ user_id: { $in: normalizedIds } }).lean();
  if (users && users.length > 0) {
    return users.map(user => ({
      _id: user.user_id,
      fullName: user.full_name || user.name || '(Không rõ tên)',
      email: user.email || '(Không có email)'
    }));
  }

  const objectIds = normalizedIds.filter((value) => mongoose.Types.ObjectId.isValid(value));
  if (objectIds.length === 0) {
    return [];
  }

  users = await User.find({ _id: { $in: objectIds } }).lean();
  return users.map(user => ({
    _id: user._id,
    fullName: user.full_name || user.name || '(Không rõ tên)',
    email: user.email || '(Không có email)'
  }));
}

// Xóa cứng 1 user
const hardDeleteUser = async (user_id, requireSoftDelete = true, session = null) => {
  const query = { user_id };
  if (requireSoftDelete) {
    query.deleted_at = { $ne: null };
  }
  const deleter = User.deleteOne(query);
  if (session) deleter.session(session);
  return await deleter;
};

// Xóa cứng nhiều user (chỉ những user đã soft delete)
const hardDeleteUsers = async (user_ids, session = null) => {
  const deleter = User.deleteMany({
    user_id: { $in: user_ids },
    deleted_at: { $ne: null }
  });
  if (session) deleter.session(session);
  return await deleter;
};

const getSoftDeletedUsers = async (role, skip, limit, filters = {}) => {
  const matchQuery = applyUserListFilters(
    { deleted_at: { $ne: null }, ...(role ? { role } : {}) },
    filters,
    'deleted_at'
  );

  return await User.aggregate([
    { $match: matchQuery },
    {
      $lookup: { from: 'industrialzones', localField: 'zone_id', foreignField: 'zone_id', as: 'zone_info' }
    },
    { $unwind: { path: '$zone_info', preserveNullAndEmptyArrays: true } },
    {
      $lookup: { from: 'companies', localField: 'company_id', foreignField: 'company_id', as: 'company_info' }
    },
    { $unwind: { path: '$company_info', preserveNullAndEmptyArrays: true } },
    {
      $lookup: { from: 'users', localField: 'deleted_by', foreignField: 'user_id', as: 'deleted_by_user' }
    },
    { $unwind: { path: '$deleted_by_user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        user_id: 1,
        full_name: 1,
        phone_number: 1,
        email: 1,
        role: 1,
        company_id: 1,
        zone_id: 1,
        zone_name: '$zone_info.zone_name',
        company_name: '$company_info.company_name',
        representative_user_id: '$company_info.representative_user_id',
        deleted_at: 1,
        deleted_by_name: { $ifNull: ['$deleted_by_user.full_name', 'Hệ thống'] },
      }
    },
    { $sort: { deleted_at: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
};

// Đếm tổng số user đã bị soft delete
const countSoftDeletedUsers = async (role = null, filters = {}) => {
  const query = applyUserListFilters(
    { deleted_at: { $ne: null }, ...(role ? { role } : {}) },
    filters,
    'deleted_at'
  );
  return await User.countDocuments(query);
};

const hardDeleteUsersByCompany = async (company_id, session = null) => {
  const deleter = User.deleteMany({ company_id, role: 'company' });
  if (session) deleter.session(session);
  return await deleter;
};

const hardDeleteUsersByCompanies = async (company_ids, session = null) => {
  const deleter = User.deleteMany({ company_id: { $in: company_ids }, role: 'company' });
  if (session) deleter.session(session);
  return await deleter;
}

const restoreUsers = async (user_ids, currentUserId, session = null) => {
  const updater = User.updateMany(
    { user_id: { $in: user_ids }, deleted_at: { $ne: null } },
    {
      $unset: { deleted_at: 1, deleted_by: 1 },
      $set: { updated_by: currentUserId, updated_at: new Date() }
    }
  );
  if (session) updater.session(session);
  return await updater;
};

module.exports = {
  createUser,
  findByUserId,
  findByEmail,
  findByPhoneNumber,
  updateUser,
  updateUserWithVersion,
  softDeleteUser,
  countUsers,
  getUsersByRole,
  restoreUser,
  updateUserPassword,
  updateUserResetToken,
  findByResetToken,
  findOne,
  find,
  updateMany,
  deleteMany,
  getUserById,
  getNameByUserId,
  hardDeleteUser,
  hardDeleteUsers,
  getSoftDeletedUsers,
  countSoftDeletedUsers,
  hardDeleteUsersByCompany,
  restoreUsers,
  hardDeleteUsersByCompanies
};
