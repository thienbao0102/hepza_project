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

const uniqueStrings = (values = []) => [...new Set(values.filter(Boolean).map(String))];

async function run() {
  if (!mongoUri) {
    throw new Error('Thiếu ATLAS_URI hoặc MONGO_URI trong file .env');
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB (${shouldApply ? 'apply' : 'dry-run'})`);

  const companies = await Company.find({}).lean();
  const summary = {
    total: companies.length,
    updated: 0,
    unchanged: 0,
    noUsers: 0,
  };

  for (const company of companies) {
    const companyUsers = sortByCreatedAt(
      await User.find({ company_id: company.company_id, role: 'company' }).lean()
    );
    const activeUsers = companyUsers.filter((user) => !user.deleted_at);

    const normalizedUserIds = uniqueStrings(companyUsers.map((user) => user.user_id));
    const representativeUserId = activeUsers[0]?.user_id || companyUsers[0]?.user_id || null;

    const currentUserIds = uniqueStrings(company.user_ids || []);
    const currentRepresentativeUserId = company.representative_user_id || null;

    const changed =
      JSON.stringify(currentUserIds) !== JSON.stringify(normalizedUserIds) ||
      currentRepresentativeUserId !== representativeUserId;

    if (companyUsers.length === 0) {
      summary.noUsers += 1;
    }

    if (!changed) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;

    console.log(
      `[${shouldApply ? 'APPLY' : 'DRY'}] ${company.company_id} | users: ${currentUserIds.join(',') || '-'} -> ${normalizedUserIds.join(',') || '-'} | representative: ${currentRepresentativeUserId || '-'} -> ${representativeUserId || '-'}`
    );

    if (!shouldApply) {
      continue;
    }

    await Company.updateOne(
      { _id: company._id },
      {
        $set: {
          user_ids: normalizedUserIds,
          representative_user_id: representativeUserId,
          updated_at: new Date(),
        },
      }
    );
  }

  console.log('Summary:', summary);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Backfill failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  });
