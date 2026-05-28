/**
 * Backfill legacy GASW waste records to mg/l.
 * Run: node scripts/backfillGasWasteUnit.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const WasteResource = require('../models/wasteResourcesModel');
const SummaryRecord = require('../models/summaryRecordsModel');

const run = async () => {
  let exitCode = 0;

  try {
    if (!process.env.ATLAS_URI) {
      throw new Error('ATLAS_URI is not defined in .env');
    }

    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Connected to MongoDB');

    const wasteResult = await WasteResource.updateMany(
      { main_group: { $regex: /^gasw$/i } },
      { $set: { unit: 'mg/l' } }
    );
    console.log(`Updated ${wasteResult.modifiedCount || 0} GASW waste records.`);

    const summaryResult = await SummaryRecord.updateMany(
      {},
      { $set: { 'waste.unit_gas_waste': 'mg/l' } }
    );
    console.log(`Updated ${summaryResult.modifiedCount || 0} summary records.`);
  } catch (error) {
    exitCode = 1;
    console.error('Backfill error:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(exitCode);
  }
};

run();
