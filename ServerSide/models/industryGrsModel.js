const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const IndustryGroupSchema = new Schema({
  group_id: { type: String, unique: true }, // ID tự động tăng, ví dụ: IG00001
  group_name: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String },
});

// Tự động sinh group_id trước khi lưu
IndustryGroupSchema.pre('save', async function (next) {
  if (this.isNew && !this.group_id) {
    this.group_id = await generateId('industry_group', 'IG');
  }
  next();
});

// Index tối ưu
IndustryGroupSchema.index({ group_id: 1 }); // Cho truy vấn theo group_id
IndustryGroupSchema.index({ group_name: 1 }, { unique: true }); // Đảm bảo tên nhóm ngành không trùng

module.exports = mongoose.model('IndustryGroup', IndustryGroupSchema);