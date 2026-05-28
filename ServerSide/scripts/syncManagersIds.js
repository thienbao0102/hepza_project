/**
 * Script đồng bộ managers_ids cho tất cả KCN.
 * 
 * Vấn đề: Khi gán zone_id cho user (manager), hệ thống chỉ update user 
 * nhưng không đồng bộ managers_ids vào industrial zone.
 * 
 * Script này sẽ:
 * 1. Tìm tất cả user có role = 'manager' và zone_id != null, deleted_at = null
 * 2. Gom danh sách user_id theo zone_id
 * 3. Cập nhật managers_ids cho từng KCN
 * 
 * Cách chạy: node scripts/syncManagersIds.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.ATLAS_URI;

async function syncManagersIds() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('../models/userModel');
        const IndustrialZone = require('../models/industrialZoneModel');

        // Tìm tất cả manager đang hoạt động có zone_id
        const managers = await User.find({
            role: 'manager',
            zone_id: { $ne: null, $exists: true },
            deleted_at: null
        }).lean();

        console.log(`📋 Tìm thấy ${managers.length} manager đang hoạt động có zone_id`);

        // Gom user_id theo zone_id
        const zoneManagersMap = {};
        for (const manager of managers) {
            if (!zoneManagersMap[manager.zone_id]) {
                zoneManagersMap[manager.zone_id] = [];
            }
            zoneManagersMap[manager.zone_id].push(manager.user_id);
        }

        console.log(`🏭 Cần cập nhật ${Object.keys(zoneManagersMap).length} KCN\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const [zoneId, managerIds] of Object.entries(zoneManagersMap)) {
            const zone = await IndustrialZone.findOne({ zone_id: zoneId, deleted_at: null });
            if (!zone) {
                console.log(`⚠️  KCN ${zoneId} không tồn tại hoặc đã bị xóa — bỏ qua`);
                skippedCount++;
                continue;
            }

            const currentManagerIds = zone.managers_ids || [];
            const isSynced = JSON.stringify([...currentManagerIds].sort()) === JSON.stringify([...managerIds].sort());

            if (isSynced) {
                console.log(`✓  KCN ${zoneId} (${zone.zone_name}) — đã đồng bộ [${managerIds.join(', ')}]`);
                skippedCount++;
                continue;
            }

            await IndustrialZone.findOneAndUpdate(
                { zone_id: zoneId, deleted_at: null },
                { $set: { managers_ids: managerIds } }
            );

            console.log(`✅ KCN ${zoneId} (${zone.zone_name}) — cập nhật managers_ids: [${currentManagerIds.join(', ')}] → [${managerIds.join(', ')}]`);
            updatedCount++;
        }

        // Xóa managers_ids cho các KCN không có manager nào
        const allZones = await IndustrialZone.find({ deleted_at: null }).lean();
        let clearedCount = 0;
        for (const zone of allZones) {
            if (!zoneManagersMap[zone.zone_id] && zone.managers_ids && zone.managers_ids.length > 0) {
                await IndustrialZone.findOneAndUpdate(
                    { zone_id: zone.zone_id },
                    { $set: { managers_ids: [] } }
                );
                console.log(`🧹 KCN ${zone.zone_id} (${zone.zone_name}) — xóa managers_ids cũ: [${zone.managers_ids.join(', ')}]`);
                clearedCount++;
            }
        }

        console.log(`\n📊 Kết quả:`);
        console.log(`   ✅ Cập nhật: ${updatedCount} KCN`);
        console.log(`   ✓  Đã đồng bộ: ${skippedCount} KCN`);
        console.log(`   🧹 Dọn dẹp: ${clearedCount} KCN`);
        console.log(`\n🎉 Đồng bộ hoàn tất!`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

syncManagersIds();
