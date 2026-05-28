const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const versionPlugin = require('../plugins/versionPlugin');
const Schema = mongoose.Schema;

const subgroupMapping = {
    material: ["MET", "NMET", "POL", "WOOD", "TEX", "AGRI", "PAC", "MOTH"], //
    chemical: ["ACD", "BAS", "SLT", "SOL", "GAS", "ADD", "REDOX", "CHOT", "HAZ"] //
}

const InputResourceSchema = new Schema({
    _id: { type: String },
    name: { type: String, required: true },
    quantity: { type: Number, min: 0, required: true, default: 0 },
    unit: { type: String, required: true, default: "Tấn" },
    note: { type: String },

    company_id: { type: String, required: true, ref: 'Company' },
    zone_id: { type: String, required: true, ref: 'IndustrialZone' },

    periodKey: { type: Number, required: true },// năm + tháng: 2023 + 2 = 202302

    main_group: { type: String, enum: Object.keys(subgroupMapping), required: true, ref: "Abbreviation" },
    sub_group: {
        type: String,
        validate: {
            validator: function (val) {
                // kiểm tra subgroup có thuộc mainGroup không
                return subgroupMapping[this.main_group]?.includes(val);
            },
            message: props => `${props.value} không hợp lệ với mainGroup ${props.instance.main_group}`
        },
        ref: "Abbreviation"
    },
    // MỨC NGUY HẠI
    hazardLevel: { type: String, default: null },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

InputResourceSchema.pre('save', async function (next) {
    if (this.isNew && !this._id) {
        this._id = await generateId('input', 'IR'); // Tạo ID như IR001
    }
    next();
});

InputResourceSchema.index({ company_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
InputResourceSchema.index({ zone_id: 1, main_group: 1, sub_group: 1, periodKey: 1 });
InputResourceSchema.index({ main_group: 1, sub_group: 1, periodKey: 1 });
InputResourceSchema.index({ company_id: 1, periodKey: 1, isDeleted: 1 });

module.exports = mongoose.model('InputResource', InputResourceSchema);