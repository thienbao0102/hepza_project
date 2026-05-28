const businessSymbiosisRepository = require('../dataAccess/businessSymbiosisRepository');
const { buildSearchPattern } = require('../utils/removeDiacritics');
const { VersionConflictError, MissingVersionError } = require('../utils/conflictError');
const {
    scoreSymbiosisMatch,
    dedupeAndSortMatches,
    buildCandidateRegexTerms
} = require('../utils/symbiosisMatching');

//recommendation list output by buy demand
const fetchBusinessSymbiosisByBuyDemand = async (company_id) => {
    const buyList = await businessSymbiosisRepository.getBuyDemand(company_id);
    if (buyList.length === 0) return [];

    return await fetchScoredRecommendations({
        company_id,
        requestList: buyList,
        codeField: 'wasteCode',
        codeValueKey: 'desiredWasteCode',
        direction: 'buy-to-sell',
        findCandidates: businessSymbiosisRepository.findSellRecommendationCandidates
    });
}
//recommendation list input by sell supply
const fetchBusinessSymbiosisBySellSupply = async (company_id) => {
    const sellList = await businessSymbiosisRepository.getSellSupply(company_id);
    if (sellList.length === 0) return [];

    return await fetchScoredRecommendations({
        company_id,
        requestList: sellList,
        codeField: 'desiredWasteCode',
        codeValueKey: 'wasteCode',
        direction: 'sell-to-buy',
        findCandidates: businessSymbiosisRepository.findBuyRecommendationCandidates
    });
}
//insert data buy demand
const processBusinessSymbiosisBuyDemandCreate = async (user_id, company_id, zone_id, data) => {
    const insertData = {
        ...data,
        company_id: company_id,
        user_id: user_id,
        zone_id: zone_id
    };

    const newData = await businessSymbiosisRepository.insertBuyDemand(insertData);
    return newData;

}
//insert data sell supply
const processBusinessSymbiosisSellSupplyCreate = async (user_id, company_id, zone_id, data) => {
    const insertData = {
        ...data,
        company_id: company_id,
        user_id: user_id,
        zone_id: zone_id
    };
    const newData = await businessSymbiosisRepository.insertSellSupply(insertData);
    return newData;

}
//get list data buy demand
const getBusinessSymbiosisBuyDemandList = async (company_id) => {
    const buyDemandList = await businessSymbiosisRepository.getBuyDemand(company_id);
    return buyDemandList;
}
//get list data sell supply
const getBusinessSymbiosisSellSupplyList = async (company_id) => {
    const sellSupplyList = await businessSymbiosisRepository.getSellSupply(company_id);
    return sellSupplyList;
}
const getOwnedBuyDemandById = async (_id, company_id) => {
    return await businessSymbiosisRepository.findOwnedBuyDemandById(_id, company_id);
}
const getOwnedSellSupplyById = async (_id, company_id) => {
    return await businessSymbiosisRepository.findOwnedSellSupplyById(_id, company_id);
}
//search and sort data output by buy demand
const searchAndSortBusinessSymbiosisByBuyDemand = async (
    company_id,
    searchKey = "",
    sortKey = "createdAt",
    sortOrder = "desc"
) => {
    const filter = { company_id: company_id };

    if (searchKey) {
        const normalizedPattern = buildSearchPattern(searchKey);
        filter.$or = [
            { wasteNameNormalized: { $regex: normalizedPattern, $options: "i" } },
            { wasteName: { $regex: searchKey, $options: "i" } },
            { otherWasteName: { $regex: searchKey, $options: "i" } }
        ];
    }

    const sort = {};
    sort[sortKey] = sortOrder === "asc" ? 1 : -1
    const buyDemandList = await businessSymbiosisRepository.searchAndSortBusinessSymbiosisByBuyDemand(company_id, filter, sort);
    return buyDemandList;
}
//search and sort data input by sell supply
const searchAndSortBusinessSymbiosisBySellSupply = async (
    company_id,
    searchKey = "",
    sortKey = "createdAt",
    sortOrder = "desc"
) => {
    const filter = { company_id: company_id };

    if (searchKey) {
        const normalizedPattern = buildSearchPattern(searchKey);
        filter.$or = [
            { wasteNameNormalized: { $regex: normalizedPattern, $options: "i" } },
            { wasteName: { $regex: searchKey, $options: "i" } },
            { otherWasteName: { $regex: searchKey, $options: "i" } }
        ];
    }

    const sort = {};
    sort[sortKey] = sortOrder === "asc" ? 1 : -1;
    const sellSupplyList = await businessSymbiosisRepository.searchAndSortBusinessSymbiosisBySellSupply(company_id, filter, sort);
    return sellSupplyList;
}
//delete buy demand by id with ownership check
const deleteBusinessSymbiosisBuyDemandById = async (_id, company_id) => {
    return await businessSymbiosisRepository.deleteBuyDemandById(_id, company_id);
}
//delete sell supply by id with ownership check
const deleteBusinessSymbiosisSellSupplyById = async (_id, company_id) => {
    return await businessSymbiosisRepository.deleteSellSupplyById(_id, company_id);
}
//update buy demand by id with ownership check + optimistic locking
const updateBusinessSymbiosisBuyDemandById = async (_id, company_id, data) => {
    if (data.__v === undefined || data.__v === null) {
        throw new MissingVersionError();
    }
    const result = await businessSymbiosisRepository.updateBuyDemandById(_id, company_id, data);
    if (!result) {
        throw new VersionConflictError();
    }
    // Real-time sync
    try {
        const { getIo } = require('../config/socket'); // lazy-require
        const io = getIo();
        if (io && result) {
            io.emit('symbiosis:updated', { type: 'buyDemand', _id, company_id, __v: result.__v });
        }
    } catch (_) { /* best-effort */ }
    return result;
}
//update sell supply by id with ownership check + optimistic locking
const updateBusinessSymbiosisSellSupplyById = async (_id, company_id, data) => {
    if (data.__v === undefined || data.__v === null) {
        throw new MissingVersionError();
    }
    const result = await businessSymbiosisRepository.updateSellSupplyById(_id, company_id, data);
    if (!result) {
        throw new VersionConflictError();
    }
    // Real-time sync
    try {
        const { getIo } = require('../config/socket'); // lazy-require
        const io = getIo();
        if (io && result) {
            io.emit('symbiosis:updated', { type: 'sellSupply', _id, company_id, __v: result.__v });
        }
    } catch (_) { /* best-effort */ }
    return result;
}
//get all buy demand exlduding company
const findAllBuyDemandsExcludingCompany = async (company_id) => {
    return await businessSymbiosisRepository.findAllBuyDemandsExcludingCompany(company_id);
}
//get all sell supply exlduding company
const findAllSellSuppliesExcludingCompany = async (company_id) => {
    return await businessSymbiosisRepository.findAllSellSuppliesExcludingCompany(company_id);
}

