/**
 * Seed 31 Khu công nghiệp / Khu chế xuất
 * Chạy: node scripts/seedZone.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const IndustrialZone = require('../models/industrialZoneModel');
require('dotenv').config();

const industrialZonesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'zones_export.json'), 'utf8')
);

const seedIndustrialZones = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    let created = 0, skipped = 0;

    for (const zone of industrialZonesData) {
      const existingZone = await IndustrialZone.findOne({ zone_name: zone.zone_name, deleted_at: null });
      if (!existingZone) {
        await IndustrialZone.create({
          zone_name: zone.zone_name,
          zone_type: zone.zone_type,
          location: zone.location,
          established_year: zone.established_year,
          status: zone.status,
          image_url: zone.image_url
        });
        console.log(`   ✅ Created: ${zone.zone_name}`);
        created++;
      } else {
        console.log(`   ⚠️ Exists: ${zone.zone_name}`);
        skipped++;
      }
    }

    console.log(`\n📊 Done: ${created} created, ${skipped} skipped (total: ${industrialZonesData.length})`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedIndustrialZones();