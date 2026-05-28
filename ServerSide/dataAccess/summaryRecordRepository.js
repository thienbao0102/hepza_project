const SummaryRecord = require('../models/summaryRecordsModel');
const Company = require('../models/companyModel');
const mongoose = require('mongoose');
require('dotenv').config();

const buildActiveSummaryFilter = (company_id, zone_id, periodKey) => ({
    company_id,
    zone_id,
    periodKey,
    isDeleted: { $ne: true },
});

// Repository to get summary record by period and aggregate by zone_id
// *note: cần tối ưu về hiệu suất và bộ nhớ khi dữ liệu lớn: để làm sau
const getSummaryRecordAggregate = async (company_id, zone_id, periodKeyStart, periodKeyEnd, include = [1], aggregateByMonth = false) => {
    const groupStage = {};
    const projectStage = {};

    if (aggregateByMonth) {
        groupStage.company_id = { $first: "$company_id" };
        groupStage.zone_id = { $first: "$zone_id" };
        projectStage.company_id = 1;
        projectStage.zone_id = 1;
    }

    // Nếu mảng include chứa 1 hoặc tất cả nhóm
    if (include.includes(1) || include.includes(2)) {
        Object.assign(groupStage, getInputMaterialGroupStage());
        Object.assign(projectStage, getInputMaterialProjectStage());
    }

    if (include.includes(1) || include.includes(3)) {
        Object.assign(groupStage, getInputChemicalGroupStage());
        Object.assign(projectStage, getInputChemicalProjectStage());
    }

    if (include.includes(1) || include.includes(4)) {
        Object.assign(groupStage, getFuelGroupStage());
        Object.assign(projectStage, getFuelProjectStage());
    }

    if (include.includes(1) || include.includes(5)) {
        Object.assign(groupStage, getWasteGroupStage());
        Object.assign(projectStage, getWasteProjectStage());
    }

    if (include.includes(1) || include.includes(6)) {
        Object.assign(groupStage, getEmissionGroupStage());
        Object.assign(projectStage, getEmissionProjectStage());
    }

    const { matchStage, groupId, project } = buildMatchGroupProject({ company_id, zone_id, periodKeyStart, periodKeyEnd, projectStage, aggregateByMonth });

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: groupId,
                ...groupStage
            }
        },
        { $project: project },
    ];

    if (aggregateByMonth) {
        pipeline.push(
            // Join company
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "company_id",
                    as: "company"
                }
            },
            // Join zone
            {
                $lookup: {
                    from: "industrialzones",
                    localField: "zone_id",
                    foreignField: "zone_id",
                    as: "zone"
                }
            },
            // Add company & zone names, remove ids and temp arrays
            {
                $addFields: {
                    name_company: { $arrayElemAt: ["$company.company_name", 0] },
                    name_zone: { $arrayElemAt: ["$zone.zone_name", 0] },
                }
            },
            {
                $project: {
                    company: 0,
                    zone: 0,
                    company_id: 0,
                    zone_id: 0
                }
            },
            { $sort: { periodKey: 1 } }
        );
    }


    return await SummaryRecord.aggregate(pipeline);
    // const explain = await mongoose.connection.db.command({
    //     explain: {
    //         aggregate: "summaryrecords",
    //         pipeline: pipeline,
    //         cursor: {}
    //     },
    //     verbosity: "executionStats"
    // });

    // console.log(JSON.stringify({
    //     winningPlan: explain.stages?.[0]?.$cursor?.queryPlanner?.winningPlan,
    //     // usedIndexes: explain.stages?.[0]?.$cursor?.queryPlanner?.winningPlan?.inputStage?.indexName,
    //     executionStats: explain.stages?.[0]?.$cursor?.executionStats
    // }, null, 2));
    // return explain;
};
//  CẬP NHẬT SUMMARY
const updateSummaryRecord = async (company_id, zone_id, periodKey, summaryData, session) => {
    const filter = { company_id, zone_id, periodKey };
    let summaryRecord = await SummaryRecord.findOne(filter).session(session);

    // Nếu chưa có -> tạo mới với cấu trúc mặc định
    if (!summaryRecord) {
        // console.log(`Chưa có summaryRecord cho ${company_id}-${zone_id}-${periodKey}, tạo mới...`);

        // Khởi tạo object mặc định với toàn bộ field = 0
        const newSummary = {
            company_id,
            zone_id,
            periodKey,
            ...createEmptySummaryData(), // hàm này trả về cấu trúc chuẩn có default = 0
        };

        summaryRecord = await SummaryRecord.create([newSummary], { session });
    }

    // Cập nhật dữ liệu (ghi đè giá trị mới)
    const updateFields = {};
    for (const [groupName, groupData] of Object.entries(summaryData)) {
        for (const [key, value] of Object.entries(groupData)) {
            if (typeof value === 'number' || typeof value === 'string') {
                updateFields[`${groupName}.${key}`] = value;
            }
        }
    }

    // Nếu không có gì để update thì bỏ qua
    if (Object.keys(updateFields).length === 0) {
        // console.log('Không có field nào cần update trong summaryData');
        return summaryRecord;
    }

    // Tiến hành ghi đè (thay vì cộng dồn $inc)
    const update = { $set: updateFields };
    const options = { session };

    return await SummaryRecord.updateOne(filter, update, options);
};
// Tạo bản ghi claim cho tháng để khóa đồng thời khi tạo mới
const claimSummaryRecord = async (company_id, zone_id, periodKey, session) => {
    const newSummary = {
        company_id,
        zone_id,
        periodKey,
        ...createEmptySummaryData(),
    };

    const [summaryRecord] = await SummaryRecord.create([newSummary], { session });
    return summaryRecord;
};
// kiểm tra đã có bảng ghi của tháng này chưa
const checkSummaryExists = async (company_id, zone_id, periodKey, session = null) => {
    const query = SummaryRecord.findOne(buildActiveSummaryFilter(company_id, zone_id, periodKey));
    if (session) query.session(session);
    const existing = await query.lean();

    return !!existing;
};

