const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);

    const admins = [
      {
        full_name: 'Hào',
        phone_number: '0901234561',
        email: 'hao.2274801030043@vanlanguni.vn',
      },
      {
        full_name: 'Linh',
        phone_number: '0901234562',
        email: 'linh.2274801030082@vanlanguni.vn',
      },
      {
        full_name: 'Bảo',
        phone_number: '0901234563',
        email: 'bao.2274801030274@vanlanguni.vn',
      },
      {
        full_name: 'Hoài',
        phone_number: '0901234564',
        email: 'hoai.2274801030190@vanlanguni.vn',
      },
      {
        full_name: 'Tươi',
        phone_number: '0901234565',
        email: 'tuoi.2274801030222@vanlanguni.vn',
      },
      {
        full_name: 'Chi Nhân',
        phone_number: '0901234566',
        email: 'chinhan.vlu@gmail.com',
      },
      {
        full_name: 'Quyên',
        phone_number: '0901234567',
        email: 'quyen.248520320003@vanlanguni.vn',
      },
      {
        full_name: 'Mưa',
        phone_number: '0901234568',
        email: 'muamuaa.official@gmail.com',
      },
      {
        full_name: 'Thỏ',
        phone_number: '0901234569',
        email: 'iamherefort1@gmail.com',
      },
    ];

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email, deleted_at: null });
      if (!existing) {
        const hashedPassword = await bcrypt.hash('Admin1234@', 12);
        const newAdmin = new User({
          ...admin,
          role: 'admin',
          password: hashedPassword,
          firstLogin: true,
          created_at: new Date(),
          updated_at: new Date()
        });

        await newAdmin.save();
        console.log(`✅ Created admin: ${admin.email}`);
      } else {
        console.log(`⚠️ Admin already exists: ${admin.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin();
