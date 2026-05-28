const Hashtag = require('../models/hashtagModel');

const create = async (hashtagData) => {
  const hashtag = new Hashtag(hashtagData);
  return await hashtag.save();
};

const update = async (hashtagId, updateData) => {
  return await Hashtag.findOneAndUpdate({ hashtag_id: hashtagId }, updateData, { new: true });
};

const updateWithVersion = async (hashtagId, expectedVersion, updateData) => {
  return await Hashtag.findOneAndUpdate(
    { hashtag_id: hashtagId, __v: expectedVersion },
    { ...updateData, $inc: { __v: 1 } },
    { new: true }
  );
};

const softDelete = async (hashtagId, userId) => {
  return await Hashtag.findOneAndUpdate({ hashtag_id: hashtagId }, { deleted_at: new Date(), deleted_by: userId }, { new: true });
};

const softDeleteWithVersion = async (hashtagId, userId, expectedVersion) => {
  return await Hashtag.findOneAndUpdate(
    { hashtag_id: hashtagId, __v: expectedVersion },
    {
      deleted_at: new Date(),
      deleted_by: userId,
      $inc: { __v: 1 }
    },
    { new: true }
  );
};

const findById = async (hashtagId) => {
  return await Hashtag.findOne({ hashtag_id: hashtagId });
};

const findAll = async () => {
  return await Hashtag.find({ deleted_at: null });
};

const findByNames = async (names) => {
  return await Hashtag.find({ name: { $in: names }, deleted_at: null });
};

module.exports = {
  create,
  update,
  updateWithVersion,
  softDelete,
  softDeleteWithVersion,
  findById,
  findAll,
  findByNames,
};
