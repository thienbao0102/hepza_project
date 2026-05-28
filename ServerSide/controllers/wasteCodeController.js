const HazardousWasteCode = require('../models/hazardousWasteCodeModel');

const lookupWasteCode = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({ message: 'Mã CTNH (code) là bắt buộc', isSuccess: false });
        }

        const codeSearchStr = code.trim().replace(/\s+/g, '').split('').join('\\s*');
        const wasteCode = await HazardousWasteCode.findOne({
            code: new RegExp(`^${codeSearchStr}$`, 'i'),
            isActive: true,
        }).lean();

        if (!wasteCode) {
            return res.status(404).json({ message: 'Không tìm thấy mã CTNH', isSuccess: false });
        }

        res.status(200).json({
            message: 'Tra cứu thành công',
            isSuccess: true,
            data: wasteCode,
        });
    } catch (error) {
        console.error('lookupWasteCode error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

const searchWasteCodes = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

        if (!q || typeof q !== 'string' || !q.trim()) {
            const results = await HazardousWasteCode.find({
                isActive: true,
            })
                .limit(safeLimit)
                .lean();

            return res.status(200).json({
                message: 'Tìm kiếm mã CTNH thành công',
                isSuccess: true,
                data: results,
            });
        }

        const qTrim = q.trim();
        const codeSearchStr = qTrim.replace(/\s+/g, '').split('').join('\\s*');
        const nameSearchStr = qTrim;

        const results = await HazardousWasteCode.find({
            isActive: true,
            $or: [
                { code: new RegExp(codeSearchStr, 'i') },
                { name: new RegExp(nameSearchStr, 'i') },
            ],
        })
            .limit(safeLimit)
            .lean();

        res.status(200).json({
            message: 'Tìm kiếm mã CTNH thành công',
            isSuccess: true,
            data: results,
        });
    } catch (error) {
        console.error('searchWasteCodes error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

module.exports = { lookupWasteCode, searchWasteCodes };
