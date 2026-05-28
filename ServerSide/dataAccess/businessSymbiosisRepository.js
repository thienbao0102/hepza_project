const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const businessSymbiosisConstants = require('../constantField/businessSymbiosis');
const { removeDiacritics } = require('../utils/removeDiacritics');

const nameUserSchema = 'users';
const keyUserLinked = 'user_id';
const nameCompanySchema = 'companies';
const keyCompanyLinked = 'company_id';

//get buy demand 
const getBuyDemand = async (company_id) => {
    return await WasteBuyDemand
        .find({ company_id: company_id, isDeleted: { $ne: true } })
        .select(businessSymbiosisConstants.BUY_DEMAND_FIELDS)
        .lean();
}
//get sell supply
const getSellSupply = async (company_id) => {
    return await WasteSellOffer
        .find({ company_id: company_id, isDeleted: { $ne: true } })
        .select(businessSymbiosisConstants.SELL_SUPPLY_FIELDS)
        .lean();
}
//recommendation list output by buy demand
const findSellMatchedWithBuy = async (query) => {
    return await WasteSellOffer.aggregate([
        { $match: query },
        {
            $lookup: {
                from: nameUserSchema,
                localField: keyUserLinked,
                foreignField: keyUserLinked,
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: nameCompanySchema,
                localField: keyCompanyLinked,
                foreignField: keyCompanyLinked,
                as: 'company'
            }
        },
        { $unwind: '$company' },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'company.zone_id',
                foreignField: 'zone_id',
                as: 'zoneInfo'
            }
        },
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: businessSymbiosisConstants.SELL_SUPPLY_PROJECTION
        },
        {
            $sort: {
                quantity: -1,
                createdAt: -1
            }
        }
    ]);
}
//recommendation list input by sell supply
const findBuyMatchedWithSell = async (query) => {
    return await WasteBuyDemand.aggregate([
        { $match: query },
        {
            $lookup: {
                from: nameUserSchema,
                localField: keyUserLinked,
                foreignField: keyUserLinked,
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: nameCompanySchema,
                localField: keyCompanyLinked,
                foreignField: keyCompanyLinked,
                as: 'company'
            }
        },
        { $unwind: '$company' },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'company.zone_id',
                foreignField: 'zone_id',
                as: 'zoneInfo'
            }
        },
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: businessSymbiosisConstants.BUY_DEMAND_PROJECTION
        },
        {
            $sort: {
                quantity: -1,
                createdAt: -1
            }
        }
    ]);
}
//insert data buy demand
const insertBuyDemand = async (data) => {
    const newData = new WasteBuyDemand({
        user_id: data.user_id,
        company_id: data.company_id,
        zone_id: data.zone_id,

        wasteName: data.wasteName?.trim(),
        wasteNameNormalized: removeDiacritics(data.wasteName),
        otherWasteName: Array.isArray(data.otherWasteName)
            ? data.otherWasteName.map(n => n.trim())
            : undefined,

        industrialGrs: data.industrialGrs || undefined,
        desiredWasteCode: data.desiredWasteCode || undefined,

        quantity: data.quantity,
        unit: data.unit || "Tấn",

        price: data.price,
        currency: data.currency || "VND",

        notes: data.notes?.trim(),
        attachments: data.attachments || [],
        expiryDate: data.expiryDate || null
    });

    await newData.save();
    return newData.toObject();
};
//insert data sell supply
const insertSellSupply = async (data) => {
    const newData = new WasteSellOffer({
        user_id: data.user_id,
        company_id: data.company_id,
        zone_id: data.zone_id,

        wasteName: data.wasteName?.trim(),
        wasteNameNormalized: removeDiacritics(data.wasteName),
        otherWasteName: Array.isArray(data.otherWasteName)
            ? data.otherWasteName.map(n => n.trim())
            : undefined,

        wasteCode: data.wasteCode || undefined,
        industrialGrs: data.industrialGrs || undefined,

        hazardLevel: data.hazardLevel || undefined,

        quantity: data.quantity,
        unit: data.unit || "Tấn",

        price: data.price,
        currency: data.currency || "VND",
        frequency: data.frequency || "một lần",

        notes: data.notes?.trim() || '',
        attachments: data.attachments || [],
        expiryDate: data.expiryDate || null
    });

    await newData.save();
    return newData.toObject();
};
//get list data buy demand
const getBusinessSymbiosisBuyDemandList = async (company_id) => {
    return await WasteBuyDemand.find({ company_id: company_id, isDeleted: { $ne: true } }).lean();
}
//get list data sell supply
const getBusinessSymbiosisSellSupplyList = async (company_id) => {
    return await WasteSellOffer.find({ company_id: company_id, isDeleted: { $ne: true } }).lean();
}
const findOwnedBuyDemandById = async (_id, company_id) => {
    return await WasteBuyDemand.findOne({ _id, company_id }).lean();
}
const findOwnedSellSupplyById = async (_id, company_id) => {
    return await WasteSellOffer.findOne({ _id, company_id }).lean();
}
//delete data buy demand by id with ownership check
const deleteBuyDemandById = async (_id, company_id) => {
    return await WasteBuyDemand.findOneAndDelete({ _id, company_id });
}
//delete data sell supply by id with ownership check
const deleteSellSupplyById = async (_id, company_id) => {
    return await WasteSellOffer.findOneAndDelete({ _id, company_id });
}
//update data buy demand by id with ownership check + optimistic locking
const updateBuyDemandById = async (_id, company_id, data) => {
    if (data.wasteName) {
        data.wasteNameNormalized = removeDiacritics(data.wasteName);
    }
    const clientVersion = data.__v;
    delete data.__v; // don't persist __v inside $set

    if (clientVersion !== undefined && clientVersion !== null) {
        return await WasteBuyDemand.findOneAndUpdate(
            { _id, company_id, __v: clientVersion },
            { ...data, $inc: { __v: 1 } },
            { new: true }
        );
    }
    return await WasteBuyDemand.findOneAndUpdate({ _id, company_id }, data, { new: true });
}
//update data sell supply by id with ownership check + optimistic locking
const updateSellSupplyById = async (_id, company_id, data) => {
    if (data.wasteName) {
        data.wasteNameNormalized = removeDiacritics(data.wasteName);
    }
    const clientVersion = data.__v;
    delete data.__v;

    if (clientVersion !== undefined && clientVersion !== null) {
        return await WasteSellOffer.findOneAndUpdate(
            { _id, company_id, __v: clientVersion },
            { ...data, $inc: { __v: 1 } },
            { new: true }
        );
    }
    return await WasteSellOffer.findOneAndUpdate({ _id, company_id }, data, { new: true });
}
//soft delete buy demand + sell supply by company_id
const softDeleteBusinessSymbiosisByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};

    await WasteBuyDemand.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false }
            ]
        },
        { $set: { isDeleted: true } },
        options
    );
    await WasteSellOffer.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false }
            ]
        },
        { $set: { isDeleted: true } },
        options
    );
};
//hard delete buy demand + sell supply by company_id
const hardDeleteBusinessSymbiosisByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};
    await WasteBuyDemand.deleteMany({ company_id }, options);
    await WasteSellOffer.deleteMany({ company_id }, options);
};
//restore soft deleted buy demand + sell supply by company_id
const restoreBusinessSymbiosisByCompanyId = async (company_id, session = null) => {
    const options = session ? { session } : {};

    await WasteBuyDemand.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: true } },
                { isDeleted: true }
            ]
        },
        { $set: { isDeleted: false } },
        options
    );
    await WasteSellOffer.updateMany(
        {
            company_id,
            $or: [
                { isDeleted: { $exists: true } },
                { isDeleted: true }
            ]
        },
        { $set: { isDeleted: false } },
        options
    );
}