const getActiveSummaryRecord = async (company_id, zone_id, periodKey, session = null) => {
    const query = SummaryRecord.findOne(buildActiveSummaryFilter(company_id, zone_id, periodKey));
    if (session) query.session(session);
    return query.lean();
};

const claimSummaryVersion = async (company_id, zone_id, periodKey, expectedVersion, session = null) => {
    const query = SummaryRecord.findOneAndUpdate(
        {
            ...buildActiveSummaryFilter(company_id, zone_id, periodKey),
            __v: expectedVersion,
        },
        { $inc: { __v: 1 } },
        {
            new: false,
            session,
        }
    );

    return query.lean();
};
// === Tạo object mặc định với toàn bộ field = 0 ====
const createEmptySummaryData = () => ({
    // INPUT MATERIALS
    input_materials: {
        unit_material: "Tấn",
        total_materials: 0,
        total_materials_MET: 0,
        total_materials_NMET: 0,
        total_materials_POL: 0,
        total_materials_WOOD: 0,
        total_materials_TEX: 0,
        total_materials_AGRI: 0,
        total_materials_PAC: 0,
        total_materials_MOTH: 0,
    },

    // INPUT CHEMICALS
    input_chemicals: {
        unit_chemical_kg: "Kg",
        unit_chemical_l: "L",
        unit_chemical_m3: "m3",

        total_chemicals_kg: 0,
        total_chemicals_l: 0,
        total_chemicals_m3: 0,

        total_chemicals_ACD_kg: 0,
        total_chemicals_ACD_l: 0,
        total_chemicals_ACD_m3: 0,

        total_chemicals_BAS_kg: 0,
        total_chemicals_BAS_l: 0,
        total_chemicals_BAS_m3: 0,

        total_chemicals_SLT_kg: 0,
        total_chemicals_SLT_l: 0,
        total_chemicals_SLT_m3: 0,

        total_chemicals_SOL_kg: 0,
        total_chemicals_SOL_l: 0,
        total_chemicals_SOL_m3: 0,

        total_chemicals_GAS_kg: 0,
        total_chemicals_GAS_l: 0,
        total_chemicals_GAS_m3: 0,

        total_chemicals_ADD_kg: 0,
        total_chemicals_ADD_l: 0,
        total_chemicals_ADD_m3: 0,

        total_chemicals_REDOX_kg: 0,
        total_chemicals_REDOX_l: 0,
        total_chemicals_REDOX_m3: 0,

        total_chemicals_CHOT_kg: 0,
        total_chemicals_CHOT_l: 0,
        total_chemicals_CHOT_m3: 0,
    },

    // FUELS
    fuels: {
        unit_fuel_el: "KWH",
        unit_fuel_co: "Tấn",
        unit_fuel_wa: "m3",

        total_electricity: 0,
        total_electricity_grid: 0,
        total_electricity_renewable: 0,

        total_water: 0,
        total_water_tap: 0,
        total_water_rain: 0,
        total_water_well: 0,
        total_water_recycle: 0,

        total_combustion: 0,
        total_combustion_COL: 0,
        total_combustion_BIO: 0,
        total_combustion_PET: 0,
        total_combustion_GASF: 0,
        total_combustion_COTH: 0,
    },

    // WASTE
    waste: {
        unit_solid_and_gas_waste: "Tấn",
        unit_gas_waste: "mg/l",
        unit_water_waste: "m3",

        total_waste_tan: 0,
        total_waste_m3: 0,
        total_waste_DO: 0,

        total_waste_IND: 0,
        total_waste_HA: 0,
        total_waste_WWA: 0,
        total_waste_GASW: 0,
    },

    // EMISSIONS
    emissions: {
        unit_co2: "Tấn CO₂tđ",
        total_co2: 0,
        total_co2_from_grid_electricity: 0,
        total_co2_from_water: 0,
        total_co2_from_DO_oil: 0,
        total_co2_from_gasoline: 0,
        total_co2_from_FO_oil: 0,
        total_co2_from_biomass: 0,
        total_co2_from_charcoal: 0,
        total_co2_from_natural_gas: 0,
        total_co2_from_LPG: 0,
    },
});
// lấy danh sách company_id đã khai báo trong tháng
const getDistinctCompanyIdsByPeriod = async (periodKey, resourceCategory = null) => {
    const query = { periodKey, isDeleted: { $ne: true } };

    if (resourceCategory) {
        switch (resourceCategory) {
            case 'materials':
                query["input_materials.total_materials"] = { $gt: 0 };
                break;
            case 'chemicals':
                query.$or = [
                    { "input_chemicals.total_chemicals_kg": { $gt: 0 } },
                    { "input_chemicals.total_chemicals_l": { $gt: 0 } },
                    { "input_chemicals.total_chemicals_m3": { $gt: 0 } }
                ];
                break;
            case 'electricity':
                query["fuels.total_electricity"] = { $gt: 0 };
                break;
            case 'water':
                query["fuels.total_water"] = { $gt: 0 };
                break;
            case 'combustion':
            case 'fuels':
                query["fuels.total_combustion"] = { $gt: 0 };
                break;
            case 'waste':
                query.$or = [
                    { "waste.total_waste_tan": { $gt: 0 } },
                    { "waste.total_waste_m3": { $gt: 0 } }
                ];
                break;
            case 'emissions':
                query["emissions.total_co2"] = { $gt: 0 };
                break;
        }
    }

    return await SummaryRecord.distinct("company_id", query);
};
//lấy danh sách company_id chưa khai báo trong tháng
const getMissingCompanyIdsByPeriod = async (periodKey) => {
    const allCompanyIds = await Company.find({ isDeleted: { $ne: true } }).distinct("company_id").lean();
    const existingCompanyIds = await getDistinctCompanyIdsByPeriod(periodKey);

    const missingCompanyIds = allCompanyIds.filter(id => !existingCompanyIds.includes(id));
    return missingCompanyIds;
};
//soft delete summary records by company_id
const deleteSoftSummaryRecords = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await SummaryRecord.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false }
            ]
        },
        {
            $set: {
                isDeleted: true,
            }
        },
        options
    );
};
//hard delete summary records by company_id
const deleteHardSummaryRecords = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await SummaryRecord.deleteMany({ company_id }, options);
}
//restore summary records by company_id
const restoreSummaryRecords = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return await SummaryRecord.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: true } },
                { isDeleted: true }
            ]
        },
        {
            $set: {
                isDeleted: false,
            }
        },
        options
    );
}

