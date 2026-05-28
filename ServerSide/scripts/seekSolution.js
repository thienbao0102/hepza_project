/**
 * Seed 35 giải pháp xanh + hashtag liên quan
 * Chạy: node scripts/seekSolution.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Solution = require('../models/solutionModel');
const Hashtag = require('../models/hashtagModel');

const SOLUTIONS_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'solutions_export.json'), 'utf8')
);

const seedSolutions = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected.\n');

    let created = 0, skipped = 0;

    for (const data of SOLUTIONS_DATA) {
      // Check if exists
      const existing = await Solution.findOne({ solution_name: data.solution_name });
      if (existing) {
        console.log(`   ⚠️ Exists: ${data.solution_name}`);
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

      const newSolution = new Solution({
        solution_name: data.solution_name,
        des_short: data.des_short,
        des_long: data.des_long,
        link: data.link,
        group_solution: data.group_solution,
        tags: tagIds,
        reaction_count: data.reaction_count || 0,
        comment_count: data.comment_count || 0
      });

      await newSolution.save();
      console.log(`   ✅ Created: ${data.solution_name}`);
      created++;
    }

    console.log(`\n📊 Done: ${created} created, ${skipped} skipped (total: ${SOLUTIONS_DATA.length})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedSolutions();
