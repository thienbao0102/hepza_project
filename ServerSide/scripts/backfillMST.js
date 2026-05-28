/**
 * Script backfill MST (Mã Số Thuế) cho các doanh nghiệp hiện có
 * 
 * Tìm tất cả company có company_registration_number bị:
 * - null / undefined / rỗng
 * - Bắt đầu bằng "REG-" (dữ liệu rác cũ)
 * - Không đúng format 10 hoặc 13 chữ số
 * 
 * Sau đó tạo MST 10 chữ số ngẫu nhiên (unique) cho từng company.
 * 
 * Cách chạy:
 *   node scripts/backfillMST.js
 * 
 * Thêm flag --dry-run để xem trước mà không ghi vào DB:
 *   node scripts/backfillMST.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/companyModel');

const MST_REGEX = /^\d{10}(-\d{3})?$/;
const isDryRun = process.argv.includes('--dry-run');

// Tạo MST 10 chữ số ngẫu nhiên (đảm bảo không bắt đầu bằng 0 ở vị trí đầu - tuỳ chọn)
function generateRandomMST() {
    // Số đầu tiên từ 0-9 (MST VN có thể bắt đầu bằng 0)
    let mst = '';
    for (let i = 0; i < 10; i++) {
        mst += Math.floor(Math.random() * 10).toString();
    }
    return mst;
}

async function main() {
    console.log('🔗 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Đã kết nối MongoDB');

    if (isDryRun) {
        console.log('⚠️  CHẾ ĐỘ DRY-RUN: Chỉ xem trước, KHÔNG ghi vào DB\n');
    }

    // Tìm tất cả company cần backfill
    const allCompanies = await Company.find({}).lean();

    const needsBackfill = allCompanies.filter(c => {
        const mst = c.company_registration_number;
        if (!mst || mst.trim() === '') return true;
        if (mst.startsWith('REG-')) return true;
        if (!MST_REGEX.test(mst)) return true;
        return false;
    });

    console.log(`📊 Tổng số doanh nghiệp: ${allCompanies.length}`);
    console.log(`🔧 Cần backfill MST: ${needsBackfill.length}`);
    console.log(`✅ Đã có MST hợp lệ: ${allCompanies.length - needsBackfill.length}\n`);

    if (needsBackfill.length === 0) {
        console.log('🎉 Không có doanh nghiệp nào cần backfill. Hoàn tất!');
        await mongoose.disconnect();
        return;
    }

    // Thu thập tất cả MST hiện có (để tránh trùng)
    const existingMSTs = new Set(
        allCompanies
            .map(c => c.company_registration_number)
            .filter(mst => mst && MST_REGEX.test(mst))
    );

    let updated = 0;
    let failed = 0;

    for (const company of needsBackfill) {
        // Tạo MST unique
        let newMST;
        let attempts = 0;
        do {
            newMST = generateRandomMST();
            attempts++;
            if (attempts > 1000) {
                console.error(`❌ Không thể tạo MST unique cho ${company.company_name} sau 1000 lần thử`);
                failed++;
                newMST = null;
                break;
            }
        } while (existingMSTs.has(newMST));

        if (!newMST) continue;

        const oldMST = company.company_registration_number || '(trống)';

        if (isDryRun) {
            console.log(`  📝 ${company.company_name} (${company.company_id})`);
            console.log(`     MST cũ: ${oldMST} → MST mới: ${newMST}`);
        } else {
            try {
                await Company.updateOne(
                    { _id: company._id },
                    { $set: { company_registration_number: newMST } }
                );
                console.log(`  ✅ ${company.company_name}: ${oldMST} → ${newMST}`);
                updated++;
            } catch (err) {
                console.error(`  ❌ ${company.company_name}: ${err.message}`);
                failed++;
            }
        }

        existingMSTs.add(newMST);
    }

    console.log(`\n${'─'.repeat(50)}`);
    if (isDryRun) {
        console.log(`📋 Kết quả DRY-RUN: ${needsBackfill.length} doanh nghiệp sẽ được cập nhật`);
        console.log(`💡 Bỏ flag --dry-run để thực hiện ghi vào DB`);
    } else {
        console.log(`📋 Kết quả: ${updated} thành công, ${failed} thất bại`);
    }

    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
}

main().catch(err => {
    console.error('💥 Lỗi nghiêm trọng:', err);
    mongoose.disconnect();
    process.exit(1);
});
