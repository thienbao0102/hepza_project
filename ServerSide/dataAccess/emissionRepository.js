const emissionModel = require('../models/emissionModel');

const getEmission = async (company_id, zone_id, periodKeyStart, periodKeyEnd) => {
    const query = initQuery(company_id, zone_id, periodKeyStart, periodKeyEnd);

    const emissionData = await emissionModel.aggregate([
        { $match: query },
        // Join sang bảng Company
        {
            $lookup: {
                from: "companies",
                localField: "company_id",
                foreignField: "company_id",
                as: "company"
            }
        },
        // { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
        // Join sang bảng Zone
        {
            $lookup: {
                from: "IndustrialZones",
                localField: "zone_id",
                foreignField: "zone_id",
                as: "zone"
            }
        },
        // { $unwind: { path: "$zone", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                company_name: "$company.company_name",
                zone_name: "$zone.zone_name",
            }
        },
        // Giữ lại các trường cần thiết
        {
            $project: {
                emission_id: 1,
                emission_name: 1,
                quantity: 1,
                unit: 1,
                periodKey: 1,
                company_name: 1,
                zone_name: 1,
            }
        }
    ]);
    return emissionData;
}

const initQuery = (company_id, zone_id, periodKeyStart, periodKeyEnd) => {
    const query = { isDeleted: { $ne: true } };
    if (company_id) {
        query.company_id = company_id;
    }
    if (zone_id) {
        query.zone_id = zone_id;
    }
    if (periodKeyStart && periodKeyEnd) {
        query.periodKey = { $gte: periodKeyStart, $lte: periodKeyEnd };
    }
    return query;
}

const insertEmission = async (emiName, emiQuantity, company_id, zone_id, periodKey, session) => {
    const emissionData = {
        emission_name: `CO2 từ ${emiName}`,
        quantity: emiQuantity,
        unit: 'Tấn CO₂tđ',
        company_id,
        zone_id,
        periodKey,
    };
    //check exist
    const exist = await emissionModel.findOne({
        emission_name: emissionData.emission_name,
        company_id: emissionData.company_id,
        zone_id: emissionData.zone_id,
        periodKey: emissionData.periodKey,
    }).session(session);
    if (exist) {
        //update quantity
        exist.quantity = emiQuantity;
        return await exist.save({ session });
    }

    // Create mới — retry nếu bị duplicate emission_id (counter gap từ transaction cũ bị rollback)
    let retries = 5;
    while (retries > 0) {
        try {
            // Xóa emission_id cũ để pre-save hook tạo ID mới
            delete emissionData.emission_id;
            return await emissionModel.create([emissionData], { session });
        } catch (err) {
            if (err.code === 11000 && err.keyPattern?.emission_id && retries > 1) {
                retries--;
                continue;
            }
            throw err;
        }
    }
}

//soft delete
const deleteSoftEmission = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return emissionModel.updateMany(
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
//delete hard
const deleteHardEmission = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return emissionModel.deleteMany({ company_id }, options);
}
//restore soft deleted emission
const restoreEmission = async (company_id, session = null) => {
    const options = session ? { session } : {};

    return emissionModel.updateMany(
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

module.exports = {
    getEmission,
    insertEmission,
    deleteSoftEmission,
    deleteHardEmission,
    restoreEmission
}