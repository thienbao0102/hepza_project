/**
 * One-time migration: Normalize all existing user emails to lowercase + trimmed.
 * 
 * Run: node scripts/migrateEmailsToLowercase.js
 * 
 * Safe to run multiple times — idempotent.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hepza';

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        console.log('Database:', mongoose.connection.db.databaseName);

        const User = mongoose.connection.collection('users');

        // Fetch ALL users and compare in JS to avoid collation/regex issues
        const allUsers = await User.find({}).toArray();
        console.log(`Found ${allUsers.length} total users`);

        let count = 0;
        for (const user of allUsers) {
            if (!user.email) continue;
            const normalizedEmail = user.email.trim().toLowerCase();
            if (normalizedEmail !== user.email) {
                console.log(`  [${user.user_id || user._id}] "${user.email}" → "${normalizedEmail}"`);
                await User.updateOne(
                    { _id: user._id },
                    { $set: { email: normalizedEmail, updated_at: new Date() } }
                );
                count++;
            }
        }

        if (count === 0) {
            console.log('✅ All emails are already normalized.');
        } else {
            console.log(`✅ Normalized ${count} email(s).`);
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrate();
