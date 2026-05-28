const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const IndustrySchema = new Schema({
  industry_id: { type: String, unique: true }, // ID tự động tăng, ví dụ: IN00001
  industry_code: { type: String, required: true, unique: true }, // Mã VSIC cấp 4, ví dụ: "1071"
  industry_name: { type: String, required: true },
  group_id: { type: String, required: true }, // Tham chiếu tới group_id của IndustryGroup
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String },
});

// Tự động sinh industry_id trước khi lưu
IndustrySchema.pre('save', async function (next) {
  if (this.isNew && !this.industry_id) {
    this.industry_id = await generateId('industry', 'IN');
  }
  next();
});

// Index tối ưu
IndustrySchema.index({ industry_id: 1 }); // Cho truy vấn theo industry_id
IndustrySchema.index({ industry_code: 1 }); // Cho truy vấn/search theo mã VSIC
IndustrySchema.index({ group_id: 1 }); // Cho truy vấn theo nhóm ngành
IndustrySchema.index({ industry_name: 1, group_id: 1 }, { unique: true }); // Đảm bảo tên ngành không trùng trong cùng nhóm

module.exports = mongoose.model('Industry', IndustrySchema);