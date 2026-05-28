const mongoose = require('mongoose');
const industryService = require('../services/industryService');
const Company = require('../models/companyModel');
const Industry = require('../models/industryModel');

const getAllIndustryGroups = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const { groups, total } = await industryService.getAllIndustryGroups(page, limit, search);

        // Đếm số ngành trong mỗi nhóm
        const groupsWithCount = await Promise.all(
            groups.map(async (group) => {
                const industryCount = await industryService.countIndustriesByGroup(group.group_id);
                return { ...group, industry_count: industryCount };
            })
        );

        res.status(200).json({ message: 'Lấy danh sách nhóm ngành thành công', groups: groupsWithCount, total });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllIndustries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
        const { industries, total } = await industryService.getAllIndustries(page, limit, search, filters);
        res.status(200).json({ message: 'Lấy danh sách ngành thành công', industries, total });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getIndustryGroupById = async (req, res) => {
    try {
        const groupId = req.params.group_id;
        const group = await industryService.getIndustryGroupById(groupId);
        if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm ngành' });
        res.status(200).json({ message: 'Lấy nhóm ngành thành công', group });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getIndustryById = async (req, res) => {
    try {
        const industryId = req.params.industry_id;
        const industry = await industryService.getIndustryById(industryId);
        if (!industry) return res.status(404).json({ error: 'Không tìm thấy ngành' });
        res.status(200).json({ message: 'Lấy ngành thành công', industry });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createIndustryGroup = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const groupData = req.body;
        if (!groupData.group_name) return res.status(400).json({ error: 'Tên nhóm ngành là bắt buộc' });
        const userId = req.user.user_id;
        const group = await industryService.createIndustryGroup({ ...groupData, created_by: userId, updated_by: userId }, session);
        await session.commitTransaction();
        res.status(201).json({ message: 'Thêm nhóm ngành thành công', group });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const createIndustry = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const industryData = req.body;
        if (!industryData.industry_name || !industryData.group_id) {
            return res.status(400).json({ error: 'Tên ngành và nhóm ngành là bắt buộc' });
        }
        if (!industryData.industry_code) {
            return res.status(400).json({ error: 'Mã ngành (VSIC) là bắt buộc' });
        }
        const userId = req.user.user_id;
        const industry = await industryService.createIndustry({ ...industryData, created_by: userId, updated_by: userId }, session);
        await session.commitTransaction();
        res.status(201).json({ message: 'Thêm ngành thành công', industry });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const updateIndustryGroup = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const groupId = req.params.group_id;
        const groupData = req.body;
        const userId = req.user.user_id;
        const group = await industryService.updateIndustryGroup(groupId, { ...groupData, updated_by: userId, updated_at: new Date() }, session);
        if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm ngành' });
        await session.commitTransaction();
        res.status(200).json({ message: 'Cập nhật nhóm ngành thành công', group });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const updateIndustry = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const industryId = req.params.industry_id;
        const industryData = req.body;
        const userId = req.user.user_id;
        const industry = await industryService.updateIndustry(industryId, { ...industryData, updated_by: userId, updated_at: new Date() }, session);
        if (!industry) return res.status(404).json({ error: 'Không tìm thấy ngành' });
        await session.commitTransaction();
        res.status(200).json({ message: 'Cập nhật ngành thành công', industry });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const deleteIndustryGroup = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const groupId = req.params.group_id;
        // Kiểm tra có ngành nào thuộc nhóm này không
        const count = await industryService.countIndustriesByGroup(groupId);
        if (count > 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: `Không thể xoá nhóm ngành vì đang có ${count} ngành thuộc nhóm này. Vui lòng chuyển hoặc xoá các ngành trước.` });
        }

        // Xóa tham chiếu nhóm trong mảng industry_group của Company
        await Company.updateMany(
            { industry_group: groupId },
            { $pull: { industry_group: groupId } }
        ).session(session);

        const group = await industryService.deleteIndustryGroup(groupId, session);
        if (!group) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Không tìm thấy nhóm ngành' });
        }
        await session.commitTransaction();
        res.status(200).json({ message: 'Xoá nhóm ngành thành công' });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const deleteIndustry = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const industryId = req.params.industry_id;

        // Tìm ngành cần xoá
        const targetIndustry = await Industry.findOne({ industry_id: industryId }).lean();
        if (!targetIndustry) return res.status(404).json({ error: 'Không tìm thấy ngành' });

        // Tìm các DN đang dùng ngành này
        const affectedCompanies = await Company.find({ industry: industryId }).session(session);

        if (affectedCompanies.length > 0) {
            // Lấy ngành khác cùng nhóm (trừ ngành đang xoá)
            const alternatives = await Industry.find({
                group_id: targetIndustry.group_id,
                industry_id: { $ne: industryId }
            }).lean();

            if (alternatives.length === 0) {
                await session.abortTransaction();
                return res.status(400).json({
                    error: `Không thể xoá ngành "${targetIndustry.industry_code} - ${targetIndustry.industry_name}" vì có ${affectedCompanies.length} DN đang sử dụng và không còn ngành thay thế nào trong nhóm. Vui lòng thêm ngành mới vào nhóm trước.`
                });
            }

            // Gán random ngành thay thế cho các DN
            for (const company of affectedCompanies) {
                const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
                const newIndustries = company.industry.map(id => id === industryId ? replacement.industry_id : id);
                await Company.updateOne(
                    { _id: company._id },
                    { $set: { industry: newIndustries } }
                ).session(session);
            }
        }

        // Xoá ngành
        await industryService.deleteIndustry(industryId, session);
        await session.commitTransaction();
        res.status(200).json({
            message: `Xoá ngành thành công${affectedCompanies.length > 0 ? `. Đã chuyển ${affectedCompanies.length} DN sang ngành khác trong cùng nhóm.` : '.'}`,
            reassigned: affectedCompanies.length,
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

module.exports = {
    getAllIndustryGroups,
    getAllIndustries,
    getIndustryGroupById,
    getIndustryById,
    createIndustryGroup,
    createIndustry,
    updateIndustryGroup,
    updateIndustry,
    deleteIndustryGroup,
    deleteIndustry,
};