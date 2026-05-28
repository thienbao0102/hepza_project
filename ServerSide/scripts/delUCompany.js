const mongoose = require('mongoose');
const User = require('./models/userModel'); 
require('dotenv').config();

const deleteCompanyUsers = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB');

    const result = await User.deleteMany({ role: 'company' });

    console.log(`🗑️ Đã xóa ${result.deletedCount} user có role "company".`);
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi khi xóa user:', error);
    process.exit(1);
  }
};
deleteCompanyUsers();
