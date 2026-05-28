const mongoose = require('mongoose');
const Company = require('../models/companyModel');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.ATLAS_URI);

    const indexes = await Company.collection.indexes();
    const addressIndex = indexes.find((index) => index.name === 'address_1');

    if (!addressIndex) {
      console.log('Không tìm thấy index address_1. Không cần xử lý thêm.');
      return;
    }

    await Company.collection.dropIndex('address_1');
    console.log('Đã xóa index unique address_1 trên companies.');
  } catch (error) {
    console.error('Không thể xóa index address_1:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
