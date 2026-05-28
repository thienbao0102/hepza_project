const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const RegulationSchema = new Schema({
    regulation_id: { type: String }, // Ví dụ: RL0001
    regulation_name: { type: String, required: true },
    des_short: { type: String, default: "" },
    des_long: { type: String, default: "" },
    link: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: props => `"${props.value}" không phải là URL hợp lệ! URL phải bắt đầu bằng http:// hoặc https://`
        },
        default: ""
    },
    group_regulation: { type: String, enum: ["Nghị Định", "Thông Tư", "Quyết Định Và Chỉ Thị", "Khác"], required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Hashtag" }],
    effective_date: { type: Date, default: null },
}, { timestamps: true });

RegulationSchema.pre('save', async function (next) {
    if (this.isNew && !this.regulation_id) {
        this.regulation_id = await generateId('regulation', 'RL');
    }
    next();
});

RegulationSchema.index({ group_regulation: 1 });
RegulationSchema.index({ regulation_id: 1 });

module.exports = mongoose.model('Regulation', RegulationSchema);