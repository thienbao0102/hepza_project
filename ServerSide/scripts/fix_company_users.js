const mongoose = require('mongoose');
const User = require('../models/userModel');
const Company = require('../models/companyModel');
require('dotenv').config();

const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI;

async function fixCompanyUsers() {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI or ATLAS_URI not found in .env');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Đã kết nối MongoDB thành công\n');

        // 1. Tìm các công ty chưa có người đại diện (user_id: null hoặc không tồn tại)
        const emptyCompanies = await Company.find({
            $or: [
                { user_id: { $exists: false } },
                { user_id: null },
                { user_id: '' }
            ],
            deleted_at: null
        }).sort({ created_at: 1 });

        console.log(`🔍 Tìm thấy ${emptyCompanies.length} công ty chưa có người đại diện.`);

        // 2. Tìm các nhóm user bị trùng company_id
        const duplicates = await User.aggregate([
            {
                $match: {
                    role: 'company',
                    company_id: { $ne: null, $exists: true },
                    deleted_at: null
                }
            },
            {
                $group: {
                    _id: '$company_id',
                    count: { $sum: 1 },
                    users: { $push: { _id: '$_id', user_id: '$user_id', full_name: '$full_name' } }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✅ Không tìm thấy trường hợp nào nhiều user chung 1 công ty.');
            return;
        }

        console.log(`⚠️ Tìm thấy ${duplicates.length} công ty bị trùng người đại diện.`);

        let reassignCount = 0;
        let emptyCompanyIndex = 0;

        for (const item of duplicates) {
            console.log(`\n🏢 Xử lý công ty: ${item._id} (Có ${item.count} đại diện)`);

            // Giữ lại user đầu tiên (index 0), tách các user từ index 1 trở đi
            const extraUsers = item.users.slice(1);

            for (const extraUser of extraUsers) {
                if (emptyCompanyIndex < emptyCompanies.length) {
                    const targetCompany = emptyCompanies[emptyCompanyIndex];
                    console.log(`   ➡️ Chuyển User ${extraUser.user_id} (${extraUser.full_name}) sang Công ty: ${targetCompany.company_name} (${targetCompany.company_id})`);

                    // Cập nhật User
                    await User.findByIdAndUpdate(extraUser._id, {
                        company_id: targetCompany.company_id,
                        zone_id: targetCompany.zone_id, // Cập nhật luôn zone_id cho đồng bộ
                        updated_at: new Date()
                    });

                    // Cập nhật Company
                    await Company.findOneAndUpdate(
                        { company_id: targetCompany.company_id },
                        { user_id: extraUser.user_id, updated_at: new Date() }
                    );

                    reassignCount++;
                    emptyCompanyIndex++;
                } else {
                    console.log(`   ⚠️ HẾT công ty trống để gán cho User ${extraUser.user_id}. Vui lòng kiểm tra lại.`);
                }
            }

            // Cập nhật user_id cho công ty gốc (nếu chưa có hoặc sai)
            const mainUser = item.users[0];
            await Company.findOneAndUpdate(
                { company_id: item._id },
                { user_id: mainUser.user_id, updated_at: new Date() }
            );
        }

        console.log(`\n✅ Hoàn tất! Đã điều chuyển ${reassignCount} người đại diện.`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Đã ngắt kết nối MongoDB');
    }
}

fixCompanyUsers();
