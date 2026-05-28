const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    product_name: { type: String, required: true }, // Tên sản phẩm: bàn, ghế, thực phẩm chế biến,...
    capacity: { type: mongoose.Types.Decimal128, min: 0 }, // Công suất sản phẩm (nếu có, ví dụ: 100W cho thiết bị điện)
    quantity: { type: mongoose.Types.Decimal128, min: 0, required: true }, // Số lượng sản xuất
    unit: { type: String, required: true }, // Đơn vị: cái, kg, tấn,...
    details: { type: String } // Mô tả thêm: mục đích, khách hàng,...
});

const ProductRecordSchema = new Schema({
    product_record_id: { type: String, unique: true },
    company_id: { type: String, required: true, ref: 'Company' },
    zone_id: { type: String, required: true, ref: 'IndustrialZone' },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    products: [ProductSchema],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String },
    updated_by: { type: String }
});

ProductRecordSchema.pre('save', async function (next) {
    if (this.isNew && !this.product_record_id) {
        this.product_record_id = await generateId('product_record', 'PR'); // Tạo ID như PR001
    }
    next();
});

ProductRecordSchema.index({ company_id: 1, year: -1, month: -1 });
module.exports = mongoose.model('ProductRecord', ProductRecordSchema);