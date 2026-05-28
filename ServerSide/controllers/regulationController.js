const regulationService = require('../services/regulationService');
require('dotenv').config();

const getRegulationData = async (req, res) => {
    try {
        const regulationData = await regulationService.getRegulations();
        res.status(200).json({ message: 'Regulation data retrieved successfully', regulationData });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createRegulation = async (req, res) => {
    try {
        const payload = req.body || {};
        const result = await regulationService.createRegulation(payload);
        res.status(201).json({
            message: 'Tạo quy định thành công',
            regulation: result,
        });
    } catch (error) {
        res.status(error.statusCode || error.status || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const getRegulationDetail = async (req, res) => {
    try {
        const { regulationId } = req.params;
        const regulation = await regulationService.getRegulationDetail(regulationId);
        res.status(200).json({ regulation });
    } catch (error) {
        res.status(error.statusCode || error.status || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const updateRegulation = async (req, res) => {
    try {
        const { regulationId } = req.params;
        const payload = req.body || {};
        const regulation = await regulationService.updateRegulation(regulationId, payload);
        res.status(200).json({
            message: 'Cập nhật quy định thành công',
            regulation,
        });
    } catch (error) {
        res.status(error.statusCode || error.status || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteRegulation = async (req, res) => {
    try {
        const { regulationId } = req.params;
        await regulationService.deleteRegulation(regulationId);
        res.status(200).json({
            message: 'Xóa quy định thành công',
        });
    } catch (error) {
        res.status(error.statusCode || error.status || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteMultipleRegulations = async (req, res) => {
    try {
        const { regulationIds } = req.body || {};
        await regulationService.deleteMultipleRegulations(regulationIds);
        res.status(200).json({
            message: 'Đã xóa các quy định được chọn',
        });
    } catch (error) {
        res.status(error.statusCode || error.status || 400).json({ error: error.message, code: error.code || undefined });
    }
};

module.exports = {
    getRegulationData,
    createRegulation,
    getRegulationDetail,
    updateRegulation,
    deleteRegulation,
    deleteMultipleRegulations,
};
