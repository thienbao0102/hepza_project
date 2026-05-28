const mongoose = require('mongoose');
const { generateCompanyId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;
const IndustrialZone = require('./industrialZoneModel');

const CompanySchema = new Schema({
  company_id: { type: String, unique: true },
  company_name: { type: String, required: true },
  company_registration_number: {
    type: String,
    unique: true,
    sparse: true,
    required: [true, 'Mã số thuế là bắt buộc'],
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^\d{10}(-\d{3})?$/.test(v);
      },
      message: props => `"${props.value}" không đúng định dạng MST. Vui lòng nhập 10 chữ số (VD: 0312345678) hoặc 13 chữ số cho chi nhánh (VD: 0312345678-001).`
    }
  },
  website: {
    type: String,
    validate: {
      validator: function (v) {
        return !v || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*(\?.*)?$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  address: {
    type: String,
    set: (v) => {
      if (v === undefined || v === null) return undefined;
      const normalized = String(v).trim();
      return normalized === '' ? undefined : normalized;
    }
  },
  company_type: { type: String },
  zone_id: { type: String, required: true },
  user_id: { type: String, default: null },
  industry: {
    type: [String],
    required: true
  },
  industry_group: {
    type: [String], // Lưu group_id references (thay vì enum cố định)
    required: true
  },
  total_workers: {
    type: Number,
    min: [0, 'Total workers must be a positive number'],
  },
  revenue: { type: String },
  revenue_currency: { type: String, enum: ['USD', 'VND', null] },
  market: { type: String },
  founded_year: {
    type: Number,
    min: [1800, 'Founded year must be after 1800'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future']
  },
  status: { type: String, enum: ['Đang hoạt động', 'Chưa triển khai', 'Ít hoạt động', 'Đang xây dựng', 'Tạm ngưng', 'Thanh lý'], default: 'Đang hoạt động' },
  licenses: [{
    license_id: {
      type: String,
      required: [true, 'Mã giấy phép là bắt buộc'],
      trim: true,
    },
    license_name: {
      type: String,
      required: [true, 'Tên giấy phép là bắt buộc'],
      trim: true
    },
    issuing_authority: {
      type: String,
      required: [true, 'Nơi cấp là bắt buộc'],
      trim: true
    },
    issue_date: {
      type: Date,
      required: [true, 'Ngày cấp là bắt buộc']
    },
    expiry_date: {
      type: Date,
      required: [true, 'Ngày hết hạn là bắt buộc'],
      validate: {
        validator: function (v) {
          return !v || (v > this.issue_date) // nếu có thì phải > ngày cấp
        },
        message: 'Ngày hết hạn phải sau ngày cấp'
      }
    },
    status: {
      type: String,
      enum: ['Hiệu lực', 'Sắp hết hạn', 'Hết hạn', 'Đã thu hồi'],
      default: 'Hiệu lực'
    },
    file_url: {
      type: String,
      trim: true
    },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String }, // user_id
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: String }
  }],
  representative_user_id: {
    type: String,
    default: null
  },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String },
  deleted_at: { type: Date },
  deleted_by: { type: String }
});

CompanySchema.pre('save', function (next) {
  if (this.isModified('licenses')) {
    this.licenses.forEach(license => {
      // Nếu không có ngày hết hạn → luôn Hiệu lực
      if (!license.expiry_date) {
        license.status = 'Hiệu lực';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // chuẩn hóa ngày
        const expiry = new Date(license.expiry_date);
        expiry.setHours(0, 0, 0, 0);

        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          license.status = 'Hết hạn';
        } else if (daysLeft <= 60) {
          license.status = 'Sắp hết hạn';
        } else {
          license.status = 'Hiệu lực';
        }
      }
      license.updated_at = new Date();
    });
  }
  next();
});

CompanySchema.pre('save', async function (next) {
  if (this.isNew && !this.company_id) {
    if (!this.zone_id) {
      this.zone_id = null;
      this.company_id = await generateCompanyId('UNASSIGNED');
    } else {
      const zone = await IndustrialZone.findOne({ zone_id: this.zone_id, deleted_at: null }).session(this.$session());
      if (!zone) {
        return next(new Error(`Industrial Zone with zone_id ${this.zone_id} not found`));
      }
      this.company_id = await generateCompanyId(this.zone_id);
    }
  }
  next();
});

// Các index tối ưu cho truy vấn
CompanySchema.index({ company_id: 1, deleted_at: 1 }); // Cho getCompanyById, deleteCompanyById
CompanySchema.index({ company_name: 1, deleted_at: 1 }); // Cho getCompanyByName và tìm kiếm
CompanySchema.index({ zone_id: 1, deleted_at: 1 }); // Cho lọc theo zone_id
CompanySchema.index({ updated_at: -1, _id: 1 }); // Cho getAllCompanies
CompanySchema.index({ deleted_at: -1 }); // Cho getDeletedCompanies
CompanySchema.index({ company_type: 1, deleted_at: 1 }); // Cho lọc theo company_type
CompanySchema.index({ industry: 1, deleted_at: 1 }); // Cho lọc theo industry
CompanySchema.index({ industry_group: 1, deleted_at: 1 }); // Cho lọc theo industry_group
CompanySchema.index({ founded_year: 1, deleted_at: 1 }); // Cho lọc theo founded_year
CompanySchema.index({ total_workers: 1, deleted_at: 1 }); // Cho lọc theo total_workers
CompanySchema.index({ "licenses.expiry_date": 1 });
CompanySchema.index({ "licenses.status": 1 });
CompanySchema.index({ "licenses.license_id": 1 }); // tìm nhanh theo mã
CompanySchema.index({ "licenses.issuing_authority": 1 });

CompanySchema.index({ user_id: 1 }, { unique: true, partialFilterExpression: { user_id: { $type: "string" }, deleted_at: null } });

module.exports = mongoose.model('Company', CompanySchema);