// Hàm tiện ích (wrapper) để chạy generic aggregate pipeline trên collection SummaryRecord
const aggregate = async (pipeline) => {
    return await SummaryRecord.aggregate(pipeline).allowDiskUse(true);
};

module.exports = {
    getSummaryRecordAggregate,
    updateSummaryRecord,
    claimSummaryRecord,
    checkSummaryExists,
    getActiveSummaryRecord,
    claimSummaryVersion,
    createEmptySummaryData,
    getDistinctCompanyIdsByPeriod,
    getMissingCompanyIdsByPeriod,
    deleteSoftSummaryRecords,
    deleteHardSummaryRecords,
    restoreSummaryRecords,
    aggregate,
};

//============================ Helpers ====================================

// ===== Nhóm 1: NGUYÊN LIỆU =====
const getInputMaterialGroupStage = () => ({
    total_materials: { $sum: "$input_materials.total_materials" },
    total_materials_MET: { $sum: "$input_materials.total_materials_MET" },
    total_materials_NMET: { $sum: "$input_materials.total_materials_NMET" },
    total_materials_POL: { $sum: "$input_materials.total_materials_POL" },
    total_materials_WOOD: { $sum: "$input_materials.total_materials_WOOD" },
    total_materials_TEX: { $sum: "$input_materials.total_materials_TEX" },
    total_materials_AGRI: { $sum: "$input_materials.total_materials_AGRI" },
    total_materials_PAC: { $sum: "$input_materials.total_materials_PAC" },
    total_materials_MOTH: { $sum: "$input_materials.total_materials_MOTH" },

    unit_material: { $first: "$input_materials.unit_material" },

    count_materials: { $sum: { $cond: [{ $gt: ["$input_materials.total_materials", 0] }, 1, 0] } },
});
// ===== Nhóm 1: HÓA CHẤT =====
const getInputChemicalGroupStage = () => ({
    total_chemicals_kg: { $sum: "$input_chemicals.total_chemicals_kg" },
    total_chemicals_l: { $sum: "$input_chemicals.total_chemicals_l" },
    total_chemicals_m3: { $sum: "$input_chemicals.total_chemicals_m3" },

    total_chemicals_ACD_kg: { $sum: "$input_chemicals.total_chemicals_ACD_kg" },
    total_chemicals_ACD_l: { $sum: "$input_chemicals.total_chemicals_ACD_l" },
    total_chemicals_ACD_m3: { $sum: "$input_chemicals.total_chemicals_ACD_m3" },

    total_chemicals_BAS_kg: { $sum: "$input_chemicals.total_chemicals_BAS_kg" },
    total_chemicals_BAS_l: { $sum: "$input_chemicals.total_chemicals_BAS_l" },
    total_chemicals_BAS_m3: { $sum: "$input_chemicals.total_chemicals_BAS_m3" },

    total_chemicals_SLT_kg: { $sum: "$input_chemicals.total_chemicals_SLT_kg" },
    total_chemicals_SLT_l: { $sum: "$input_chemicals.total_chemicals_SLT_l" },
    total_chemicals_SLT_m3: { $sum: "$input_chemicals.total_chemicals_SLT_m3" },

    total_chemicals_SOL_kg: { $sum: "$input_chemicals.total_chemicals_SOL_kg" },
    total_chemicals_SOL_l: { $sum: "$input_chemicals.total_chemicals_SOL_l" },
    total_chemicals_SOL_m3: { $sum: "$input_chemicals.total_chemicals_SOL_m3" },

    total_chemicals_GAS_kg: { $sum: "$input_chemicals.total_chemicals_GAS_kg" },
    total_chemicals_GAS_l: { $sum: "$input_chemicals.total_chemicals_GAS_l" },
    total_chemicals_GAS_m3: { $sum: "$input_chemicals.total_chemicals_GAS_m3" },

    total_chemicals_ADD_kg: { $sum: "$input_chemicals.total_chemicals_ADD_kg" },
    total_chemicals_ADD_l: { $sum: "$input_chemicals.total_chemicals_ADD_l" },
    total_chemicals_ADD_m3: { $sum: "$input_chemicals.total_chemicals_ADD_m3" },

    total_chemicals_REDOX_kg: { $sum: "$input_chemicals.total_chemicals_REDOX_kg" },
    total_chemicals_REDOX_l: { $sum: "$input_chemicals.total_chemicals_REDOX_l" },
    total_chemicals_REDOX_m3: { $sum: "$input_chemicals.total_chemicals_REDOX_m3" },

    total_chemicals_CHOT_kg: { $sum: "$input_chemicals.total_chemicals_CHOT_kg" },
    total_chemicals_CHOT_l: { $sum: "$input_chemicals.total_chemicals_CHOT_l" },
    total_chemicals_CHOT_m3: { $sum: "$input_chemicals.total_chemicals_CHOT_m3" },

    unit_chemical_kg: { $first: "$input_chemicals.unit_chemical_kg" },
    unit_chemical_l: { $first: "$input_chemicals.unit_chemical_l" },
    unit_chemical_m3: { $first: "$input_chemicals.unit_chemical_m3" },

    count_chemicals: { $sum: { $cond: [{ $or: [{ $gt: ["$input_chemicals.total_chemicals_kg", 0] }, { $gt: ["$input_chemicals.total_chemicals_l", 0] }, { $gt: ["$input_chemicals.total_chemicals_m3", 0] }] }, 1, 0] } },
});
// ===== Nhóm 2: FUELS =====
const getFuelGroupStage = () => ({
    // Electricity
    total_electricity: { $sum: "$fuels.total_electricity" },
    total_electricity_grid: { $sum: "$fuels.total_electricity_grid" },
    total_electricity_renewable: { $sum: "$fuels.total_electricity_renewable" },

    // Water
    total_water: { $sum: "$fuels.total_water" },
    total_water_tap: { $sum: "$fuels.total_water_tap" },
    total_water_rain: { $sum: "$fuels.total_water_rain" },
    total_water_well: { $sum: "$fuels.total_water_well" },
    total_water_recycle: { $sum: "$fuels.total_water_recycle" },

    // Combustion
    total_combustion: { $sum: "$fuels.total_combustion" },
    total_combustion_COL: { $sum: "$fuels.total_combustion_COL" },
    total_combustion_BIO: { $sum: "$fuels.total_combustion_BIO" },
    total_combustion_PET: { $sum: "$fuels.total_combustion_PET" },
    total_combustion_GASF: { $sum: "$fuels.total_combustion_GASF" },
    total_combustion_COTH: { $sum: "$fuels.total_combustion_COTH" },

    // Units
    unit_fuel_el: { $first: "$fuels.unit_fuel_el" },
    unit_fuel_co: { $first: "$fuels.unit_fuel_co" },
    unit_fuel_wa: { $first: "$fuels.unit_fuel_wa" },

    // Company Counts
    count_water: { $sum: { $cond: [{ $gt: ["$fuels.total_water", 0] }, 1, 0] } },
    count_electricity: { $sum: { $cond: [{ $gt: ["$fuels.total_electricity", 0] }, 1, 0] } },
    count_combustion: { $sum: { $cond: [{ $gt: ["$fuels.total_combustion", 0] }, 1, 0] } },
});
// ===== Nhóm 2: WASTE =====
const getWasteGroupStage = () => ({
    // Units
    unit_solid_and_gas_waste: { $first: "$waste.unit_solid_and_gas_waste" },
    unit_gas_waste: { $first: "$waste.unit_gas_waste" },
    unit_water_waste: { $first: "$waste.unit_water_waste" },

    // Total waste
    total_waste_tan: { $sum: "$waste.total_waste_tan" },
    total_waste_m3: { $sum: "$waste.total_waste_m3" },

    // Waste by type
    total_waste_DO: { $sum: "$waste.total_waste_DO" },
    total_waste_IND: { $sum: "$waste.total_waste_IND" },
    total_waste_HA: { $sum: "$waste.total_waste_HA" },
    total_waste_WWA: { $sum: "$waste.total_waste_WWA" },
    total_waste_GASW: { $sum: "$waste.total_waste_GASW" },

    count_waste: { $sum: { $cond: [{ $or: [{ $gt: ["$waste.total_waste_tan", 0] }, { $gt: ["$waste.total_waste_m3", 0] }] }, 1, 0] } },
});
// ===== Nhóm 3: EMISSIONS =====
const getEmissionGroupStage = () => ({
    unit_co2: { $first: "$emissions.unit_co2" },
    total_co2: { $sum: "$emissions.total_co2" },
    total_co2_from_grid_electricity: { $sum: "$emissions.total_co2_from_grid_electricity" },
    total_co2_from_water: { $sum: "$emissions.total_co2_from_water" },
    total_co2_from_DO_oil: { $sum: "$emissions.total_co2_from_DO_oil" },
    total_co2_from_gasoline: { $sum: "$emissions.total_co2_from_gasoline" },
    total_co2_from_FO_oil: { $sum: "$emissions.total_co2_from_FO_oil" },
    total_co2_from_biomass: { $sum: "$emissions.total_co2_from_biomass" },
    total_co2_from_charcoal: { $sum: "$emissions.total_co2_from_charcoal" },
    total_co2_from_natural_gas: { $sum: "$emissions.total_co2_from_natural_gas" },
    total_co2_from_LPG: { $sum: "$emissions.total_co2_from_LPG" },

    count_emissions: { $sum: { $cond: [{ $gt: ["$emissions.total_co2", 0] }, 1, 0] } },
});
/* ======= hàm định dạng lại kết quả trả về =======*/
// --- Nhóm nguyên liệu (Input Materials) ---
const getInputMaterialProjectStage = () => ({
    input_materials: {
        total_materials: "$total_materials",
        total_materials_MET: "$total_materials_MET",
        total_materials_NMET: "$total_materials_NMET",
        total_materials_POL: "$total_materials_POL",
        total_materials_WOOD: "$total_materials_WOOD",
        total_materials_TEX: "$total_materials_TEX",
        total_materials_AGRI: "$total_materials_AGRI",
        total_materials_PAC: "$total_materials_PAC",
        total_materials_MOTH: "$total_materials_MOTH",

        unit_material: "$unit_material",
        count_materials: "$count_materials",
    },
});
// --- Nhóm hóa chất (Input Chemicals) ---
const getInputChemicalProjectStage = () => ({
    input_chemicals: {
        total_chemicals_kg: "$total_chemicals_kg",
        total_chemicals_l: "$total_chemicals_l",
        total_chemicals_m3: "$total_chemicals_m3",

        total_chemicals_ACD_kg: "$total_chemicals_ACD_kg",
        total_chemicals_ACD_l: "$total_chemicals_ACD_l",
        total_chemicals_ACD_m3: "$total_chemicals_ACD_m3",

        total_chemicals_BAS_kg: "$total_chemicals_BAS_kg",
        total_chemicals_BAS_l: "$total_chemicals_BAS_l",
        total_chemicals_BAS_m3: "$total_chemicals_BAS_m3",

        total_chemicals_SLT_kg: "$total_chemicals_SLT_kg",
        total_chemicals_SLT_l: "$total_chemicals_SLT_l",
        total_chemicals_SLT_m3: "$total_chemicals_SLT_m3",

        total_chemicals_SOL_kg: "$total_chemicals_SOL_kg",
        total_chemicals_SOL_l: "$total_chemicals_SOL_l",
        total_chemicals_SOL_m3: "$total_chemicals_SOL_m3",

        total_chemicals_GAS_kg: "$total_chemicals_GAS_kg",
        total_chemicals_GAS_l: "$total_chemicals_GAS_l",
        total_chemicals_GAS_m3: "$total_chemicals_GAS_m3",

        total_chemicals_ADD_kg: "$total_chemicals_ADD_kg",
        total_chemicals_ADD_l: "$total_chemicals_ADD_l",
        total_chemicals_ADD_m3: "$total_chemicals_ADD_m3",

        total_chemicals_REDOX_kg: "$total_chemicals_REDOX_kg",
        total_chemicals_REDOX_l: "$total_chemicals_REDOX_l",
        total_chemicals_REDOX_m3: "$total_chemicals_REDOX_m3",

        total_chemicals_CHOT_kg: "$total_chemicals_CHOT_kg",
        total_chemicals_CHOT_l: "$total_chemicals_CHOT_l",
        total_chemicals_CHOT_m3: "$total_chemicals_CHOT_m3",

        unit_chemical_kg: "$unit_chemical_kg",
        unit_chemical_l: "$unit_chemical_l",
        unit_chemical_m3: "$unit_chemical_m3",
        count_chemicals: "$count_chemicals",
    },
});
// --- Nhóm nhiên liệu (Fuels) ---
const getFuelProjectStage = () => ({
    fuels: {
        // Units
        unit_fuel_el: "$unit_fuel_el",
        unit_fuel_co: "$unit_fuel_co",
        unit_fuel_wa: "$unit_fuel_wa",

        // Electricity
        total_electricity: "$total_electricity",
        total_electricity_grid: "$total_electricity_grid",
        total_electricity_renewable: "$total_electricity_renewable",

        // Water
        total_water: "$total_water",
        total_water_tap: "$total_water_tap",
        total_water_rain: "$total_water_rain",
        total_water_well: "$total_water_well",
        total_water_recycle: "$total_water_recycle",

        // Combustion
        total_combustion: "$total_combustion",
        total_combustion_COL: "$total_combustion_COL",
        total_combustion_BIO: "$total_combustion_BIO",
        total_combustion_PET: "$total_combustion_PET",
        total_combustion_GASF: "$total_combustion_GASF",
        total_combustion_COTH: "$total_combustion_COTH",

        count_water: "$count_water",
        count_electricity: "$count_electricity",
        count_combustion: "$count_combustion",
    },
});
// ===== Nhóm 2: WASTE =====
const getWasteProjectStage = () => ({
    waste: {
        // Units
        unit_solid_and_gas_waste: "$unit_solid_and_gas_waste",
        unit_gas_waste: "$unit_gas_waste",
        unit_water_waste: "$unit_water_waste",

        // Total waste
        total_waste_tan: "$total_waste_tan",
        total_waste_m3: "$total_waste_m3",

        // Waste by type
        total_waste_DO: "$total_waste_DO",
        total_waste_IND: "$total_waste_IND",
        total_waste_HA: "$total_waste_HA",
        total_waste_WWA: "$total_waste_WWA",
        total_waste_GASW: "$total_waste_GASW",

        count_waste: "$count_waste",
    }
});
// ===== Nhóm 3: EMISSIONS =====
const getEmissionProjectStage = () => ({
    emissions: {
        unit_co2: "$unit_co2",
        total_co2: "$total_co2",
        total_co2_from_grid_electricity: "$total_co2_from_grid_electricity",
        total_co2_from_water: "$total_co2_from_water",
        total_co2_from_DO_oil: "$total_co2_from_DO_oil",
        total_co2_from_gasoline: "$total_co2_from_gasoline",
        total_co2_from_FO_oil: "$total_co2_from_FO_oil",
        total_co2_from_biomass: "$total_co2_from_biomass",
        total_co2_from_charcoal: "$total_co2_from_charcoal",
        total_co2_from_natural_gas: "$total_co2_from_natural_gas",
        total_co2_from_LPG: "$total_co2_from_LPG",

        count_emissions: "$count_emissions",
    },
});
/**
 * Tạo điều kiện match và xác định groupId cho pipeline aggregate
 * @param {Object} options - Các tham số lọc
 * @param {string|null} [options.company_id] - Mã công ty (nếu có)
 * @param {string|null} [options.zone_id] - Mã khu (nếu có)
 * @param {number} options.periodKeyStart - periodKey bắt đầu
 * @param {number} options.periodKeyEnd - periodKey kết thúc
 * @returns {{ matchStage: Object, groupId: string|null }}
 */
