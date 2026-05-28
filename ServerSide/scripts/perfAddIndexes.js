require('dotenv').config();
const mongoose = require('mongoose');

const SummaryRecord = require('../models/summaryRecordsModel');
const Emission = require('../models/emissionModel');
const FuelResource = require('../models/fuelResourcesModel');
const WasteResource = require('../models/wasteResourcesModel');
const InputResource = require('../models/inputResourcesModel');
const EnvironmentalReport = require('../models/environmentalReportModel');
const ResourceVersion = require('../models/resourceVersionModel');

async function applyIndexes() {
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log('Connected to DB. Applying performance indexes...');

        const collections = [
            { model: SummaryRecord, name: 'SummaryRecords' },
            { model: Emission, name: 'Emissions' },
            { model: FuelResource, name: 'FuelResources' },
            { model: WasteResource, name: 'WasteResources' },
            { model: InputResource, name: 'InputResources' },
            { model: EnvironmentalReport, name: 'EnvironmentalReports' },
            { model: ResourceVersion, name: 'ResourceVersions' }
        ];

        for (const { model, name } of collections) {
            if (!model) continue;

            // Compound index heavily used by `buildActiveSummaryFilter` and `initQuery`
            // This solves the full-coll scan during the Dashboard fan-out.
            await model.collection.createIndex({ company_id: 1, periodKey: -1, isDeleted: 1 });

            // Zone-level aggregations
            await model.collection.createIndex({ zone_id: 1, periodKey: -1, isDeleted: 1 });

            console.log(`✅ Applied compound indexes to ${name}`);
        }

        // Company _id lookup index for `$lookup` performance in Emission/Summary pipelines
        const Company = require('../models/companyModel');
        if (Company) {
            await Company.collection.createIndex({ company_id: 1 });
            console.log(`✅ Applied lookup index to Companies`);
        }

        console.log('All performance indexes applied successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to apply indexes:', error);
        process.exit(1);
    }
}

applyIndexes();
