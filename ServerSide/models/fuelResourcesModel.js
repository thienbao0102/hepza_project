const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const versionPlugin = require('../plugins/versionPlugin');
const Schema = mongoose.Schema;

const fuelGroups = {
  // Điện
  el: ["Grid", "Renewable"],
  // Nước
  wa: ['tap', 'rain', 'well', 'recycle'],
  // Chất đốt (Combustion)
  co: ["COL", "BIO", "PET", "GASF", "COTH"],
};

const FuelResourceSchema = new Schema({
  _id: { type: String },
  fuelName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  note: { type: String },

  company_id: { type: String, required: true, ref: 'Company' },
  zone_id: { type: String, required: true, ref: 'IndustrialZone' },

  periodKey: { type: Number, required: true },// năm + tháng: 2023 + 2 = 202302

  main_group: { type: String, enum: Object.keys(fuelGroups), required: true, ref: "Abbreviation" },// el: electricity, wa: water, co: Combustion, ot: other
  sub_group: {
    type: String,
    validate: {
      validator: function (val) {
        // kiểm tra subgroup có thuộc mainGroup không
        return fuelGroups[this.main_group]?.includes(val);
      },
      message: props => `${props.value} không hợp lệ với mainGroup ${props.instance?.main_group || 'loại đang chọn'}`
    },
    required: true,
    ref: "Abbreviation"
  },

  billImage: { type: String, default: null }, // Cloudinary URL — only for el/wa

  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

FuelResourceSchema.pre('save', async function (next) {
  if (this.isNew && !this._id) {
    this._id = await generateId('fuel', 'FR'); // Tạo ID như FR001
  }
  next();
});

FuelResourceSchema.index({ company_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
FuelResourceSchema.index({ zone_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
FuelResourceSchema.index({ main_group: 1, sub_group: 1, periodKey: 1 });
FuelResourceSchema.index({ company_id: 1, periodKey: 1, isDeleted: 1 });

module.exports = mongoose.model('FuelResource', FuelResourceSchema);