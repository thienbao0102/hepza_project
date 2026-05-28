/**
 * Migration Script: Populate wasteNameNormalized for existing records.
 * Run once: node ServerSide/scripts/migrateNormalizedNames.js
 * 
 * This script reads all WasteBuyDemand and WasteSellOffer records and
 * populates the wasteNameNormalized field from wasteName.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const { removeDiacritics } = require('../utils/removeDiacritics');

const ATLAS_URI = process.env.ATLAS_URI;

async function migrate() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    // Migrate WasteBuyDemand
    console.log('\n📦 Migrating WasteBuyDemand...');
    const buyDemands = await WasteBuyDemand.find({});
    let buyCount = 0;
    for (const doc of buyDemands) {
        if (doc.wasteName) {
            const normalized = removeDiacritics(doc.wasteName);
            if (doc.wasteNameNormalized !== normalized) {
                await WasteBuyDemand.updateOne(
                    { _id: doc._id },
                    { $set: { wasteNameNormalized: normalized } }
                );
                buyCount++;
            }
        }
    }
    console.log(`   ✅ Updated ${buyCount}/${buyDemands.length} WasteBuyDemand records`);

    // Migrate WasteSellOffer
    console.log('\n📦 Migrating WasteSellOffer...');
    const sellOffers = await WasteSellOffer.find({});
    let sellCount = 0;
    for (const doc of sellOffers) {
        if (doc.wasteName) {
            const normalized = removeDiacritics(doc.wasteName);
            if (doc.wasteNameNormalized !== normalized) {
                await WasteSellOffer.updateOne(
                    { _id: doc._id },
                    { $set: { wasteNameNormalized: normalized } }
                );
                sellCount++;
            }
        }
    }
    console.log(`   ✅ Updated ${sellCount}/${sellOffers.length} WasteSellOffer records`);

    console.log('\n🎉 Migration completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
