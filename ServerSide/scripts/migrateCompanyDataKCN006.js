const mongoose = require('mongoose');
const Company = require('./models/companyModel');
const Industry = require('./models/industryModel');
const IndustryGroup = require('./models/industryGrsModel');
require('dotenv').config();

async function migrateCompanyDataKCN006() {
  try {
    // Kết nối tới database
    await mongoose.connect(process.env.ATLAS_URI);

    // Lấy tất cả doanh nghiệp trong KCN006
    const companies = await Company.find({ zone_id: 'KCN006', deleted_at: null });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const company of companies) {
      console.log(`Processing company: ${company.company_id} - ${company.company_name}`);

      // Bỏ qua nếu đã có industry_ids và group_ids
      if (company.industry_ids?.length > 0 && company.group_ids?.length > 0) {
        console.log(`  Skipped: Already migrated (has industry_ids and group_ids)`);
        skippedCount++;
        continue;
      }

      // Ánh xạ industry
      let industryIds = [];
      if (company.industry) {
        const industry = await Industry.findOne({
          industry_name: company.industry,
          deleted_at: null,
        });
        if (industry) {
          industryIds = [industry.industry_id];
        } else {
          console.log(`  Skipped: Industry "${company.industry}" not found`);
          skippedCount++;
          continue;
        }
      } else {
        console.log(`  Skipped: No industry specified`);
        skippedCount++;
        continue;
      }

      // Ánh xạ industry_group
      let groupIds = [];
      if (company.industry_group) {
        const group = await IndustryGroup.findOne({
          group_name: company.industry_group,
          deleted_at: null,
        });
        if (group) {
          groupIds = [group.group_id];
        } else {
          console.log(`  Skipped: Industry group "${company.industry_group}" not found`);
          skippedCount++;
          continue;
        }
      } else {
        console.log(`  Skipped: No industry group specified`);
        skippedCount++;
        continue;
      }

      // Cập nhật document
      await Company.updateOne(
        { _id: company._id },
        {
          $set: { industry_ids: industryIds, group_ids: groupIds },
          $unset: { industry: '', industry_group: '' },
        }
      );

      console.log(`  Updated: Set industry_ids=${industryIds}, group_ids=${groupIds}`);
      updatedCount++;
    }

    console.log(`Migration completed: ${updatedCount} companies updated, ${skippedCount} companies skipped`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateCompanyDataKCN006();