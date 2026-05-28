const resoureceAndWasteRepository = require('../dataAccess/resoureceAndWasteRepository');
const emissionRepository = require('../dataAccess/emissionRepository');
const summaryRecordRepository = require('../dataAccess/summaryRecordRepository');
const emissionModel = require('../models/emissionModel');
const { WASTE_GROUP_MAP } = require('../constantField/resourceMappings');
const {
    normalizeChemicalUnit, calculateCO2Emission, buildCombustionEmissionKey,
} = require('../utils/resourceHelpers');

// ONE-WAY dependency: recalculate → crud (NEVER the reverse)
const { processGetListDataResource } = require('./resourceCrudService');

const recalculateSummaryRecord = async (company_id, zone_id, role, periodKey, session) => {
    const dataResources = await processGetListDataResource(periodKey, null, [1, 2, 3, 4, 5, 6], role, company_id, zone_id, true, session);

    const summaryData = summaryRecordRepository.createEmptySummaryData();
    const emissionsToUpsert = [];

    for (const [modelName, items] of Object.entries(dataResources)) {
        for (const item of items) {
            const mainGroup = item.main_group;
            const subGroup = item.sub_group;
            const value = Number(item.quantity) || 0;
            if (value <= 0) continue;

            if (modelName === 'InputResource') {
                if (mainGroup === 'material') {
                    const key = `total_materials_${subGroup}`;
                    if (typeof summaryData.input_materials[key] !== 'undefined') {
                        summaryData.input_materials[key] += value;
                    } else {
                        summaryData.input_materials.total_materials_MOTH += value;
                    }
                    summaryData.input_materials.total_materials += value;
                } else if (mainGroup === 'chemical') {
                    const unit = normalizeChemicalUnit(item.unit);
                    const perKey = `total_chemicals_${subGroup}_${unit}`;
                    if (typeof summaryData.input_chemicals[perKey] !== 'undefined') {
                        summaryData.input_chemicals[perKey] += value;
                    } else {
                        summaryData.input_chemicals[`total_chemicals_CHOT_${unit}`] = (summaryData.input_chemicals[`total_chemicals_CHOT_${unit}`] || 0) + value;
                    }
                    if (unit === 'kg') {
                        summaryData.input_chemicals.total_chemicals_kg += value;
                        const rawUnit = (item.unit || 'Kg').trim();
                        if (rawUnit.toLowerCase() === 'tấn' || rawUnit.toLowerCase() === 'tan') {
                            summaryData.input_chemicals.unit_chemical_kg = 'Tấn';
                        }
                    }
                    else if (unit === 'l') summaryData.input_chemicals.total_chemicals_l += value;
                    else if (unit === 'm3') summaryData.input_chemicals.total_chemicals_m3 += value;
                }
            } else if (modelName === 'FuelResource') {
                const emissionCO2 = calculateCO2Emission(value, item.fuelName || '', item.sub_group || '', item.unit || 'tấn');
                if (mainGroup === 'el') {
                    if (subGroup === 'Grid') {
                        summaryData.fuels.total_electricity_grid += value;
                        summaryData.emissions.total_co2_from_grid_electricity += emissionCO2;
                    } else if (subGroup === 'Renewable') {
                        summaryData.fuels.total_electricity_renewable += value;
                    }
                    summaryData.fuels.total_electricity += value;
                } else if (mainGroup === 'wa') {
                    const fuelKey = `total_water_${subGroup}`;
                    if (typeof summaryData.fuels[fuelKey] !== 'undefined') {
                        summaryData.fuels[fuelKey] += value;
                    }
                    summaryData.fuels.total_water += value;
                    summaryData.emissions.total_co2_from_water += emissionCO2;
                } else if (mainGroup === 'co') {
                    const fuelKey = `total_combustion_${subGroup}`;
                    if (typeof summaryData.fuels[fuelKey] !== 'undefined') {
                        summaryData.fuels[fuelKey] += value;
                    }
                    summaryData.fuels.total_combustion += value;

                    const targetKey = buildCombustionEmissionKey(item.fuelName, subGroup);
                    if (targetKey) summaryData.emissions[targetKey] += emissionCO2;
                }
                summaryData.emissions.total_co2 += emissionCO2;
                emissionsToUpsert.push({
                    emission_name: item.fuelName, quantity: emissionCO2,
                    company_id, zone_id, periodKey,
                });
            } else if (modelName === 'WasteResource') {
                const wasteCode = WASTE_GROUP_MAP[mainGroup?.toLowerCase()] || mainGroup;
                switch (wasteCode) {
                    case 'DO':
                        summaryData.waste.total_waste_tan += value;
                        summaryData.waste.total_waste_DO += value;
                        break;
                    case 'IND':
                        summaryData.waste.total_waste_tan += value;
                        summaryData.waste.total_waste_IND += value;
                        break;
                    case 'HA':
                        summaryData.waste.total_waste_tan += value;
                        summaryData.waste.total_waste_HA += value;
                        break;
                    case 'WWA':
                        summaryData.waste.total_waste_m3 += value;
                        summaryData.waste.total_waste_WWA += value;
                        break;
                    case 'GASW':
                        summaryData.waste.unit_gas_waste = 'mg/l';
                        summaryData.waste.total_waste_tan += value;
                        summaryData.waste.total_waste_GASW += value;
                        break;
                }
            }
        }
    }

    await summaryRecordRepository.updateSummaryRecord(company_id, zone_id, periodKey, summaryData, session);

    if (emissionsToUpsert.length > 0) {
        await Promise.all(emissionsToUpsert.map(e =>
            emissionRepository.insertEmission(e.emission_name, e.quantity, e.company_id, e.zone_id, e.periodKey, session)
        ));
    }

    const currentEmissionNames = emissionsToUpsert.map(e => `CO2 từ ${e.emission_name}`);
    if (currentEmissionNames.length > 0) {
        await emissionModel.deleteMany(
            {
                company_id, zone_id, periodKey,
                emission_name: { $nin: currentEmissionNames }
            },
            { session }
        );
    }

    return true;
};

module.exports = { recalculateSummaryRecord };