const countActiveBusinessSymbiosisByUser = async (company_id, user_id, session = null) => {
    const buyQuery = WasteBuyDemand.countDocuments({
        company_id,
        user_id,
        isDeleted: { $ne: true }
    });
    const sellQuery = WasteSellOffer.countDocuments({
        company_id,
        user_id,
        isDeleted: { $ne: true }
    });

    if (session) {
        buyQuery.session(session);
        sellQuery.session(session);
    }

    const [buyCount, sellCount] = await Promise.all([buyQuery, sellQuery]);
    return {
        buyCount,
        sellCount,
        total: buyCount + sellCount,
    };
};

const reassignBusinessSymbiosisOwner = async (company_id, from_user_id, to_user_id, session = null) => {
    const options = session ? { session } : undefined;

    const [buyResult, sellResult] = await Promise.all([
        WasteBuyDemand.updateMany(
            { company_id, user_id: from_user_id, isDeleted: { $ne: true } },
            { $set: { user_id: to_user_id } },
            options
        ),
        WasteSellOffer.updateMany(
            { company_id, user_id: from_user_id, isDeleted: { $ne: true } },
            { $set: { user_id: to_user_id } },
            options
        ),
    ]);

    return {
        buyDemandModified: buyResult?.modifiedCount || 0,
        sellOfferModified: sellResult?.modifiedCount || 0,
        totalModified: (buyResult?.modifiedCount || 0) + (sellResult?.modifiedCount || 0),
    };
};
//get all buy demand exlduding company
const findAllBuyDemandsExcludingCompany = async (company_id) => {
    return await WasteBuyDemand
        .find({
            company_id: { $ne: company_id },
            isDeleted: { $ne: true }
        })
        .select(businessSymbiosisConstants.BUY_DEMAND_FIELDS)
        .lean();
}
//get all sell supply exlduding company
const findAllSellSuppliesExcludingCompany = async (company_id) => {
    return await WasteSellOffer
        .find({
            company_id: { $ne: company_id },
            isDeleted: { $ne: true }
        })
        .select(businessSymbiosisConstants.SELL_SUPPLY_FIELDS)
        .lean();
}
//recommendation candidates for buy demand (output by buy)
const findSellRecommendationCandidates = async (query) => {
    return await WasteSellOffer.aggregate([
        { $match: query },
        {
            $lookup: {
                from: nameUserSchema,
                localField: keyUserLinked,
                foreignField: keyUserLinked,
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: nameCompanySchema,
                localField: keyCompanyLinked,
                foreignField: keyCompanyLinked,
                as: 'company'
            }
        },
        { $unwind: '$company' },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'company.zone_id',
                foreignField: 'zone_id',
                as: 'zoneInfo'
            }
        },
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: businessSymbiosisConstants.SELL_SUPPLY_PROJECTION
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);
}
//recommendation candidates for sell supply (input by sell)
const findBuyRecommendationCandidates = async (query) => {
    return await WasteBuyDemand.aggregate([
        { $match: query },
        {
            $lookup: {
                from: nameUserSchema,
                localField: keyUserLinked,
                foreignField: keyUserLinked,
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: nameCompanySchema,
                localField: keyCompanyLinked,
                foreignField: keyCompanyLinked,
                as: 'company'
            }
        },
        { $unwind: '$company' },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'company.zone_id',
                foreignField: 'zone_id',
                as: 'zoneInfo'
            }
        },
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: businessSymbiosisConstants.BUY_DEMAND_PROJECTION
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);
}
//search and sort buy demand
const searchAndSortBusinessSymbiosisByBuyDemand = async (company_id, filter, sort) => {
    return await WasteBuyDemand
        .find({ ...filter, isDeleted: { $ne: true } })
        .sort(sort)
        .lean();
}
//search and sort sell supply
const searchAndSortBusinessSymbiosisBySellSupply = async (company_id, filter, sort) => {
    return await WasteSellOffer
        .find({ ...filter, isDeleted: { $ne: true } })
        .sort(sort)
        .lean();
}

module.exports = {
    findSellMatchedWithBuy,
    findBuyMatchedWithSell,
    insertBuyDemand,
    insertSellSupply,
    getBusinessSymbiosisBuyDemandList,
    getBusinessSymbiosisSellSupplyList,
    getBuyDemand,
    getSellSupply,
    findOwnedBuyDemandById,
    findOwnedSellSupplyById,
    deleteBuyDemandById,
    deleteSellSupplyById,
    updateBuyDemandById,
    updateSellSupplyById,
    softDeleteBusinessSymbiosisByCompanyId,
    hardDeleteBusinessSymbiosisByCompanyId,
    restoreBusinessSymbiosisByCompanyId,
    countActiveBusinessSymbiosisByUser,
    reassignBusinessSymbiosisOwner,
    findAllBuyDemandsExcludingCompany,
    findAllSellSuppliesExcludingCompany,
    searchAndSortBusinessSymbiosisByBuyDemand,
    searchAndSortBusinessSymbiosisBySellSupply,
    findSellRecommendationCandidates,
    findBuyRecommendationCandidates
};
