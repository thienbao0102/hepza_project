const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const {
  normalizeZoneNameForCompare,
  normalizeZoneSearchText,
} = require('../utils/zoneNameNormalizer');

const Schema = mongoose.Schema;

const IndustrialZoneSchema = new Schema({
  zone_id: { type: String, unique: true },
  zone_name: { type: String, required: true },
  zone_name_normalized: { type: String },
  zone_type: { type: String, enum: ['KCN', 'KCX'], required: true },
  location: { type: String, default: 'Chưa cập nhật' },
  location_normalized: { type: String },
  search_text: { type: String },
  established_year: { type: Number, default: null },
  status: { type: String, enum: ['active', 'off'], default: 'active' },
  managers_ids: [{ type: String }],
  image_url: { type: String },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String },
  deleted_at: { type: Date },
  deleted_by: { type: String },
});

IndustrialZoneSchema.pre('save', async function preSave(next) {
  if (this.isNew && !this.zone_id) {
    if (!this.zone_type) {
      throw new Error('zone_type is required to generate zone_id');
    }

    const type = this.zone_type.toLowerCase();
    this.zone_id = await generateId(type, this.zone_type);
  }

  this.zone_name_normalized = normalizeZoneNameForCompare(this.zone_name);
  this.location_normalized = normalizeZoneSearchText(this.location || '');
  this.search_text = normalizeZoneSearchText([
    this.zone_id,
    this.zone_name,
    this.zone_type,
    this.location,
  ].filter(Boolean).join(' '));

  next();
});

IndustrialZoneSchema.index({ zone_id: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ zone_name: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ zone_name_normalized: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ location_normalized: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ search_text: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ zone_type: 1, deleted_at: 1 });
IndustrialZoneSchema.index({ status: 1, deleted_at: 1 });

module.exports = mongoose.model('IndustrialZone', IndustrialZoneSchema);
