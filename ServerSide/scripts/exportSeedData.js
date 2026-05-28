/**
 * Export dữ liệu hiện tại từ MongoDB để cập nhật seed scripts.
 * Chạy: node scripts/exportSeedData.js
 * 
 * Xuất ra 3 file JSON trong thư mục scripts/data/:
 *   - regulations_export.json
 *   - solutions_export.json  
 *   - zones_export.json
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const exportSeedData = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB\n');

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // ── 1. Export Zones ──
    console.log('📦 Exporting Industrial Zones...');
    const zones = await mongoose.connection.collection('industrialzones')
      .find({ deleted_at: null })
      .sort({ zone_id: 1 })
      .toArray();

    const zonesData = zones.map(z => ({
      zone_name: z.zone_name,
      zone_type: z.zone_type,
      location: z.location || '',
      established_year: z.established_year || null,
      status: z.status || 'active',
      image_url: z.image_url || ''
    }));

    fs.writeFileSync(
      path.join(dataDir, 'zones_export.json'),
      JSON.stringify(zonesData, null, 2),
      'utf8'
    );
    console.log(`   ✅ Exported ${zonesData.length} zones\n`);

    // ── 2. Export Regulations + Hashtags ──
    console.log('📦 Exporting Regulations...');
    const regulations = await mongoose.connection.collection('regulations')
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    // Load all hashtags for lookup
    const hashtags = await mongoose.connection.collection('hashtags').find({}).toArray();
    const hashtagMap = {};
    hashtags.forEach(h => { hashtagMap[h._id.toString()] = h.name; });

    const regulationsData = regulations.map(r => ({
      regulation_name: r.regulation_name || '',
      des_short: r.des_short || '',
      link: r.link || '',
      effective_date: r.effective_date || null,
      group_regulation: r.group_regulation || '',
      tags: (r.tags || []).map(tagId => hashtagMap[tagId.toString()] || tagId.toString())
    }));

    fs.writeFileSync(
      path.join(dataDir, 'regulations_export.json'),
      JSON.stringify(regulationsData, null, 2),
      'utf8'
    );
    console.log(`   ✅ Exported ${regulationsData.length} regulations\n`);

    // ── 3. Export Solutions + Hashtags ──
    console.log('📦 Exporting Solutions...');
    const solutions = await mongoose.connection.collection('solutions')
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const solutionsData = solutions.map(s => ({
      solution_name: s.solution_name || '',
      des_short: s.des_short || '',
      des_long: s.des_long || '',
      link: s.link || '',
      group_solution: s.group_solution || '',
      tags: (s.tags || []).map(tagId => hashtagMap[tagId.toString()] || tagId.toString()),
      reaction_count: s.reaction_count || 0,
      comment_count: s.comment_count || 0
    }));

    fs.writeFileSync(
      path.join(dataDir, 'solutions_export.json'),
      JSON.stringify(solutionsData, null, 2),
      'utf8'
    );
    console.log(`   ✅ Exported ${solutionsData.length} solutions\n`);

    // ── 4. Export unique hashtag names ──
    const allTags = new Set();
    regulationsData.forEach(r => r.tags.forEach(t => allTags.add(t)));
    solutionsData.forEach(s => s.tags.forEach(t => allTags.add(t)));

    fs.writeFileSync(
      path.join(dataDir, 'hashtags_export.json'),
      JSON.stringify([...allTags].sort(), null, 2),
      'utf8'
    );
    console.log(`   ✅ Exported ${allTags.size} unique hashtags\n`);

    console.log('🎉 Export hoàn tất! Files saved to scripts/data/');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

exportSeedData();
