/**
 * Seed hazardous waste codes from the PDF-derived JSON export.
 * Run: node scripts/seedHazardousWasteCodes.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const HazardousWasteCode = require('../models/hazardousWasteCodeModel');

const WASTE_CODES = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'hazardousWasteCodes.json'), 'utf8')
);

const seedHazardousWasteCodes = async () => {
    let exitCode = 0;

    try {
        if (!process.env.ATLAS_URI) {
            throw new Error('ATLAS_URI is not defined in .env');
        }

        await mongoose.connect(process.env.ATLAS_URI);
        console.log('Connected to MongoDB');

        const existingCount = await HazardousWasteCode.countDocuments({});
        if (existingCount > 0) {
            console.log(`⚠️ Đã có ${existingCount} hazardous waste codes → SKIP (không tạo lại)`);
            console.log('   Nếu muốn tạo lại, hãy xóa thủ công collection: hazardouswastecodes');
            return;
        }

        const result = await HazardousWasteCode.insertMany(WASTE_CODES);
        console.log(`✅ Seeded ${result.length} hazardous waste codes successfully.`);
    } catch (error) {
        exitCode = 1;
        console.error('Seed error:', error);
    } finally {
        await mongoose.disconnect().catch(() => {});
        process.exit(exitCode);
    }
};

seedHazardousWasteCodes();