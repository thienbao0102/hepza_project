const Counter = require('../models/counterModel');

const updateOne = async (query, updateData, options = {}) => {
  return await Counter.updateOne(query, { $pull: updateData }, options);
};

const findOneAndUpdate = async (query, updateData, options = { session: null, upsert: true }) => {
    return await Counter.findOneAndUpdate(query, { $set: updateData }, options);
};

module.exports = {
  updateOne,
  findOneAndUpdate
};