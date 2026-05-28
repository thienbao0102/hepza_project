const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI;

// Mapping giữa Counter ID và Collection/Field/Prefix
const counterMapping = {
    'admin': { collection: 'users', field: 'user_id', prefix: 'AM' },
    'manager': { collection: 'users', field: 'user_id', prefix: 'MG' },
    'company_user': { collection: 'users', field: 'user_id', prefix: 'CU' },
    'kcn': { collection: 'industrialzones', field: 'zone_id', prefix: 'KCN' },
    'kcx': { collection: 'industrialzones', field: 'zone_id', prefix: 'KCX' },
    'solution': { collection: 'solutions', field: 'solution_id', prefix: 'SL' },
    'waste_buy_demand': { collection: 'wastebuydemands', field: '_id', prefix: 'WBD' },
    'waste_sell_offer': { collection: 'wasteselloffers', field: '_id', prefix: 'WSO' },
    'hashtag': { collection: 'hashtags', field: 'hashtag_id', prefix: 'HASH' },
    'industry': { collection: 'industries', field: 'industry_id', prefix: 'IN' },
    'industry_group': { collection: 'industrygroups', field: 'group_id', prefix: 'IG' },
    'notification_template': { collection: 'notificationtemplates', field: 'notification_T_id', prefix: 'NT' },
    'notification_instance': { collection: 'notificationinstances', field: 'notification_I_id', prefix: 'NI' },
    'notification_log': { collection: 'notificationsendlogs', field: 'log_id', prefix: 'NL' },
    'exportHistory': { collection: 'exporthistories', field: 'export_id', prefix: 'EX' },
    'summary': { collection: 'summaryrecords', field: '_id', prefix: 'SR' },
    'emission': { collection: 'emissions', field: 'emission_id', prefix: 'EM' },
    'input': { collection: 'inputresources', field: '_id', prefix: 'IR' },
    'fuel': { collection: 'fuelresources', field: '_id', prefix: 'FR' },
    'waste': { collection: 'wasteresources', field: '_id', prefix: 'WR' },
    'regulation': { collection: 'regulations', field: 'regulation_id', prefix: 'RL' },
    'ElecDetail': { collection: 'electricdetails', field: '_id', prefix: 'ELD' },
    'WatDetail': { collection: 'waterdetails', field: '_id', prefix: 'WAD' },
    'ComDetail': { collection: 'combustiondetails', field: '_id', prefix: 'COD' },
    'OthDetail': { collection: 'otherdetails', field: '_id', prefix: 'OTD' },
    'WasteDetail': { collection: 'wastedetails', field: '_id', prefix: 'WD' },
    'solution_comment': { collection: 'solutioncomments', field: '_id', prefix: 'SC' }, // Giả định prefix
};

async function syncCounters() {
    try {
        console.log('🚀 Đang kết nối MongoDB...');
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        // Lấy danh sách collection thực tế để log
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log('📊 Đang lấy danh sách counters...');
        const counters = await db.collection('counters').find({}).toArray();

        console.log(`\n${'Counter Name'.padEnd(25)} | ${'Max ID'.padStart(6)} | ${'Prev Seq'.padStart(8)} | Status`);
        console.log('-'.repeat(60));

        for (const counter of counters) {
            const counterId = counter._id;
            let config = counterMapping[counterId];

            if (!config && counterId.startsWith('company_')) {
                const zoneId = counterId.replace('company_', '');
                config = {
                    collection: 'companies',
                    field: 'company_id',
                    prefix: `${zoneId}DN`
                };
            }

            if (!config) {
                console.log(`${counterId.padEnd(25)} | ${'N/A'.padStart(6)} | ${counter.sequence_value.toString().padStart(8)} | ⚠️ Unknown Mapping`);
                continue;
            }

            if (!collectionNames.includes(config.collection)) {
                console.log(`${counterId.padEnd(25)} | ${'N/A'.padStart(6)} | ${counter.sequence_value.toString().padStart(8)} | ⚠️ Collection Not Found (${config.collection})`);
                continue;
            }

            const collection = db.collection(config.collection);
            const prefix = config.prefix;
            const field = config.field;

            const docs = await collection.find({ [field]: { $regex: `^${prefix}` } }).project({ [field]: 1 }).toArray();

            let maxVal = 0;
            const existingVals = new Set();
            docs.forEach(doc => {
                const idStr = doc[field];
                if (idStr) {
                    const numPart = idStr.replace(prefix, '');
                    const val = parseInt(numPart);
                    if (!isNaN(val)) {
                        existingVals.add(val);
                        if (val > maxVal) maxVal = val;
                    }
                }
            });

            // Phát hiện ID bị khuyết
            const available_seqs = [];
            for (let i = 1; i <= maxVal; i++) {
                if (!existingVals.has(i)) {
                    available_seqs.push(i);
                }
            }

            const currentAvailableCount = counter.available_seqs ? counter.available_seqs.length : 0;

            if (maxVal !== counter.sequence_value || available_seqs.length !== currentAvailableCount) {
                const status = maxVal < counter.sequence_value ? '⬇️ RESET DOWN' : '⬆️ SYNC UP';
                console.log(`${counterId.padEnd(25)} | ${maxVal.toString().padStart(6)} | ${counter.sequence_value.toString().padStart(8)} | ${status} (Found ${available_seqs.length} gaps)`);
                await db.collection('counters').updateOne(
                    { _id: counterId },
                    {
                        $set: {
                            sequence_value: maxVal,
                            available_seqs: available_seqs
                        }
                    }
                );
            } else {
                console.log(`${counterId.padEnd(25)} | ${maxVal.toString().padStart(6)} | ${counter.sequence_value.toString().padStart(8)} | ✅ OK (Gaps: ${available_seqs.length})`);
            }
        }

        console.log('\n✨ Đã hoàn thành đồng bộ counters.');
    } catch (err) {
        console.error('❌ Lỗi:', err);
    } finally {
        await mongoose.disconnect();
    }
}

syncCounters();