module.exports = {
    fetchBusinessSymbiosisByBuyDemand,
    fetchBusinessSymbiosisBySellSupply,
    processBusinessSymbiosisBuyDemandCreate,
    processBusinessSymbiosisSellSupplyCreate,
    getBusinessSymbiosisBuyDemandList,
    getBusinessSymbiosisSellSupplyList,
    getOwnedBuyDemandById,
    getOwnedSellSupplyById,
    searchAndSortBusinessSymbiosisByBuyDemand,
    searchAndSortBusinessSymbiosisBySellSupply,
    deleteBusinessSymbiosisBuyDemandById,
    deleteBusinessSymbiosisSellSupplyById,
    updateBusinessSymbiosisBuyDemandById,
    updateBusinessSymbiosisSellSupplyById,
    findAllBuyDemandsExcludingCompany,
    findAllSellSuppliesExcludingCompany
}

//==========================helper function===========================
const fetchScoredRecommendations = async ({
    company_id,
    requestList,
    codeField,
    codeValueKey,
    direction,
    findCandidates
}) => {
    const scoredMatches = [];

    for (const request of requestList) {
        const query = buildRecommendationCandidateQuery(company_id, request, codeField, request[codeValueKey]);
        const candidates = await findCandidates(query);

        for (const candidate of candidates) {
            const score = scoreSymbiosisMatch(request, candidate, direction);
            if (score === null) continue;

            scoredMatches.push({
                ...candidate,
                matchTier: score.matchTier,
                matchScore: score.matchScore
            });
        }
    }

    return dedupeAndSortMatches(scoredMatches);
};

const buildRecommendationCandidateQuery = (company_id, item, codeField, codeValue) => {
    const query = {
        company_id: { $ne: company_id },
        isDeleted: { $ne: true }
    };

    const orConditions = [];
    if (codeValue) {
        orConditions.push({ [codeField]: codeValue });
    }

    for (const term of buildCandidateRegexTerms(item)) {
        orConditions.push({ wasteNameNormalized: { $regex: term, $options: 'i' } });
        orConditions.push({ wasteName: { $regex: term, $options: 'i' } });
        orConditions.push({ otherWasteName: { $elemMatch: { $regex: term, $options: 'i' } } });
    }

    if (item.industrialGrs) {
        orConditions.push({ industrialGrs: item.industrialGrs });
    }

    if (orConditions.length > 0) {
        query.$or = orConditions;
    }

    return query;
};
