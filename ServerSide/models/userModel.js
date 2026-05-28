const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  user_id: { type: String, unique: true },
  full_name: { type: String, required: true },
  phone_number: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    set: (v) => v ? v.trim().toLowerCase() : v,
  },
  role: { type: String, enum: ['admin', 'manager', 'company'], required: true },
  zone_id: { type: String },
  company_id: { type: String },
  password: { type: String, required: true },
  firstLogin: { type: Boolean, default: true },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String },
  deleted_at: { type: Date },
  deleted_by: { type: String }
});

UserSchema.pre('save', async function (next) {
  // Normalize email
  if (this.isModified('email') && this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  if (this.isNew && !this.user_id) {
    if (this.role === 'admin') {
      this.user_id = await generateId('admin', 'AM');
    } else if (this.role === 'manager') {
      this.user_id = await generateId('manager', 'MG');
    } else if (this.role === 'company') {
      this.user_id = await generateId('company_user', 'CU');
    }
  }
  next();
});

// Các index tối ưu cho truy vấn
UserSchema.index({ user_id: 1, deleted_at: 1 }); // Cho findByUserId, softDeleteUser
UserSchema.index({ email: 1, unique: true }); // Cho findByEmail, updateUserResetToken
UserSchema.index({ resetToken: 1, resetTokenExpires: 1 }); // Cho findByResetToken
UserSchema.index({ deleted_at: 1, role: 1 }); // Cho countUsers, getUsersByRole
UserSchema.index({ updated_at: -1, _id: 1 }); // Cho getUsersByRole ($sort)
UserSchema.index({ role: 'manager', zone_id: 1 }, { unique: true, sparse: true }); // sparse để bỏ qua document không có zone_id

UserSchema.index({ role: 'company', company_id: 1 }, { partialFilterExpression: { role: 'company', company_id: { $type: "string" }, deleted_at: null } });

module.exports = mongoose.model('User', UserSchema);