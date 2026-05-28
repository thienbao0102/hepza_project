const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const EmissionSchema = new Schema({
    emission_id: { type: String, unique: true },
    emission_name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "Tấn CO₂tđ" },

    company_id: { type: String, required: true },
    zone_id: { type: String, required: true },
    periodKey: { type: Number, required: true },// năm + tháng: 2023 + 2 = 202302

    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

EmissionSchema.index({ company_id: 1, zone_id: 1, periodKey: 1 });
EmissionSchema.index({ zone_id: 1, periodKey: 1 });

EmissionSchema.pre('save', async function (next) {
    if (this.isNew && !this.emission_id) {
        this.emission_id = await generateId('emission', 'EM'); // Tạo ID như EF001
    }
    next();
});

module.exports = mongoose.model('Emission', EmissionSchema);