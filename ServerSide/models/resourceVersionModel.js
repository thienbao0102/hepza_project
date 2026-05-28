const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResourceVersionSchema = new Schema({
  _id: { type: String },

  transactionId: { type: String, required: true, index: true }, // nhóm thay đổi cùng 1 hành động

  resourceType: { type: String, required: true },
  resourceId: { type: String, required: false },

  company_id: { type: String, ref: 'Company' },
  zone_id: { type: String, ref: 'IndustrialZone' },
  periodKey: { type: Number },

  // thông tin thay đổi
  changes: { type: Schema.Types.Mixed, default: null },
  oldData: { type: Schema.Types.Mixed, default: null },
  newData: { type: Schema.Types.Mixed, default: null },

  actionType: { type: String, enum: ['create', 'update', 'delete', 'init'], required: true },
  modifiedBy: { type: String, required: true },
  modifiedAt: { type: Date, default: Date.now },
  commitMessage: { type: String, default: '' },

  isDeleted: {type: Boolean, default: false}
}, { timestamps: true });

ResourceVersionSchema.index({ resourceId: 1, resourceType: 1, modifiedAt: -1 });
ResourceVersionSchema.index({ transactionId: 1, modifiedAt: -1 });
ResourceVersionSchema.index({ company_id: 1, zone_id: 1, periodKey: 1, modifiedAt: 1 });

module.exports = mongoose.model('ResourceVersion', ResourceVersionSchema);
