const emissionService = require('../services/emissionService');
const mongoose = require('mongoose');
require('dotenv').config();

const getDataEmission = async (req, res) => {
    const timerLabel = `getDataEmission`;
    try {
        console.time(timerLabel);
        let { periodKeyStart, periodKeyEnd, zone_id, company_id } = req.query; // Lấy periodKey từ query parameters năm + tháng: 2023 + 2 = 202302
        let emissionData = []

        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
            return res.status(400).json({ error: 'periodKey query parameter is required' });
        }

        emissionData = await emissionService.getEmissionByPeriod(company_id, zone_id, periodKeyStart, periodKeyEnd);
        console.log("emissionData: ", emissionData.length);
        console.timeEnd(timerLabel);
        res.status(200).json({ message: 'Emission data retrieved successfully', emissionData });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


module.exports = {
    getDataEmission
};