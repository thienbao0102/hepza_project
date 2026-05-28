/**
 * Seed 12 quy định pháp luật + hashtag liên quan
 * Chạy: node scripts/seed_regulations.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Regulation = require('../models/regulationModel');
const Hashtag = require('../models/hashtagModel');

const REGULATIONS_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'regulations_export.json'), 'utf8')
);

const seedRegulations = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected.\n');

    let created = 0, skipped = 0;

    for (const data of REGULATIONS_DATA) {
      // Check if exists
      const existing = await Regulation.findOne({ regulation_name: data.regulation_name });
      if (existing) {
        console.log(`   ⚠️ Exists: ${data.regulation_name}`);
        skipped++;
        continue;
      }

      // Process Tags
      const tagIds = [];
      for (const tagName of (data.tags || [])) {
        let hashtag = await Hashtag.findOne({ name: tagName });
        if (!hashtag) {
          hashtag = new Hashtag({ name: tagName });
          await hashtag.save();
          console.log(`   🏷️ Created tag: ${tagName}`);
        }
        tagIds.push(hashtag._id);
      }

      const newRegulation = new Regulation({
        regulation_name: data.regulation_name,
        des_short: data.des_short,
        link: data.link,
        effective_date: data.effective_date,
        group_regulation: data.group_regulation,
        tags: tagIds
      });

      await newRegulation.save();
      console.log(`   ✅ Created: ${data.regulation_name}`);
      created++;
    }

    console.log(`\n📊 Done: ${created} created, ${skipped} skipped (total: ${REGULATIONS_DATA.length})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedRegulations();
