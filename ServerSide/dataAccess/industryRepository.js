const Industry = require('../models/industryModel');
const IndustryGroup = require('../models/industryGrsModel');

const getAllIndustryGroups = async (page = 1, limit = 10, search = '') => {
    const skip = (page - 1) * limit;
    const query = {};
    if (search) {
        query.group_name = { $regex: search, $options: 'i' };
    }
    const [groups, total] = await Promise.all([
        IndustryGroup.find(query).skip(skip).limit(limit).lean(),
        IndustryGroup.countDocuments(query),
    ]);
    return { groups, total };
};

const getAllIndustries = async (page = 1, limit = 10, search = '', filters = {}) => {
    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
        query.$or = [
            { industry_name: { $regex: search, $options: 'i' } },
            { industry_code: { $regex: search, $options: 'i' } },
        ];
    }
    if (filters.group_id) {
        query.group_id = filters.group_id;
    }

    const [industries, total] = await Promise.all([
        Industry.find(query)
            .skip(skip)
            .limit(limit)
            .lean(),
        Industry.countDocuments(query),
    ]);

    return { industries, total };
};

const createIndustryGroup = async (groupData, session) => {
    return await IndustryGroup.create([groupData], { session });
};

const createIndustry = async (industryData, session) => {
    return await Industry.create([industryData], { session });
};

const updateIndustryGroup = async (groupId, groupData, session) => {
    return await IndustryGroup.findOneAndUpdate({ group_id: groupId }, groupData, { new: true, session });
};

const updateIndustry = async (industryId, industryData, session) => {
    return await Industry.findOneAndUpdate({ industry_id: industryId }, industryData, { new: true, session });
};

const deleteIndustryGroup = async (groupId, session) => {
    return await IndustryGroup.findOneAndDelete({ group_id: groupId }).session(session);
};

const deleteIndustry = async (industryId, session) => {
    return await Industry.findOneAndDelete({ industry_id: industryId }).session(session);
};

const getIndustryGroupById = async (groupId) => {
    return await IndustryGroup.findOne({ group_id: groupId }).lean();
};

const getIndustryById = async (industryId) => {
    return await Industry.findOne({ industry_id: industryId }).lean();
};

const getIndustryGroupsByIdsOrNames = async (values = []) => {
    const candidates = values.map((value) => String(value).trim()).filter(Boolean);
    if (candidates.length === 0) return [];

    return await IndustryGroup.find({
        $or: [
            { group_id: { $in: candidates } },
            { group_name: { $in: candidates } },
        ],
    }).lean();
};

const getIndustriesByIdsOrNames = async (values = []) => {
    const candidates = values.map((value) => String(value).trim()).filter(Boolean);
    if (candidates.length === 0) return [];

    return await Industry.find({
        $or: [
            { industry_id: { $in: candidates } },
            { industry_name: { $in: candidates } },
            { industry_code: { $in: candidates } },
        ],
    }).lean();
};

const countIndustriesByGroup = async (groupId) => {
    return await Industry.countDocuments({ group_id: groupId });
};

module.exports = {
    getAllIndustryGroups,
    getAllIndustries,
    createIndustryGroup,
    createIndustry,
    updateIndustryGroup,
    updateIndustry,
    deleteIndustryGroup,
    deleteIndustry,
    getIndustryGroupById,
    getIndustryById,
    getIndustryGroupsByIdsOrNames,
    getIndustriesByIdsOrNames,
    countIndustriesByGroup,
};
