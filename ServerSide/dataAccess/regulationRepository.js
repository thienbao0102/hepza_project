const RegulationModel = require('../models/regulationModel');

const getRegulations = async () => {
    const regulations = await RegulationModel.find().populate('tags', 'name -_id').lean();
    return regulations;
};

const createRegulation = async (payload = {}) => {
    const regulation = new RegulationModel(payload);
    const created = await regulation.save();
    return created.toObject();
};

const deleteRegulation = async (regulationId) => {
    if (!regulationId) return null;
    return await RegulationModel.findOneAndDelete({ regulation_id: regulationId }).lean();
};

const deleteRegulations = async (regulationIds = []) => {
    if (!Array.isArray(regulationIds) || regulationIds.length === 0) return { deletedCount: 0 };
    const result = await RegulationModel.deleteMany({ regulation_id: { $in: regulationIds } });
    return result;
};

const findByIdWithTags = async (regulationId) => {
    if (!regulationId) return null;
    return await RegulationModel
        .findOne({ regulation_id: regulationId })
        .populate('tags', 'name -_id')
        .lean();
};

const findById = async (regulationId) => {
    if (!regulationId) return null;
    return await RegulationModel.findOne({ regulation_id: regulationId }).lean();
};

const updateRegulation = async (regulationId, update) => {
    if (!regulationId) return null;
    return await RegulationModel
        .findOneAndUpdate({ regulation_id: regulationId }, update, { new: true })
        .populate('tags', 'name -_id')
        .lean();
};

const updateRegulationWithVersion = async (regulationId, expectedVersion, update) => {
    if (!regulationId || expectedVersion === undefined || expectedVersion === null) return null;
    return await RegulationModel
        .findOneAndUpdate(
            { regulation_id: regulationId, __v: expectedVersion },
            {
                ...update,
                $inc: { __v: 1 },
            },
            { new: true }
        )
        .populate('tags', 'name -_id')
        .lean();
};

module.exports = {
    getRegulations,
    createRegulation,
    deleteRegulation,
    deleteRegulations,
    findByIdWithTags,
    findById,
    updateRegulation,
    updateRegulationWithVersion,
};
