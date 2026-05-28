const mongoose = require('mongoose');
const path = require('path');
const Company = require('../models/companyModel');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    await mongoose.connect(process.env.ATLAS_URI);

    const indexes = await Company.collection.indexes();
    const companyPhoneIndex = indexes.find((index) => index.name === 'company_phone_1');

    if (companyPhoneIndex) {
      await Company.collection.dropIndex('company_phone_1');
      console.log('Đã xóa index company_phone_1 trên companies.');
    } else {
      console.log('Không tìm thấy index company_phone_1. Bỏ qua bước xóa index.');
    }

    const result = await Company.updateMany(
      { company_phone: { $exists: true } },
      { $unset: { company_phone: 1 } }
    );

    const modifiedCount = result.modifiedCount ?? result.nModified ?? result.matchedCount ?? 0;
    console.log(`Đã xóa field company_phone khỏi ${modifiedCount} doanh nghiệp.`);
  } catch (error) {
    console.error('Không thể xóa field company_phone:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
