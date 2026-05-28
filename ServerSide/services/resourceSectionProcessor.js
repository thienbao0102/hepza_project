const resoureceAndWasteRepository = require('../dataAccess/resoureceAndWasteRepository');
const emissionRepository = require('../dataAccess/emissionRepository');
const { getCode } = require('../utils/abbreviationInMemory');

const {
    normalizeString, pickChangedFields,
    calculateCO2Emission, groupWaterData,
    normalizeChemicalUnit, mapToSubGroup, buildCombustionEmissionKey,
} = require('../utils/resourceHelpers');

// ============================================================================
//  SECTION_CONFIG — defines how each resource type is processed
// ============================================================================

const SECTION_CONFIG = {
    'Nguyên vật liệu': {
        getMainGroup: () => getCode('Nguyên vật liệu'),
        insertFn: 'insertInputResource',
        resourceType: 'InputResource',
        groupLabel: 'Nguyên vật liệu',
        iterateMode: 'subgroup',
        needsSubGroupCode: true,
        updateSummary: (summaryData, value, subGroupCode) => {
            const key = `total_materials_${subGroupCode}`;
            if (typeof summaryData.input_materials[key] !== 'undefined') {
                summaryData.input_materials[key] += value;
            } else {
                summaryData.input_materials.total_materials_MOTH += value;
            }
            summaryData.input_materials.total_materials += value;
        },
    },
    'Hóa chất': {
        getMainGroup: () => getCode('Hóa chất'),
        insertFn: 'insertInputResource',
        resourceType: 'InputResource',
        groupLabel: 'Hóa chất',
        iterateMode: 'subgroup',
        needsSubGroupCode: true,
        preprocessItem: (item) => {
            return { ...item, _normalizedUnit: normalizeChemicalUnit(item.unit) };
        },
        updateSummary: (summaryData, value, subGroupCode, item) => {
            const unit = item._normalizedUnit || 'kg';
            const perKey = `total_chemicals_${subGroupCode}_${unit}`;
            if (typeof summaryData.input_chemicals[perKey] !== 'undefined') {
                summaryData.input_chemicals[perKey] += value;
            } else {
                summaryData.input_chemicals[`total_chemicals_CHOT_${unit}`] = (summaryData.input_chemicals[`total_chemicals_CHOT_${unit}`] || 0) + value;
            }
            if (unit === 'kg') summaryData.input_chemicals.total_chemicals_kg += value;
            else if (unit === 'l') summaryData.input_chemicals.total_chemicals_l += value;
            else if (unit === 'm3') summaryData.input_chemicals.total_chemicals_m3 += value;
        },
    },
    'Điện': {
        getMainGroup: () => getCode('Điện'),
        insertFn: 'insertFuelResource',
        resourceType: 'FuelResource',
        groupLabel: 'Điện',
        iterateMode: 'subgroup',
        needsSubGroupCode: true,
        updateSummary: (summaryData, value, subGroupCode) => {
            summaryData.fuels.total_electricity += value;
            if (subGroupCode === 'Grid') summaryData.fuels.total_electricity_grid += value;
            else if (subGroupCode === 'Renewable') summaryData.fuels.total_electricity_renewable += value;
        },
        emissionHandler: (summaryData, co2, subGroupCode) => {
            summaryData.emissions.total_co2 += co2;
            if (subGroupCode === 'Grid') {
                summaryData.emissions.total_co2_from_grid_electricity += co2;
            }
        },
        needsEmission: true,
    },
    'Nước': {
        getMainGroup: () => getCode('Nước'),
        insertFn: 'insertFuelResource',
        resourceType: 'FuelResource',
        groupLabel: 'Nước',
        iterateMode: 'preprocessed',
        preprocessData: (rawData) => groupWaterData(rawData),
        buildPayload: (item) => ({
            _id: item._id, label: item.label, unit: item.unit,
            value: item.total, note: item.note || ''
        }),
        getSubGroupCode: (mainGroup, item) => mapToSubGroup(mainGroup, null, item.label),
        updateSummary: (summaryData, value, subGroupCode) => {
            const fuelKey = `total_water_${subGroupCode}`;
            if (typeof summaryData.fuels[fuelKey] !== 'undefined') summaryData.fuels[fuelKey] += value;
            summaryData.fuels.total_water += value;
        },
        emissionHandler: (summaryData, co2, subGroupCode) => {
            summaryData.emissions.total_co2_from_water += co2;
            summaryData.emissions.total_co2 += co2;
        },
        needsEmission: true,
    },
    'Chất đốt & Nhiên liệu': {
        getMainGroup: () => getCode('Chất đốt & Nhiên liệu'),
        insertFn: 'insertFuelResource',
        resourceType: 'FuelResource',
        groupLabel: 'Nhiên liệu',
        iterateMode: 'subgroup',
        needsSubGroupCode: true,
        updateSummary: (summaryData, value, subGroupCode) => {
            const fuelKey = `total_combustion_${subGroupCode}`;
            if (typeof summaryData.fuels[fuelKey] !== 'undefined') summaryData.fuels[fuelKey] += value;
            else summaryData.fuels.total_combustion += value;
            summaryData.fuels.total_combustion += value;
        },
        emissionHandler: (summaryData, co2, subGroupCode, item) => {
            const targetKey = buildCombustionEmissionKey(item.label, subGroupCode);
            if (targetKey) summaryData.emissions[targetKey] += co2;
            summaryData.emissions.total_co2 += co2;
        },
        needsEmission: true,
        emissionOnlyWhenMonthHasData: true,
    },
    'Chất thải': {
        getMainGroup: () => getCode('Chất thải'),
        insertFn: 'insertWasteResource',
        resourceType: 'WasteResource',
        groupLabel: 'Chất thải',
        iterateMode: 'subgroup-as-maingroup',
        updateSummary: (summaryData, value, mainGroup) => {
            switch (mainGroup) {
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
        },
    },
};

// ============================================================================
//  GENERIC processSection — replaces 6 individual processXxxSection functions
// ============================================================================

async function processSection(sectionName, rawData, ctx) {
    if (!rawData) return;

    const config = SECTION_CONFIG[sectionName];
    if (!config) return;

    const mainGroup = config.getMainGroup();
    const { company_id, zone_id, periodKey, session, summaryData, txChanges, monthHasData, createdFuelIds } = ctx;

    if (config.iterateMode === 'preprocessed') {
        const items = config.preprocessData(rawData);

        for (const item of items) {
            const subGroupCode = config.getSubGroupCode(mainGroup, item);
            const payload = config.buildPayload(item);
            const value = Number(payload.value) || 0;
            if (value <= 0 && !payload._id) continue;

            const { doc, oldObj, newObj, actionType } = await resoureceAndWasteRepository[config.insertFn](
                payload, company_id, zone_id, periodKey, mainGroup, subGroupCode, session
            );

            if (monthHasData) {
                const { oldData, newData } = pickChangedFields(oldObj, newObj, config.resourceType);
                txChanges.push({
                    resourceType: config.resourceType, resourceId: doc._id,
                    oldObj: oldData, newObj: newData, company_id, zone_id, periodKey,
                    actionType, groupLabel: config.groupLabel
                });
            }

            if (createdFuelIds && (sectionName === 'Điện' || sectionName === 'Nước')) {
                createdFuelIds.push({ _id: doc._id, sub_group: item.sub_group || subGroupCode, main_group: mainGroup });
            }

            config.updateSummary(summaryData, value, subGroupCode);

            if (config.needsEmission) {
                const co2 = calculateCO2Emission(value, payload.label || '', subGroupCode || '', item.unit || 'tấn');
                if (co2 > 0) {
                    await emissionRepository.insertEmission(
                        payload.label, co2, company_id, zone_id, periodKey, session
                    );
                    config.emissionHandler(summaryData, co2, subGroupCode, item);
                }
            }
        }
    } else if (config.iterateMode === 'subgroup-as-maingroup') {
        const mainGroupLabel = mainGroup;

        for (const [categoryName, items] of Object.entries(rawData)) {
            if (!Array.isArray(items) || items.length === 0) continue;

            const wasteMainGroup = mapToSubGroup(mainGroupLabel, categoryName);
            if (!wasteMainGroup) continue;

            for (const item of items) {
                const value = Number(item.value) || 0;
                if (value <= 0 && !item._id) continue;

                const { doc, oldObj, newObj, actionType } = await resoureceAndWasteRepository.insertWasteResource(
                    item, company_id, zone_id, periodKey, wasteMainGroup, session
                );

                if (monthHasData) {
                    const { oldData, newData } = pickChangedFields(oldObj, newObj, config.resourceType);
                    txChanges.push({
                        resourceType: config.resourceType, resourceId: doc._id,
                        oldObj: oldData, newObj: newData, company_id, zone_id, periodKey,
                        actionType, groupLabel: config.groupLabel
                    });
                }

                if (ctx.createdWasteIds && sectionName === 'Chất thải') {
                    ctx.createdWasteIds.push({
                        _id: doc._id,
                        waste_main_group: wasteMainGroup,
                        source_name: item.wasteName || '(Không tên)',
                        clientRowId: item.clientRowId || null,
                    });
                }

                config.updateSummary(summaryData, value, wasteMainGroup);
            }
        }
    } else {
        for (const [subGroupName, items] of Object.entries(rawData)) {
            if (!Array.isArray(items) || items.length === 0) continue;

            const subGroupCode = mapToSubGroup(mainGroup, subGroupName);

            for (let item of items) {
                if (config.preprocessItem) item = config.preprocessItem(item);

                const value = Number(item.value) || 0;
                if (value <= 0 && !item._id) continue;

                const { doc, oldObj, newObj, actionType } = await resoureceAndWasteRepository[config.insertFn](
                    item, company_id, zone_id, periodKey, mainGroup, subGroupCode, session
                );

                if (monthHasData) {
                    const { oldData, newData } = pickChangedFields(oldObj, newObj, config.resourceType);
                    txChanges.push({
                        resourceType: config.resourceType, resourceId: doc._id,
                        oldObj: oldData, newObj: newData, company_id, zone_id, periodKey,
                        actionType, groupLabel: config.groupLabel
                    });
                }

                if (ctx.createdFuelIds && (sectionName === 'Điện' || sectionName === 'Nước' || sectionName === 'Chất đốt & Nhiên liệu')) {
                    ctx.createdFuelIds.push({ _id: doc._id, sub_group: item.sub_group || subGroupCode, main_group: mainGroup });
                }

                if (config.needsEmission) {
                    const co2 = calculateCO2Emission(value, item.label || '', subGroupCode || '', item.unit || 'tấn');
                    if (co2 > 0) {
                        await emissionRepository.insertEmission(item.label, co2, company_id, zone_id, periodKey, session);
                        config.emissionHandler(summaryData, co2, subGroupCode, item);
                    }
                }

                config.updateSummary(summaryData, value, subGroupCode, item);
            }
        }
    }
}

module.exports = { processSection };
