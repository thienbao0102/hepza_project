const mongoose = require('mongoose');
const resoureceAndWasteService = require('../services/resoureceAndWasteService');
const SummaryRecord = require('../models/summaryRecordsModel');
require('dotenv').config();

const recalculateAll = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log('Connected to MongoDB');

        // Lấy tất cả unique (company_id, zone_id, periodKey) từ SummaryRecord
        const records = await SummaryRecord.find({ isDeleted: { $ne: true } })
            .select('company_id zone_id periodKey')
            .lean();

        console.log(`Found ${records.length} summary records to recalculate.\n`);

        let success = 0, failed = 0;

        for (const { company_id, zone_id, periodKey } of records) {
            try {
                await resoureceAndWasteService.recalculateSummaryRecord(company_id, zone_id, 'company', periodKey);
                success++;
                console.log(`✅ ${company_id} | ${periodKey}`);
            } catch (err) {
                failed++;
                console.error(`❌ ${company_id} | ${periodKey} — ${err.message}`);
            }
        }

        console.log(`\n=== Done ===`);
        console.log(`Success: ${success} | Failed: ${failed} | Total: ${records.length}`);
    } catch (error) {
        console.error('Error during recalculation:', error);
    } finally {
        await mongoose.connection.close();
    }
}

recalculateAll();

