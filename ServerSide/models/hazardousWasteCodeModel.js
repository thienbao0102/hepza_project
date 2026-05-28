const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HazardousWasteCodeSchema = new Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ecCode: { type: String, default: '' },
    baselA: { type: [String], default: [] },
    baselY: { type: String, default: '' },
    hazardCharacteristics: { type: [String], default: [] },
    status: { type: [String], default: [] },
    threshold: { type: String, default: '' },
    treatmentMethods: { type: [String], default: [] },
    hazardGroup: { type: String, default: '' },
    hazardCategory: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

HazardousWasteCodeSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('HazardousWasteCode', HazardousWasteCodeSchema);
