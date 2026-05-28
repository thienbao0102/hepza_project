const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');

const NotificationAttachmentSchema = new mongoose.Schema({
    url: { type: String, required: true, trim: true },
    originalName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 }
}, { _id: false });

const NotificationSendLogSchema = new mongoose.Schema({
    log_id: { type: String, unique: true },
    execution_key: { type: String, unique: true, sparse: true },
    template_id: { type: String, required: true },
    template_name: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['Warning', 'Reminder', 'Info'], 
        required: true 
    },
    schedule_type: {
        type: String,
        enum: ['IMMEDIATE', 'ONE_TIME', 'RECURRING', 'MANUAL'],
        required: true
    },
    target: {
        roles: [{ type: String, required: true }],
        zone_ids: [{ type: String }],
        company_ids: [{ type: String }]
    },
    attachments: {
        type: [NotificationAttachmentSchema],
        default: []
    },
    total_recipients: { type: Number, required: true }, // Số user nhận được
    zone_ids: [{ type: String }], // Các zone thông báo được gửi đến
    sent_by: { type: String, required: true }, // admin_id
    sent_at: { type: Date, default: Date.now }
});

// Auto generate log_id
NotificationSendLogSchema.pre('save', async function(next) {
    if (this.isNew && !this.log_id) {
        this.log_id = await generateId('notification_log', 'NL');
    }
    next();
});

module.exports = mongoose.model('NotificationSendLog', NotificationSendLogSchema);
