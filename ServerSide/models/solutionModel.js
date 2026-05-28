const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const SolutionSchema = new Schema({
    solution_id: { type: String }, // Ví dụ: SL0001
    solution_name: { type: String, required: true },
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
    group_solution: { type: String, enum: ["QUẢN LÝ NGUYÊN VẬT LIỆU", "QUẢN LÝ HOÁ CHẤT", "QUẢN LÝ NĂNG LƯỢNG", "QUẢN LÝ NƯỚC"], required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Hashtag" }],
}, { timestamps: true });

SolutionSchema.pre('save', async function (next) {
    if (this.isNew && !this.solution_id) {
        this.solution_id = await generateId('solution', 'SL');
    }
    next();
});

SolutionSchema.index({ group_solution: 1 });
SolutionSchema.index({ solution_id: 1 });

module.exports = mongoose.model('Solution', SolutionSchema);