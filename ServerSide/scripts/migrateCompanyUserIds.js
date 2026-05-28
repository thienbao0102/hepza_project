const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../models/companyModel');
const User = require('../models/userModel');

const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrateCompanyUserIds = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.ATLAS_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // 1. We first fetch all companies
        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies to process`);

        let modifiedCount = 0;

        // We update every company to ensure user_ids is an array.
        for (const company of companies) {
            const dbDoc = company._doc; // Get raw document just in case user_id is dropped from schema
            let currentUserIds = company.user_ids || [];
            let didChange = false;

            // If there's a traditional user_id, add it to the array
            if (dbDoc.user_id && !currentUserIds.includes(dbDoc.user_id)) {
                currentUserIds.push(dbDoc.user_id);
                didChange = true;
            }

            // Update by adding user_ids and unsetting user_id
            const result = await Company.collection.updateOne(
                { _id: company._id },
                {
                    $set: { user_ids: currentUserIds },
                    $unset: { user_id: "" }
                }
            );

            if (result.modifiedCount > 0) {
                modifiedCount++;
            }
        }

        // Also, find out if there are any Users missing in company.user_ids but having company_id attached.
        const companyUsers = await User.find({ role: 'company', deleted_at: null });
        for (const user of companyUsers) {
            if (user.company_id) {
                const result = await Company.collection.updateOne(
                    { company_id: user.company_id },
                    { $addToSet: { user_ids: user.user_id } }
                );
                if (result.modifiedCount > 0) {
                    modifiedCount++;
                }
            }
        }

        console.log(`Migration completed successfully. Modified ${modifiedCount} companies.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateCompanyUserIds();
