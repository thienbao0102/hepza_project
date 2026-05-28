const SummaryRecordService = require('../services/summaryRecordService');
const mongoose = require('mongoose');
require('dotenv').config();

// Handler to get summary record
const getSummaryRecord = async (req, res) => {
    const timerLabel = `getSummaryRecord` + Date.now();

    try {
        console.time(timerLabel);
        const user = req.userDetails;
        let { periodKeyStart, periodKeyEnd, include } = req.query; // Lấy periodKey từ query parameters năm + tháng: 2023 + 2 = 202302
        //kiểm tra quyền truy cập
        const { company_id, zone_id } = await SummaryRecordService.checkAccessPermission(user, req.query.company_id, req.query.zone_id, res);

        // lấy mảng include
        include = include || req.query["include[]"] || [1];
        // Ép kiểu mảng
        if (!Array.isArray(include)) include = [include];
        // Chuyển sang số
        include = include.map((v) => Number(v));

        //chuyển đổi qua số
        periodKeyStart = Number(periodKeyStart);
        periodKeyEnd = Number(periodKeyEnd);

        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
            return res.status(400).json({ error: 'periodKey query parameter is required', isSuccess: false });
        }
        
        const summaryRecord = await SummaryRecordService.getSummaryRecord(company_id, zone_id, periodKeyStart, periodKeyEnd, include);
        console.timeEnd(timerLabel);
        res.status(200).json({ message: 'Summary record retrieved successfully', isSuccess: true, summaryRecord });
    } catch (error) {
        console.timeEnd(timerLabel);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

// Handler to get summary record by periodKey
const getSummaryRecordByPeriodKey = async (req, res) => {
    const timerLabel = `getSummaryRecordByPeriodKey`+ Date.now();

    try {
        console.time(timerLabel);
        const user = req.userDetails;
        let { periodKeyStart, periodKeyEnd, include } = req.query; // Lấy periodKey từ query parameters năm + tháng: 2023 + 2 = 202302
        //kiểm tra quyền truy cập
        const { company_id, zone_id } = await SummaryRecordService.checkAccessPermission(user, req.query.company_id, req.query.zone_id, res);

        // lấy mảng include
        include = include || req.query["include[]"] || [1];
        // Ép kiểu mảng
        if (!Array.isArray(include)) include = [include];
        // Chuyển sang số
        include = include.map((v) => Number(v));

        //chuyển đổi qua số
        periodKeyStart = Number(periodKeyStart);
        periodKeyEnd = Number(periodKeyEnd);

        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
            return res.status(400).json({ error: 'periodKey query parameter is required', isSuccess: false });
        }

        const summaryRecord = await SummaryRecordService.getSummaryRecordByPeriodKey(company_id, zone_id, periodKeyStart, periodKeyEnd, include);

        console.timeEnd(timerLabel);
        res.status(200).json({ message: 'Summary record by periodKey retrieved successfully', isSuccess: true, summaryRecord });
    } catch (error) {
        console.timeEnd(timerLabel);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

module.exports = {
    getSummaryRecord,
    getSummaryRecordByPeriodKey
};
