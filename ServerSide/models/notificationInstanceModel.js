const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const NotificationAttachmentSchema = new Schema({
    url: { type: String, required: true, trim: true },
    originalName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 }
}, { _id: false });

const NotificationInstanceSchema = new Schema({
    notification_I_id: { 
        type: String, 
        unique: true 
    },
    template_id: { 
        type: String, 
        required: true,
        ref: 'NotificationTemplate'
    },
    log_id: {
        type: String,
        ref: 'NotificationSendLog'
    },
    user_id: { 
        type: String, 
        required: true,
        ref: 'User'
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    attachments: {
        type: [NotificationAttachmentSchema],
        default: []
    },
    type: { 
        type: String, 
        enum: ['Warning', 'Reminder', 'Info'], 
        default: 'Info',
        required: true 
    },
    status: { 
        type: String, 
        enum: ['delivered', 'read'], 
        default: 'delivered'
    },
    deliveredAt: { 
        type: Date, 
        default: Date.now
    },
    readAt: { 
        type: Date 
    },
    pin: {
        type: Boolean,
        default: false
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Sinh ID tự động
NotificationInstanceSchema.pre('save', async function (next) {
    if (this.isNew && !this.notification_I_id) {
        this.notification_I_id = await generateId('notification_instance', 'NI');
    }
    next();
});

// Index quan trọng
NotificationInstanceSchema.index({ user_id: 1, pin: -1, deliveredAt: -1 });
NotificationInstanceSchema.index({ user_id: 1, status: 1 });
NotificationInstanceSchema.index({ template_id: 1, created_by: 1 }); // cho filter sender_role

module.exports = mongoose.model('NotificationInstance', NotificationInstanceSchema);
