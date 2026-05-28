const solutionService = require('../services/solutionService')
const mongoose = require('mongoose');
require('dotenv').config();

const getSolutionData = async (req, res) => {
    const timerLabel = `getDataEmission`;
    try {
        console.time(timerLabel);
        const { group_solution, search, tags, page = 1, limit = 0, date_from, date_to } = req.query;

        const filters = {};
        if (group_solution) filters.group_solution = group_solution;

        // Date range filter on createdAt
        if (date_from || date_to) {
            filters.createdAt = {};
            if (date_from) filters.createdAt.$gte = new Date(date_from);
            if (date_to) filters.createdAt.$lte = new Date(date_to);
        }

        // Search filter (regex)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filters.$or = [
                { solution_name: searchRegex },
                { des_short: searchRegex }
            ];
        }

        // Tags filter
        if (tags && (!Array.isArray(tags) || tags.length > 0)) {
            const tagList = Array.isArray(tags) ? tags : [tags];
            const hashtagRepository = require('../dataAccess/hashtagRepository');
            const hashtags = await hashtagRepository.findByNames(tagList);
            if (hashtags.length > 0) {
                filters.tags = { $in: hashtags.map(h => h._id) };
            } else if (tagList.length > 0) {
                // If tags provided but none found, return empty result
                filters.tags = { $in: [new mongoose.Types.ObjectId()] };
            }
        }

        const result = await solutionService.getSolution(filters, page, limit);

        console.timeEnd(timerLabel);
        res.status(200).json({
            message: "Solution data retrieved successfully",
            solutionData: result.solutions,
            pagination: result.pagination
        })
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

const createSolution = async (req, res) => {
    try {
        const payload = req.body || {};
        const result = await solutionService.createSolution(payload, req.user?.user_id);
        res.status(201).json({
            message: 'Tạo giải pháp thành công',
            solution: result,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getSolutionDetail = async (req, res) => {
    try {
        const { solutionId } = req.params;
        const solution = await solutionService.getSolutionDetail(solutionId);
        res.status(200).json({ solution });
    } catch (error) {
        res.status(error.status || 400).json({ error: error.message });
    }
};

const updateSolution = async (req, res) => {
    try {
        const { solutionId } = req.params;
        const payload = req.body || {};
        const solution = await solutionService.updateSolution(solutionId, payload, req.user?.user_id);
        res.status(200).json({
            message: 'Cập nhật giải pháp thành công',
            solution,
        });
    } catch (error) {
        res.status(error.status || error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteSolution = async (req, res) => {
    try {
        const { solutionId } = req.params;
        await solutionService.deleteSolution(solutionId, req.user?.user_id);
        res.status(200).json({
            message: 'Xóa giải pháp thành công',
        });
    } catch (error) {
        res.status(error.status || 400).json({ error: error.message });
    }
};

const deleteMultipleSolutions = async (req, res) => {
    try {
        const { solutionIds } = req.body || {};
        await solutionService.deleteMultipleSolutions(solutionIds, req.user?.user_id);
        res.status(200).json({
            message: 'Đã xóa các giải pháp được chọn',
        });
    } catch (error) {
        res.status(error.status || 400).json({ error: error.message });
    }
};

module.exports = {
    getSolutionData,
    createSolution,
    getSolutionDetail,
    updateSolution,
    deleteSolution,
    deleteMultipleSolutions
};
