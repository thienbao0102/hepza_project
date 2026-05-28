/**
 * Migration: Gán lại industry và industry_group cho tất cả Company
 * 
 * Chạy: node scripts/migrateCompanyIndustries.js
 * 
 * Logic:
 *   1. Lấy tất cả Industry và IndustryGroup từ DB mới
 *   2. Với mỗi Company: gán random 1–3 ngành + lấy group_id tương ứng
 * 
 * LƯU Ý: Chạy SAU khi đã chạy seedIndustry.js
 */
const mongoose = require('mongoose');
const Company = require('../models/companyModel');
const Industry = require('../models/industryModel');
require('dotenv').config();

async function migrate() {
    try {
        console.log('🔄 Đang kết nối MongoDB...');
        await mongoose.connect(process.env.ATLAS_URI);
        console.log('✅ Đã kết nối!');

        // Lấy tất cả ngành mới
        const industries = await Industry.find({}).lean();
        if (industries.length === 0) {
            console.log('❌ Chưa có ngành nào trong DB! Hãy chạy seedIndustry.js trước.');
            return;
        }
        console.log(`📋 Tổng ngành trong DB: ${industries.length}`);

        // Lấy tất cả Company (bao gồm cả những dòng bị soft-delete)
        const companies = await Company.find({});
        console.log(`🏢 Tổng công ty cần migrate: ${companies.length}`);

        if (companies.length === 0) {
            console.log('⚠️  Không có công ty nào cần migrate.');
            return;
        }

        let updated = 0;
        for (const company of companies) {
            // Random 1–3 ngành
            const numIndustries = Math.floor(Math.random() * 3) + 1;
            const shuffled = [...industries].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, numIndustries);

            // Lấy industry_id và group_id (unique)
            const industryIds = selected.map(i => i.industry_id);
            const groupIds = [...new Set(selected.map(i => i.group_id))];

            await Company.updateOne(
                { _id: company._id },
                {
                    $set: {
                        industry: industryIds,
                        industry_group: groupIds,
                    }
                }
            );
            updated++;
            if (updated % 10 === 0) {
                console.log(`   ✅ Đã migrate ${updated}/${companies.length} công ty...`);
            }
        }

        console.log(`\n🎉 Migration hoàn tất! Đã cập nhật ${updated} công ty.`);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
