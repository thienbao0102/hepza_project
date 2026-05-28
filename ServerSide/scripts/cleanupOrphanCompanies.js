const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const Company = require('../models/companyModel');
const User = require('../models/userModel');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.ATLAS_URI || process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');

const sortByCreatedAt = (users = []) => (
  [...users].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
);

const resolveRepresentative = (companyUsers = []) => {
  const activeUsers = companyUsers.filter((user) => !user.deleted_at);
  return activeUsers[0] || companyUsers[0] || null;
};

async function run() {
  if (!mongoUri) {
    throw new Error('Thiếu ATLAS_URI hoặc MONGO_URI trong file .env');
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB (${shouldApply ? 'apply' : 'dry-run'})`);

  const companies = await Company.find({ deleted_at: null }).lean();
  const orphanCompanies = [];

  for (const company of companies) {
    const companyUsers = sortByCreatedAt(
      await User.find({ company_id: company.company_id, role: 'company' }).lean()
    );
    const representativeUser = resolveRepresentative(companyUsers);
    const activeUsers = companyUsers.filter((user) => !user.deleted_at);

    if (representativeUser || activeUsers.length > 0) {
      continue;
    }

    orphanCompanies.push({
      _id: company._id,
      company_id: company.company_id,
      company_name: company.company_name,
      zone_id: company.zone_id,
      stored_representative_user_id: company.representative_user_id || null,
      stored_user_ids: company.user_ids || [],
      total_company_users: companyUsers.length,
    });
  }

  console.log(`Found ${orphanCompanies.length} orphan companies.`);
  orphanCompanies.forEach((company, index) => {
    console.log(
      `${index + 1}. ${company.company_id} | ${company.company_name} | zone=${company.zone_id || '-'} | user_ids=${company.stored_user_ids.join(',') || '-'} | representative=${company.stored_representative_user_id || '-'}`
    );
  });

  if (!shouldApply || orphanCompanies.length === 0) {
    return;
  }

  const now = new Date();
  const companyIds = orphanCompanies.map((company) => company._id);

  const result = await Company.updateMany(
    { _id: { $in: companyIds }, deleted_at: null },
    {
      $set: {
        deleted_at: now,
        deleted_by: 'system_cleanup_orphan_company',
        updated_at: now,
        updated_by: 'system_cleanup_orphan_company',
        representative_user_id: null,
      },
    }
  );

  console.log(`Soft-deleted ${result.modifiedCount || 0} orphan companies.`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Cleanup failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  });
