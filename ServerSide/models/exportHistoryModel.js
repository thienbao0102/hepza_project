const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const exportHistorySchema = new Schema({
    export_id: { type: String, unique: true },
    user_id: { type: String, required: true },
    company_ids: [{ type: String, required: true }],
    periodKeyStart: { type: Number, required: true },
    periodKeyEnd: { type: Number, required: true },
    resource_types: [{ type: Number }], // 1: Input, 2: Fuel, 3: Waste
    option: { type: Number, default: 1 }, // 1: by company_ids, 2: by zone_id, 3: all companies
    zone_id: { type: String }, // Required if option is 2
    infor_export: { type: String },
    name: { type: String }, // Tên tệp
    creator: { type: String }, // Người tạo (req.user full_name or username)
    status: {
        type: String,
        enum: ['queued', 'processing', 'success', 'failed', 'expired', 'thành công', 'chưa xuất tệp'],
        default: 'queued'
    },
    processed_records: { type: Number, default: 0 },
    total_records: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    file_path: { type: String },
    file_size: { type: Number, default: 0 },
    expires_at: { type: Date },
    error_message: { type: String },
    started_at: { type: Date },
    completed_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    isDeleted: {type: Boolean, default: false}
});

exportHistorySchema.index({ user_id: 1, created_at: -1 });
exportHistorySchema.index({ status: 1, expires_at: 1 });

exportHistorySchema.pre('save', async function (next) {
    if (this.isNew && !this.export_id) {
        this.export_id = await generateId('exportHistory', 'EX'); // Tạo ID như EX001
    }
    next();
});

module.exports = mongoose.model('ExportHistory', exportHistorySchema);