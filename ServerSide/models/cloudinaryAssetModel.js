const mongoose = require('mongoose');

const CloudinaryAssetSchema = new mongoose.Schema({
  asset_hash: { type: String, required: true, trim: true },
  resource_type: { type: String, enum: ['image', 'raw', 'video'], required: true },
  public_id: { type: String, required: true, trim: true, unique: true },
  secure_url: { type: String, required: true, trim: true },
  mime_type: { type: String, trim: true, default: null },
  extension: { type: String, trim: true, default: '' },
  bytes: { type: Number, default: 0 },
  logical_scopes: [{ type: String, trim: true }],
  last_seen_at: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

CloudinaryAssetSchema.index({ asset_hash: 1, resource_type: 1 }, { unique: true });
CloudinaryAssetSchema.index({ logical_scopes: 1 });

module.exports = mongoose.model('CloudinaryAsset', CloudinaryAssetSchema);
