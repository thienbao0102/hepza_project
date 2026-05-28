const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

// const subgroupMapping = {
//     // WSO: ["DOS", "INDS", "HAS"], // chất thải rắn
//     // WWA: ["DOW", "INDW", "HAW"], // nước thải
//     // GASW: ["GHG", "APG", "TOG"] // khí thải
//     DO,
//     IND,
//     HA,
//     WWA,
//     GASW,
// }

const WasteResourceSchema = new Schema({
    _id: { type: String },
    // Thông tin cơ bản
    wasteName: { type: String, required: true },
    otherWasteName: [{ type: String }], // tên khác của chất thải nếu có
    quantity: { type: Number, required: true, min: 0 },
    unit: {
        type: String,
        required: true,
        default: "Tấn",
        validate: {
            validator: function (value) {
                if (this.main_group === 'GASW') {
                    return String(value || '').trim().toLowerCase() === 'mg/l';
                }
                return true;
            },
            message: 'Khí thải chỉ được lưu đơn vị mg/l',
        },
    },
    codeWaste: { type: String },
    wasteCodeName: { type: String },
    note: { type: String },
    status: { type: String, default: null },

    company_id: { type: String, required: true, ref: 'Company' },
    zone_id: { type: String, required: true, ref: 'IndustrialZone' },

    periodKey: { type: Number, required: true },// năm + tháng: 2025 + 02 = 202502
    main_group: { type: String, enum: ['DO', 'IND', 'HA', 'WWA', 'GASW'], ref: "Abbreviation" },

    purpose: { type: String }, // mục đích (nếu có)

    //phương pháp xử lý
    treatmentMethods: { type: String, default: null },

    // chứng nhận
    certifications: [{ type: String }],

    // THÔNG TIN MUA BÁN (nếu có)
    price: { type: Number, min: 0 }, // giá bán/giá thu gom (nếu có)
    purchasingAddress: { type: String }, // địa chỉ mua/ thu gom (nếu có)
    purchasingUnit: { type: String }, //tên đơn vị mua/ thu gom (nếu có)

    // File đính kèm (image/PDF) — uploaded to Cloudinary
    attachments: [{
        url: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    }],

    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

WasteResourceSchema.pre('save', async function (next) {
    if (this.isNew && !this._id) {
        this._id = await generateId('waste', 'WR'); // Tạo ID như WR001
    }
    next();
});

WasteResourceSchema.index({ company_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
WasteResourceSchema.index({ zone_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
WasteResourceSchema.index({ main_group: 1, sub_group: 1, periodKey: 1 });
WasteResourceSchema.index({ company_id: 1, periodKey: 1, isDeleted: 1 });
WasteResourceSchema.index({ zone_id: 1, periodKey: 1, isDeleted: 1 });

module.exports = mongoose.model('WasteResource', WasteResourceSchema);