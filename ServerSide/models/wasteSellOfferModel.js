const mongoose = require("mongoose");
const { generateId } = require("../utils/autoIncrement");
const Schema = mongoose.Schema;

const WasteSellOfferSchema = new Schema({
    _id: { type: String },


    // Thông tin người bán
    user_id: { type: String, ref: "User", required: true },
    company_id: { type: String, required: true, ref: "Company" },
    zone_id: { type: String, required: true, ref: "IndustrialZone" },

    // Loại chất thải doanh nghiệp muốn bán
    wasteName: { type: String, required: true },
    wasteNameNormalized: { type: String, index: true }, // wasteName đã bỏ dấu để hỗ trợ search
    otherWasteName: [{ type: String }], // tên khác của chất thải nếu có
    wasteCode: { type: String }, // mã chất thải nếu có
    industrialGrs: {
        type: String, enum: ["Chế biến lương thực, thực phẩm", "May mặc, thuộc da, dệt nhuộm",
            "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất", "Hoá dược, cao su, nhựa", "Cơ khí, điện, điện tử", "Khác"
        ], default: "Khác"
    },

    // MỨC NGUY HẠI
    hazardLevel: { type: String, enum: ['non-hazardous', 'low', 'medium', 'high'] },
    // Thông tin số lượng
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "kg" },

    // Giá và điều kiện giao dịch
    price: { type: Number, min: 0 },
    currency: { type: String, default: "VND" },
    frequency: { type: String, enum: ["một lần", "hằng tuần", "hằng tháng", "hằng quý", "hằng năm"] }, // tần suất cung cấp

    // Mô tả, thông tin thêm
    notes: { type: String },
    images: [{ type: String }], // URL ảnh (legacy — kept for backward compat)
    // File đính kèm (image/PDF) — uploaded to Cloudinary
    attachments: [{
        url: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    }],

    // ngày hết hạn của offer
    expiryDate: { type: Date, required: false, default: null },

    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

WasteSellOfferSchema.pre("save", async function (next) {
    if (this.isNew && !this._id) {
        this._id = await generateId("waste_sell_offer", "WSO");
    }
    next();
});

WasteSellOfferSchema.index({ industrialGrs: 1 });
WasteSellOfferSchema.index({ wasteName: "text", wasteNameNormalized: "text", description: "text" });


module.exports = mongoose.model("WasteSellOffer", WasteSellOfferSchema);
