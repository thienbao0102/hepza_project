const solutionModel = require('../models/solutionModel');

const getSolution = async (filter = {}, skip = 0, limit = 0) => {
    let query = solutionModel.find(filter).populate('tags', 'name -_id').sort({ createdAt: -1 }).lean();
    if (skip > 0) query = query.skip(skip);
    if (limit > 0) query = query.limit(limit);
    return await query;
};

const countSolutions = async (filter = {}) => {
    return await solutionModel.countDocuments(filter);
};

const createSolution = async (payload = {}) => {
    const solution = new solutionModel(payload);
    const created = await solution.save();
    return created.toObject();
};

const deleteSolution = async (solutionId, userId = '') => {
    if (!solutionId) return null;
    return await solutionModel.findOneAndDelete({ solution_id: solutionId }).lean();
};

const deleteSolutions = async (solutionIds = [], userId = '') => {
    if (!Array.isArray(solutionIds) || solutionIds.length === 0) return { deletedCount: 0 };
    const result = await solutionModel.deleteMany({ solution_id: { $in: solutionIds } });
    return result;
};

const findByIdWithTags = async (solutionId) => {
    if (!solutionId) return null;
    return await solutionModel
        .findOne({ solution_id: solutionId })
        .populate('tags', 'name -_id')
        .lean();
};

const findById = async (solutionId) => {
    if (!solutionId) return null;
    return await solutionModel.findOne({ solution_id: solutionId }).lean();
};

const updateSolution = async (solutionId, update) => {
    if (!solutionId) return null;

    const filter = { solution_id: solutionId };
    const dataToUpdate = { ...update };

    if (dataToUpdate.__v !== undefined) {
        filter.__v = dataToUpdate.__v;
        delete dataToUpdate.__v;
    }

    const updateQuery = { $set: dataToUpdate };
    if (update.__v !== undefined) {
        updateQuery.$inc = { __v: 1 };
    }

    return await solutionModel
        .findOneAndUpdate(filter, updateQuery, { new: true })
        .populate('tags', 'name -_id')
        .lean();
};

module.exports = {
    getSolution,
    countSolutions,
    createSolution,
    deleteSolution,
    deleteSolutions,
    findByIdWithTags,
    findById,
    updateSolution,
};
