const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const NotificationAttachmentSchema = new Schema({
    url: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        trim: true
    },
    mimeType: {
        type: String,
        trim: true
    },
    size: {
        type: Number,
        default: 0
    }
}, { _id: false });

const NotificationTemplateSchema = new Schema({
    notification_T_id: { 
        type: String, 
        unique: true 
    },

    name: { 
        type: String, 
        required: [true, 'Tên template là bắt buộc'],
        trim: true
    },

    title: { 
        type: String, 
        required: [true, 'Tiêu đề thông báo là bắt buộc'] 
    },
    body: { 
        type: String, 
        required: [true, 'Nội dung thông báo là bắt buộc'] 
    },

    type: { 
        type: String, 
        enum: ['Warning', 'Reminder', 'Info'],
        default: 'Info',
        required: true 
    },

    attachments: {
        type: [NotificationAttachmentSchema],
        default: []
    },
    
    // Nhóm mục tiêu
    target: {
        mode: {
            type: String,
            enum: ['STATIC', 'DYNAMIC', 'HYBRID'],
            default: 'STATIC'
        },
        dynamicRule: {
            type: String,
            enum: ['MISSING_REPORT'],
            required: function() { return ['DYNAMIC', 'HYBRID'].includes(this.target.mode); }
        },
        roles: [{ 
            type: String, 
            required: true 
        }],
        zone_ids: [{ type: String }],
        company_ids: [{
            type: String,
            validate: {
                validator: function(v) {
                    // DYNAMIC: company_ids PHẢI RỖNG
                    if (this.target.mode === 'DYNAMIC' && v.length > 0) {
                        throw new Error('DYNAMIC mode không được có company_ids');
                    }
                    // HYBRID: company_ids TÙY CHỌN
                    return true;
                },
                message: 'DYNAMIC mode không được có company_ids'
            }
        }]
    },

    // Nhóm lịch trình
    schedule: {
        type: {
            type: String,
            enum: ['IMMEDIATE', 'ONE_TIME', 'RECURRING', 'MANUAL'],
            default: 'MANUAL',
            required: true
        },
        cronString: {
            type: String,
            validate: {
                validator: function(v) {
                    return !(this.schedule.type === 'RECURRING' && !v);
                },
                message: 'cronString là bắt buộc cho lịch trình RECURRING'
            }
        },
        sendAt: {
            type: Date,
            validate: {
                validator: function(v) {
                    return !(this.schedule.type === 'ONE_TIME' && !v);
                },
                message: 'sendAt là bắt buộc cho lịch trình ONE_TIME'
            }
        }
    },

    creator_role: {
        type: String,
        enum: ['admin', 'manager'],
        required: true
    },

    isActive: { 
        type: Boolean, 
        default: true 
    },

    repeatJobKey: {
        type: String,
        default: null,
        sparse: true // Cho phép nhiều bản ghi có null
    },

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: String }
});

// Sinh ID tự động
NotificationTemplateSchema.pre('save', async function (next) {
    if (this.isNew && !this.notification_T_id) {
        this.notification_T_id = await generateId('notification_template', 'NT');
    }
    next();
});

NotificationTemplateSchema.index(
    { name: 1 },
    { 
        unique: true,
        collation: { locale: 'en', strength: 2 } // không phân biệt hoa/thường
    }
);

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema);
