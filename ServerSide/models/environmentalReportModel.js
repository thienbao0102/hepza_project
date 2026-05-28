const mongoose = require('mongoose');

const environmentalReportSchema = new mongoose.Schema({
  company_id: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  file_name: { type: String, required: true },
  file_path: { type: String, default: null },
  file_url: { type: String, default: null },
  file_size: { type: Number, default: 0 },
  mime_type: { type: String, default: 'application/pdf' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

environmentalReportSchema.index({ company_id: 1, year: 1 });

module.exports = mongoose.model('EnvironmentalReport', environmentalReportSchema);