const buildMatchGroupProject = ({
    company_id,
    zone_id,
    periodKeyStart,
    periodKeyEnd,
    projectStage,
    aggregateByMonth = true,
}) => {
    const matchStage = {
        periodKey: { $gte: periodKeyStart, $lte: periodKeyEnd },
        isDeleted: { $ne: true }
    };
    if (zone_id) matchStage.zone_id = zone_id;
    if (company_id) matchStage.company_id = company_id;

    let groupId;
    if (aggregateByMonth) {
        if (company_id) {
            // Tổng theo tháng trong 1 công ty
            groupId = { periodKey: "$periodKey", company_id: "$company_id" };
        } else if (zone_id) {
            // Tổng theo tháng trong 1 zone
            groupId = { periodKey: "$periodKey", zone_id: "$zone_id" };
        } else {
            // Tổng toàn hệ thống theo tháng
            groupId = { periodKey: "$periodKey" };
        }
    } else {
        // Không tổng theo tháng → lấy tổng record
        if (company_id) {
            groupId = "$_id";
        } else if (zone_id) {
            groupId = "$zone_id";
        } else {
            groupId = null;
        }
    }

    const project = {
        _id: 0,
        ...(company_id ? { company_id: "$_id.company_id" } : {}),
        ...(zone_id && !company_id ? { zone_id: "$_id.zone_id" } : {}),
        ...(aggregateByMonth ? { periodKey: "$_id.periodKey" } : {}),
        ...projectStage,
    };

    return { matchStage, groupId, project };
};
