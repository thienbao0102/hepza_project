/**
 * Seed 495 ngành cấp 4 VSIC (QĐ 36/2025) vào database
 * Chạy: node scripts/seedIndustry.js
 * 
 * LƯU Ý: Script này XOÁ TOÀN BỘ dữ liệu ngành cũ trước khi seed lại!
 */
const mongoose = require('mongoose');
const IndustryGroup = require('../models/industryGrsModel');
const Industry = require('../models/industryModel');
const Counter = require('../models/counterModel');
require('dotenv').config();

// ── 6 NHÓM NGÀNH HEPZA ──
const HEPZA_GROUPS = [
  { group_name: 'Cơ khí, điện, điện tử' },
  { group_name: 'Hoá dược, cao su, nhựa' },
  { group_name: 'Chế biến lương thực, thực phẩm' },
  { group_name: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất' },
  { group_name: 'May mặc, thuộc da, dệt nhuộm' },
  { group_name: 'Khác' },
];

// ── MAPPING: 2 chữ số đầu mã VSIC → tên nhóm HEPZA ──
// Dựa trên ngành cấp 2 của VSIC
const GROUP_MAPPING = {
  // Chế biến lương thực, thực phẩm (C:10-12)
  '10': 'Chế biến lương thực, thực phẩm',
  '11': 'Chế biến lương thực, thực phẩm',
  '12': 'Chế biến lương thực, thực phẩm',
  // May mặc, thuộc da, dệt nhuộm (C:13-15)
  '13': 'May mặc, thuộc da, dệt nhuộm',
  '14': 'May mặc, thuộc da, dệt nhuộm',
  '15': 'May mặc, thuộc da, dệt nhuộm',
  // Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất (C:16,17,23,31)
  '16': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '17': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '23': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '31': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  // Hoá dược, cao su, nhựa (C:20-22)
  '20': 'Hoá dược, cao su, nhựa',
  '21': 'Hoá dược, cao su, nhựa',
  '22': 'Hoá dược, cao su, nhựa',
  // Cơ khí, điện, điện tử (C:24-30, 33)
  '24': 'Cơ khí, điện, điện tử',
  '25': 'Cơ khí, điện, điện tử',
  '26': 'Cơ khí, điện, điện tử',
  '27': 'Cơ khí, điện, điện tử',
  '28': 'Cơ khí, điện, điện tử',
  '29': 'Cơ khí, điện, điện tử',
  '30': 'Cơ khí, điện, điện tử',
  '33': 'Cơ khí, điện, điện tử',
  // Tất cả còn lại → Khác
};

function getGroupName(industryCode) {
  const prefix = industryCode.substring(0, 2);
  return GROUP_MAPPING[prefix] || 'Khác';
}

async function seed() {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Đã kết nối!');

    // ── Bước 1: Kiểm tra dữ liệu đã tồn tại ──
    const existingCount = await Industry.countDocuments({});
    if (existingCount > 0) {
      console.log(`⚠️ Đã có ${existingCount} ngành trong database → SKIP (không tạo lại)`);
      console.log('   Nếu muốn tạo lại, hãy xóa thủ công collections: industries, industrygroups');
      return;
    }
    console.log('📋 Database chưa có ngành nghề → Bắt đầu seed...');

    // ── Bước 2: Tạo 6 nhóm ngành HEPZA ──
    console.log('📁 Tạo 6 nhóm ngành HEPZA...');
    const groupMap = {}; // group_name → group_id
    for (const groupData of HEPZA_GROUPS) {
      const group = new IndustryGroup({
        group_name: groupData.group_name,
        created_by: 'system',
        updated_by: 'system',
      });
      await group.save();
      groupMap[groupData.group_name] = group.group_id;
      console.log(`   ✅ ${group.group_id}: ${group.group_name}`);
    }

    // ── Bước 3: Đọc file JSON và tạo ngành ──
    console.log('📋 Đang đọc dữ liệu VSIC cấp 4...');
    const vsicData = require('./data/vsic_level4.json');
    console.log(`   Tổng số ngành từ file: ${vsicData.length}`);

    let created = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < vsicData.length; i += BATCH_SIZE) {
      const batch = vsicData.slice(i, i + BATCH_SIZE);
      for (const item of batch) {
        const groupName = getGroupName(item.code);
        const groupId = groupMap[groupName];

        const industry = new Industry({
          industry_code: item.code,
          industry_name: item.name,
          group_id: groupId,
          created_by: 'system',
          updated_by: 'system',
        });
        await industry.save();
        created++;
      }
      console.log(`   ✅ Đã tạo ${Math.min(i + BATCH_SIZE, vsicData.length)}/${vsicData.length} ngành...`);
    }

    // ── Bước 4: Thống kê ──
    console.log('\n📊 THỐNG KÊ:');
    console.log(`   Tổng nhóm ngành: ${Object.keys(groupMap).length}`);
    console.log(`   Tổng ngành: ${created}`);
    for (const [name, id] of Object.entries(groupMap)) {
      const count = await Industry.countDocuments({ group_id: id });
      console.log(`   ${id} - ${name}: ${count} ngành`);
    }

    console.log('\n🎉 Seed hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();