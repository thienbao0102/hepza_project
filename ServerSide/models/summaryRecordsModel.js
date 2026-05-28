const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const SummaryRecordSchema = new Schema({
    _id: { type: String },

    company_id: { type: String, required: true, ref: 'Company' },
    zone_id: { type: String, required: true, ref: 'IndustrialZone' },
    periodKey: { type: Number, required: true },// năm + tháng: 2023 + 2 = 202302

    //input
    input_materials: {
        unit_material: { type: String, default: "Tấn" },
        total_materials: { type: Number, min: 0, default: 0 },
        total_materials_MET: { type: Number, min: 0, default: 0 },
        total_materials_NMET: { type: Number, min: 0, default: 0 },
        total_materials_POL: { type: Number, min: 0, default: 0 },
        total_materials_WOOD: { type: Number, min: 0, default: 0 },
        total_materials_TEX: { type: Number, min: 0, default: 0 },
        total_materials_AGRI: { type: Number, min: 0, default: 0 },
        total_materials_PAC: { type: Number, min: 0, default: 0 },
        total_materials_MOTH: { type: Number, min: 0, default: 0 },
    },

    input_chemicals: {
        unit_chemical_kg: { type: String, default: "Kg" },
        unit_chemical_l: { type: String, default: "L" },
        unit_chemical_m3: { type: String, default: "m3" },

        total_chemicals_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_l: { type: Number, min: 0, default: 0 },
        total_chemicals_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_ACD_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_ACD_l: { type: Number, min: 0, default: 0 },
        total_chemicals_ACD_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_BAS_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_BAS_l: { type: Number, min: 0, default: 0 },
        total_chemicals_BAS_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_SLT_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_SLT_l: { type: Number, min: 0, default: 0 },
        total_chemicals_SLT_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_SOL_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_SOL_l: { type: Number, min: 0, default: 0 },
        total_chemicals_SOL_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_GAS_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_GAS_l: { type: Number, min: 0, default: 0 },
        total_chemicals_GAS_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_ADD_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_ADD_l: { type: Number, min: 0, default: 0 },
        total_chemicals_ADD_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_REDOX_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_REDOX_l: { type: Number, min: 0, default: 0 },
        total_chemicals_REDOX_m3: { type: Number, min: 0, default: 0 },

        total_chemicals_CHOT_kg: { type: Number, min: 0, default: 0 },
        total_chemicals_CHOT_l: { type: Number, min: 0, default: 0 },
        total_chemicals_CHOT_m3: { type: Number, min: 0, default: 0 },
    },

    //fuels
    fuels: {
        unit_fuel_el: { type: String, default: "KWH" },
        unit_fuel_co: { type: String, default: "Tấn" },
        unit_fuel_wa: { type: String, default: "m3" },
        //electricity
        total_electricity: { type: Number, min: 0, default: 0 },
        total_electricity_grid: { type: Number, min: 0, default: 0 },
        total_electricity_renewable: { type: Number, min: 0, default: 0 },

        //water
        total_water: { type: Number, min: 0, default: 0 },
        total_water_tap: { type: Number, min: 0, default: 0 },
        total_water_rain: { type: Number, min: 0, default: 0 },
        total_water_well: { type: Number, min: 0, default: 0 },
        total_water_recycle: { type: Number, min: 0, default: 0 },

        // Combustion
        total_combustion: { type: Number, min: 0, default: 0 },
        total_combustion_COL: { type: Number, min: 0, default: 0 },
        total_combustion_BIO: { type: Number, min: 0, default: 0 },
        total_combustion_PET: { type: Number, min: 0, default: 0 },
        total_combustion_GASF: { type: Number, min: 0, default: 0 },
        total_combustion_COTH: { type: Number, min: 0, default: 0 },
    },

    //waste
    waste: {
        unit_solid_and_gas_waste: { type: String, default: "Tấn" },
        unit_gas_waste: { type: String, default: "mg/l" },
        unit_water_waste: { type: String, default: "m3" },

        //total waste
        total_waste_tan: { type: Number, min: 0, default: 0 },
        total_waste_m3: { type: Number, min: 0, default: 0 },

        total_waste_DO: { type: Number, min: 0, default: 0 },
        total_waste_IND: { type: Number, min: 0, default: 0 },
        total_waste_HA: { type: Number, min: 0, default: 0 },
        total_waste_WWA: { type: Number, min: 0, default: 0 },
        total_waste_GASW: { type: Number, min: 0, default: 0 },
        // //water waste
        // total_water_waste: { type: Number, min: 0, default: 0 },
        // total_water_waste_DOW: { type: Number, min: 0, default: 0 },
        // total_water_waste_INDW: { type: Number, min: 0, default: 0 },
        // total_water_waste_HAW: { type: Number, min: 0, default: 0 },

        // //solid waste
        // total_solid_waste: { type: Number, min: 0, default: 0 },
        // total_solid_waste_DOS: { type: Number, min: 0, default: 0 },
        // total_solid_waste_INDS: { type: Number, min: 0, default: 0 },
        // total_solid_waste_HAS: { type: Number, min: 0, default: 0 },

        // //gas waste
        // total_gas_waste: { type: Number, min: 0, default: 0 },
        // total_gas_waste_GHG: { type: Number, min: 0, default: 0 },
        // total_gas_waste_APG: { type: Number, min: 0, default: 0 },
        // total_gas_waste_TOG: { type: Number, min: 0, default: 0 },
    },

    // Emissions
    emissions: {
        unit_co2: { type: String, default: "Tấn CO₂tđ" },

        total_co2: { type: Number, min: 0, default: 0 },

        // co2 from grid electricity
        total_co2_from_grid_electricity: { type: Number, min: 0, default: 0 },
        // co2 from water
        total_co2_from_water: { type: Number, min: 0, default: 0 },
        // co2 from DO oil
        total_co2_from_DO_oil: { type: Number, min: 0, default: 0 },
        //co2 from gasoline
        total_co2_from_gasoline: { type: Number, min: 0, default: 0 },
        //co2 from FO oil
        total_co2_from_FO_oil: { type: Number, min: 0, default: 0 },
        //co2 from biomass
        total_co2_from_biomass: { type: Number, min: 0, default: 0 },
        //co2 from charcoal
        total_co2_from_charcoal: { type: Number, min: 0, default: 0 },
        //co2 from natural gas
        total_co2_from_natural_gas: { type: Number, min: 0, default: 0 },
        //co2 from LPG
        total_co2_from_LPG: { type: Number, min: 0, default: 0 },

    },

    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

SummaryRecordSchema.pre('save', async function (next) {
    if (this.isNew && !this._id) {
        this._id = await generateId('summary', 'SR'); // Tạo ID như SR001
    }
    next();
});

//indexes
SummaryRecordSchema.index({ company_id: 1, periodKey: 1 });
SummaryRecordSchema.index({ zone_id: 1, company_id: 1, periodKey: 1 });
SummaryRecordSchema.index(
    { company_id: 1, zone_id: 1, periodKey: 1 },
    {
        unique: true,
        partialFilterExpression: { isDeleted: { $eq: false } },
    }
);
module.exports = mongoose.model('SummaryRecord', SummaryRecordSchema);