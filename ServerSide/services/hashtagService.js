const HashtagRepository = require('../dataAccess/hashtagRepository');
const UserRepository = require('../dataAccess/userRepository');
const { VersionConflictError, MissingVersionError } = require('../utils/conflictError');

const createHashtag = async (hashtagData, userId) => {
  const user = await UserRepository.findByUserId(userId);
  if (user.role !== 'admin') throw new Error('Chỉ admin tạo hashtag');

  hashtagData.created_by = userId;
  return await HashtagRepository.create(hashtagData);
};

const updateHashtag = async (hashtagId, updateData, userId) => {
  const user = await UserRepository.findByUserId(userId);
  if (user.role !== 'admin') throw new Error('Chỉ admin sửa hashtag');
  if (updateData.__v === undefined || updateData.__v === null) throw new MissingVersionError();

  const hashtag = await HashtagRepository.findById(hashtagId);
  if (!hashtag) throw new Error('Hashtag không tồn tại');

  const clientVersion = updateData.__v;
  delete updateData.__v;
  updateData.updated_by = userId;
  const updated = await HashtagRepository.updateWithVersion(hashtagId, clientVersion, updateData);
  if (!updated) {
    const latest = await HashtagRepository.findById(hashtagId);
    if (!latest) throw new Error('Hashtag không tồn tại');
    throw new VersionConflictError();
  }

  return updated;
};

const deleteHashtag = async (hashtagId, userId, payload = {}) => {
  const user = await UserRepository.findByUserId(userId);
  if (user.role !== 'admin') throw new Error('Chỉ admin xóa hashtag');
  if (payload.__v === undefined || payload.__v === null) throw new MissingVersionError();

  const hashtag = await HashtagRepository.findById(hashtagId);
  if (!hashtag) throw new Error('Hashtag không tồn tại');

  const deleted = await HashtagRepository.softDeleteWithVersion(hashtagId, userId, payload.__v);
  if (!deleted) {
    const latest = await HashtagRepository.findById(hashtagId);
    if (!latest) throw new Error('Hashtag không tồn tại');
    throw new VersionConflictError();
  }

  return deleted;
};

const getAllHashtags = async () => {
  return await HashtagRepository.findAll();
};

module.exports = { createHashtag, updateHashtag, deleteHashtag, getAllHashtags };
