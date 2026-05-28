const mongoose = require('mongoose');
const User = require('../models/userModel');
const Company = require('../models/companyModel');
require('dotenv').config();

const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI;

async function checkDuplicateUsers() {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI or ATLAS_URI not found in .env');
        }

        await mongoose.connect(MONGO_URI);
        console.log('✅ Đã kết nối MongoDB thành công\n');

        // Aggregation to find users with same company_id
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
                    users: {
                        $push: {
                            user_id: '$user_id',
                            full_name: '$full_name',
                            email: '$email',
                            phone_number: '$phone_number'
                        }
                    }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✅ Không tìm thấy trường hợp nào nhiều user chung 1 company_id.');
        } else {
            console.log(`⚠️ Tìm thấy ${duplicates.length} công ty có nhiều hơn 1 người đại diện:\n`);

            for (const item of duplicates) {
                const company = await Company.findOne({ company_id: item._id }).lean();
                const companyName = company ? company.company_name : 'Không rõ tên công ty';

                console.log(`🏢 Công ty: ${companyName} (${item._id})`);
                console.log(`   Số người đại diện: ${item.count}`);
                item.users.forEach((u, index) => {
                    console.log(`   ${index + 1}. [${u.user_id}] ${u.full_name} - ${u.email} (${u.phone_number})`);
                });
                console.log('--------------------------------------------------');
            }
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Đã ngắt kết nối MongoDB');
    }
}

checkDuplicateUsers();
