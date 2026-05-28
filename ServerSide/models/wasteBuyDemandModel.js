const mongoose = require("mongoose");
const { generateId } = require("../utils/autoIncrement");
const Schema = mongoose.Schema;

const WasteBuyDemandSchema = new Schema({
    _id: { type: String },

    // Thông tin người mua
    user_id: { type: String, ref: "User", required: true },
    company_id: { type: String, required: true, ref: "Company" },
    zone_id: { type: String, required: true, ref: "IndustrialZone" },

    // Thông tin chất thải doanh nghiệp cần mua
    wasteName: { type: String, required: true },
    wasteNameNormalized: { type: String, index: true }, // wasteName đã bỏ dấu để hỗ trợ search
    otherWasteName: { type: String }, // tên chất thải khác (nếu có)
    industrialGrs: {
        type: String, enum: ["Chế biến lương thực, thực phẩm", "May mặc, thuộc da, dệt nhuộm",
            "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất", "Hoá dược, cao su, nhựa", "Cơ khí, điện, điện tử", "Khác"
        ], default: "Khác"
    },
    desiredWasteCode: { type: String },

    // Số lượng & đơn vị
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "kg" },

    // Giá và điều kiện mua
    price: { type: Number, min: 0 },// giá đề xuất
    currency: { type: String, default: "VND" },

    notes: { type: String },
    // File đính kèm (image/PDF) — uploaded to Cloudinary
    attachments: [{
        url: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    }],
    // ngày mong muốn hoàn thành
    expiryDate: { type: Date, required: false, default: null },

    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

WasteBuyDemandSchema.pre("save", async function (next) {
    if (this.isNew && !this._id) {
        this._id = await generateId("waste_buy_demand", "WBD");
    }
    next();
});

WasteBuyDemandSchema.index({ industrialGrs: 1 });
WasteBuyDemandSchema.index({ wasteName: "text", wasteNameNormalized: "text", purpose: "text" });


module.exports = mongoose.model("WasteBuyDemand", WasteBuyDemandSchema);
