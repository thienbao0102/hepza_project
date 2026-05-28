const Company = require('../models/companyModel');

const buildRepresentativeLookups = () => ([
    {
        $lookup: {
            from: 'users',
            localField: 'representative_user_id',
            foreignField: 'user_id',
            as: 'representative_user_info',
        },
    },
    {
        $lookup: {
            from: 'users',
            let: { cid: '$company_id' },
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ['$company_id', '$$cid'] },
                        role: 'company',
                        deleted_at: null,
                    },
                },
                { $sort: { created_at: 1 } },
                { $limit: 1 },
                { $project: { user_id: 1, full_name: 1, email: 1, phone_number: 1 } },
            ],
            as: 'fallback_representative_user_info',
        },
    },
    {
        $addFields: {
            resolved_representative_user: {
                $ifNull: [
                    { $arrayElemAt: ['$representative_user_info', 0] },
                    { $arrayElemAt: ['$fallback_representative_user_info', 0] },
                ],
            },
            representative_user_id: {
                $ifNull: [
                    '$representative_user_id',
                    { $arrayElemAt: ['$fallback_representative_user_info.user_id', 0] },
                ],
            },
        },
    },
]);

const buildIndustryDisplayLookups = () => ([
    {
        $lookup: {
            from: 'industrygroups',
            localField: 'industry_group',
            foreignField: 'group_id',
            as: 'industry_group_info',
        },
    },
    {
        $lookup: {
            from: 'industries',
            localField: 'industry',
            foreignField: 'industry_id',
            as: 'industry_info',
        },
    },
    {
        $addFields: {
            industry_group_names: {
                $map: {
                    input: { $ifNull: ['$industry_group', []] },
                    as: 'groupValue',
                    in: {
                        $let: {
                            vars: {
                                matchedGroup: {
                                    $first: {
                                        $filter: {
                                            input: '$industry_group_info',
                                            as: 'groupDoc',
                                            cond: { $eq: ['$$groupDoc.group_id', '$$groupValue'] },
                                        },
                                    },
                                },
                            },
                            in: { $ifNull: ['$$matchedGroup.group_name', '$$groupValue'] },
                        },
                    },
                },
            },
            industry_names: {
                $map: {
                    input: { $ifNull: ['$industry', []] },
                    as: 'industryValue',
                    in: {
                        $let: {
                            vars: {
                                matchedIndustry: {
                                    $first: {
                                        $filter: {
                                            input: '$industry_info',
                                            as: 'industryDoc',
                                            cond: { $eq: ['$$industryDoc.industry_id', '$$industryValue'] },
                                        },
                                    },
                                },
                            },
                            in: {
                                $ifNull: [
                                    {
                                        $cond: {
                                            if: { $and: [{ $ne: ["$$matchedIndustry.industry_code", null] }, { $ne: ["$$matchedIndustry.industry_code", ""] }] },
                                            then: { $concat: ["$$matchedIndustry.industry_code", " - ", "$$matchedIndustry.industry_name"] },
                                            else: "$$matchedIndustry.industry_name"
                                        }
                                    },
                                    "$$industryValue"
                                ]
                            },
                        },
                    },
                },
            },
        },
    },
]);

const getCompanyById = async (company_id, session = null) => {
    const aggregator = Company.aggregate([
        { $match: { company_id, deleted_at: null } },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        {
            $unwind: {
                path: '$zone_info',
                preserveNullAndEmptyArrays: true,
            },
        },
        ...buildIndustryDisplayLookups(),
        ...buildRepresentativeLookups(),
        {
            $addFields: {
                representative: '$resolved_representative_user.full_name',
                full_name: '$resolved_representative_user.full_name',
                email: '$resolved_representative_user.email',
                phone_number: '$resolved_representative_user.phone_number',
                zone_name: '$zone_info.zone_name',
            },
        },
        {
            $project: {
                zone_info: 0,
                industry_group_info: 0,
                industry_info: 0,
                representative_user_info: 0,
                fallback_representative_user_info: 0,
                resolved_representative_user: 0,
            },
        },
        { $limit: 1 },
    ]);
    if (session) aggregator.session(session);
    const [company = null] = await aggregator;
    return company;
};

const getCompanyByName = async (company_name) => {
    return await Company.findOne({ company_name, deleted_at: null }).lean();
};

const createCompany = async (companyData, session = null) => {
    const company = new Company(companyData);
    return await company.save(session ? { session } : undefined);
};

const countCompanies = async () => {
    return await Company.countDocuments({ deleted_at: null });
};

const deleteCompanyById = async (company_id, userId, session = null) => {
    const updater = Company.findOneAndUpdate(
        { company_id, deleted_at: null },
        { deleted_at: new Date(), deleted_by: userId },
        { new: true }
    );
    if (session) updater.session(session);
    return await updater;
};

const deleteAllCompanies = async (session = null) => {
    return await Company.deleteMany({}, { session });
};

const restoreCompany = async (company_id, session = null) => {
    const updater = Company.findOneAndUpdate(
        { company_id },
        { $unset: { deleted_at: 1, deleted_by: 1 } },
        { new: true }
    );
    if (session) updater.session(session);
    return await updater;
};

const updateCompany = async (company_id, updateData, userId, session = null) => {
    return await Company.findOneAndUpdate(
        { company_id },
        { $set: { ...updateData, updated_by: userId, updated_at: new Date() } },
        { new: true, session }
    );
};

/**
 * Version-aware update — Optimistic Locking.
 * Includes `__v` in the filter so MongoDB only updates if the version matches.
 * On success the version is incremented atomically ($inc).
 * Returns null when the version is stale → caller should throw VersionConflictError.
 */
const updateCompanyWithVersion = async (company_id, expectedVersion, updateData, userId, session = null) => {
    return await Company.findOneAndUpdate(
        { company_id, __v: expectedVersion },
        {
            $set: { ...updateData, updated_by: userId, updated_at: new Date() },
            $inc: { __v: 1 }
        },
        { new: true, session }
    );
};

const getAllCompanies = async (query, skip, limit, sort = {}) => {
    const sortStage =
        Object.keys(sort).length > 0 ? sort : { updated_at: -1, _id: 1 };

    return await Company.aggregate([
        { $match: query },

        // zone
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        {
            $unwind: {
                path: '$zone_info',
                preserveNullAndEmptyArrays: true,
            },
        },

        ...buildIndustryDisplayLookups(),
        ...buildRepresentativeLookups(),
        {
            $lookup: {
                from: 'users',
                let: { cid: '$company_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$company_id', '$$cid'] },
                            role: 'company',
                            deleted_at: null
                        }
                    },
                    { $count: 'count' }
                ],
                as: 'users_count_info',
            },
        },
        {
            $lookup: {
                from: 'users',
                let: { cid: '$company_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$company_id', '$$cid'] },
                            role: 'company',
                        }
                    },
                    { $count: 'count' }
                ],
                as: 'user_slots_count_info',
            },
        },
        {
            $addFields: {
                representative: '$resolved_representative_user.full_name',
                email: '$resolved_representative_user.email',
                phone_number: '$resolved_representative_user.phone_number',
                active_users_count: {
                    $ifNull: [{ $arrayElemAt: ['$users_count_info.count', 0] }, 0]
                },
                user_slots_count: {
                    $ifNull: [{ $arrayElemAt: ['$user_slots_count_info.count', 0] }, 0]
                }
            },
        },

        {
            $project: {
                company_id: 1,
                company_name: 1,
                company_type: 1,
                address: 1,
                zone_id: 1,
                zone_name: '$zone_info.zone_name',
                founded_year: 1,
                total_workers: 1,
                industry: 1,
                industry_group: 1,
                industry_names: 1,
                industry_group_names: 1,
                website: 1,
                updated_at: 1,
                revenue: 1,
                revenue_currency: 1,
                market: 1,
                company_registration_number: 1,
                representative_user_id: 1,
                representative: 1,
                email: 1,
                phone_number: 1,
                active_users_count: 1,
                user_slots_count: 1,
            },
        },

        { $sort: sortStage },

        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ]);
};

const getDeletedCompanies = async (query, skip, limit, sort = {}) => {
    const sortStage = Object.keys(sort).length > 0 ? sort : { deleted_at: -1 };

    return await Company.aggregate([
        { $match: query },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        {
            $unwind: {
                path: '$zone_info',
                preserveNullAndEmptyArrays: true,
            },
        },
        ...buildIndustryDisplayLookups(),
        {
            $project: {
                company_id: 1,
                company_name: 1,
                company_type: 1,
                address: 1,
                zone_id: 1,
                founded_year: 1,
                total_workers: 1,
                industry: 1,
                industry_group: 1,
                industry_names: 1,
                industry_group_names: 1,
                website: 1,
                zone_name: '$zone_info.zone_name',
                deleted_at: 1,
                deleted_by: 1,
            },
        },
        { $sort: sortStage },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ]);
};

const findOne = async (query, session = null) => {
    return await Company.findOne(query).session(session).lean();
};

const find = async (query, session = null) => {
    return await Company.find(query).session(session).lean();
};

const aggregate = async (pipeline) => {
    return await Company.aggregate(pipeline);
};

const countDocuments = async (query) => {
    return await Company.countDocuments(query);
};

const findExists = async (company_id, zone_id) => {
    return await Company.exists({ company_id, zone_id });
}

//get name company by _id
const getCompanyNameById = async (company_id) => {
    return await Company.findOne({ company_id, deleted_at: null }).select({ company_name: 1, _id: 0 }).lean();
}
//get zone_id by company_id
const getZoneIdByCompanyId = async (company_id, session = null) => {
    const query = Company.findOne({ company_id, deleted_at: null })
        .select({ zone_id: 1, _id: 0 });
    if (session) query.session(session);
    return await query.lean();
}
//get companies name and zone_id by array company_id
const getlistCompanyNameByIds = async (company_ids) => {
    return await Company.aggregate([
        { $match: { company_id: { $in: company_ids }, deleted_at: null } },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        {
            $unwind: {
                path: '$zone_info',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                company_id: 1,
                company_name: 1,
                zone_id: 1,
                zone_name: '$zone_info.zone_name',
                _id: 0
            }
        }
    ]);
}
//get list company_ids by zone_id
const getCompanyIdsByZoneId = async (zone_id) => {
    return Company.distinct("company_id", {
        zone_id,
        deleted_at: null
    });
};
//get all companiy_ids 
const getAllCompanyIds = async () => {
    return Company.distinct("company_id", {
        deleted_at: null
    });
};

const getCompaniesWithAffectedUsers = async (company_ids, forHardDelete = false) => {
    const ids = company_ids.map(id => String(id));

    const companyMatch = forHardDelete
        ? { company_id: { $in: ids }, deleted_at: { $ne: null } }
        : { company_id: { $in: ids }, deleted_at: null };

    const userCond = forHardDelete
        ? { $ne: [{ $ifNull: ['$$user.deleted_at', null] }, null] }  // deleted_at tồn tại → đã xóa
        : { $eq: [{ $ifNull: ['$$user.deleted_at', null] }, null] }; // deleted_at = null hoặc không tồn tại → còn sống

    return await Company.aggregate([
        { $match: companyMatch },
        {
            $lookup: {
                from: 'users',
                localField: 'company_id',
                foreignField: 'company_id',
                as: 'affectedUsers'
            }
        },
        {
            $addFields: {
                affectedUsers: {
                    $filter: {
                        input: '$affectedUsers',
                        as: 'user',
                        cond: userCond
                    }
                }
            }
        },
        {
            $project: {
                company_id: 1,
                company_name: 1,
                affectedUsers: {
                    user_id: 1,
                    full_name: 1,
                    email: 1
                }
            }
        }
    ]);
};

const hardDeleteCompany = async (company_id, session = null) => {
    const deleter = Company.deleteOne({ company_id, deleted_at: { $ne: null } });
    if (session) deleter.session(session);
    return await deleter;
};

const hardDeleteCompanies = async (company_ids, session = null) => {
    const deleter = Company.deleteMany({ company_id: { $in: company_ids }, deleted_at: { $ne: null } });
    if (session) deleter.session(session);
    return await deleter;
};

const setRepresentativeUser = async (company_id, representative_user_id, session = null) => {
    const updater = Company.findOneAndUpdate(
        { company_id },
        { $set: { representative_user_id, updated_at: new Date() } },
        { new: true }
    );
    if (session) updater.session(session);
    return await updater;
};

const unsetRepresentativeUserIfMatches = async (company_id, representative_user_id, session = null) => {
    const updater = Company.findOneAndUpdate(
        { company_id, representative_user_id },
        { $set: { representative_user_id: null, updated_at: new Date() } },
        { new: true }
    );
    if (session) updater.session(session);
    return await updater;
};

// Thêm vào cuối file companyRepository.js

const addLicenseToCompany = async (company_id, licenseData, userId, session = null) => {
    const result = await Company.findOneAndUpdate(
        { company_id, deleted_at: null },
        {
            $push: {
                licenses: {
                    ...licenseData,
                    license_id: licenseData.license_id,
                    created_by: userId,
                    updated_by: userId,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            },
            $set: { updated_by: userId, updated_at: new Date() }
        },
        { new: true, session }
    );
    return result;
};

const updateLicenseInCompany = async (company_id, license_id, updateData, userId, session = null) => {
    return await Company.findOneAndUpdate(
        {
            company_id,
            deleted_at: null,
            'licenses.license_id': license_id
        },
        {
            $set: {
                'licenses.$.license_name': updateData.license_name,
                'licenses.$.issuing_authority': updateData.issuing_authority,
                'licenses.$.issue_date': updateData.issue_date,
                'licenses.$.expiry_date': updateData.expiry_date,
                'licenses.$.file_url': updateData.file_url || null,
                'licenses.$.updated_by': userId,
                'licenses.$.updated_at': new Date(),
                updated_by: userId,
                updated_at: new Date()
            }
        },
        { new: true, session }
    );
};

const deleteLicenseFromCompany = async (company_id, license_id, userId, session = null) => {
    return await Company.findOneAndUpdate(
        { company_id, deleted_at: null },
        {
            $pull: { licenses: { license_id: license_id } },
            $set: { updated_by: userId, updated_at: new Date() }
        },
        { new: true, session }
    );
};

const getLicenseById = async (company_id, license_id) => {
    const company = await Company.findOne(
        { company_id, deleted_at: null },
        { 'licenses.$': 1 }
    ).elemMatch('licenses', { license_id: license_id }).lean();

    return company?.licenses?.[0] || null;
};

const deleteMultipleLicensesFromCompany = async (company_id, license_ids, userId, session = null) => {
    return await Company.findOneAndUpdate(
        { company_id, deleted_at: null },
        {
            $pull: {
                licenses: {
                    license_id: { $in: license_ids }
                }
            },
            $set: { updated_by: userId, updated_at: new Date() }
        },
        { new: true, session }
    );
};

/**
 * Truy vấn danh sách doanh nghiệp (phân trang cursor-based) kèm lookup tên KCN/KCX.
 * Dùng chung cho cả API "đã khai báo" và "chưa khai báo".
 *
 * @param {Object}  opts
 * @param {string[]} [opts.companyIds]       - Chỉ lấy các company_id nằm trong danh sách này ($in)
 * @param {string[]} [opts.excludeIds]       - Loại trừ các company_id này ($nin)
 * @param {string}   [opts.zone_id]          - Scope zone cho manager
 * @param {string}   [opts.search]           - Tìm kiếm theo tên doanh nghiệp
 * @param {Object}   [opts.filters]          - Bộ lọc bổ sung (zone_id, status, industry_group, company_type)
 * @param {string}   [opts.lastId]           - Cursor phân trang (company_id của phần tử cuối trang trước)
 * @param {number}   [opts.limit=20]         - Số lượng mỗi trang (tối đa 100)
 * @returns {{ enterprises: Array, hasMore: boolean, lastId: string|null }}
 */
const getEnterpriseListPage = async ({
    companyIds,
    excludeIds,
    zone_id,
    search,
    filters = {},
    lastId,
    limit = 20,
} = {}) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    // ── Build điều kiện match cơ bản ──
    const matchQuery = { deleted_at: null };

    // Lọc theo danh sách company_id ($in hoặc $nin)
    if (companyIds) matchQuery.company_id = { $in: companyIds };
    if (excludeIds) matchQuery.company_id = { ...(matchQuery.company_id || {}), $nin: excludeIds };

    // Phân quyền zone cho manager + Các filter bổ sung từ client
    if (zone_id) {
        // Nếu manager bị giới hạn bởi quyền Auth thì bắt buộc gán cứng
        matchQuery.zone_id = zone_id;
    } else if (filters.zone_id) {
        // Chỉ xử lý filter do admin truyền vào (support query $in array)
        if (Array.isArray(filters.zone_id)) {
            matchQuery.zone_id = { $in: filters.zone_id };
        } else {
            matchQuery.zone_id = filters.zone_id;
        }
    }

    if (filters.status) matchQuery.status = filters.status;
    if (filters.industry_group) {
        matchQuery.industry_group = Array.isArray(filters.industry_group)
            ? { $in: filters.industry_group }
            : filters.industry_group;
    }
    if (filters.company_type) matchQuery.company_type = filters.company_type;

    // Tìm kiếm theo tên doanh nghiệp
    if (search && typeof search === 'string' && search.trim()) {
        const normalizedSearch = search.trim().normalize('NFC').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        matchQuery.company_name = { $regex: normalizedSearch, $options: 'i' };
    }

    // Cursor-based pagination (sort theo company_id ASC)
    if (lastId) {
        matchQuery.company_id = { ...(matchQuery.company_id || {}), $gt: lastId };
    }

    // ── Aggregate pipeline: match → sort → limit → lookup zone_name → project ──
    const pipeline = [
        { $match: matchQuery },
        { $sort: { company_id: 1 } },
        { $limit: safeLimit + 1 },
        // Lookup tên khu công nghiệp / khu chế xuất
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        { $unwind: { path: '$zone_info', preserveNullAndEmptyArrays: true } },
        // Chỉ trả về các trường cần thiết
        {
            $project: {
                _id: 0,
                company_id: 1,
                company_name: 1,
                zone_id: 1,
                zone_name: { $ifNull: ['$zone_info.zone_name', null] },
            },
        },
    ];

    const results = await Company.aggregate(pipeline);

    // Xác định có trang tiếp theo hay không
    const hasMore = results.length > safeLimit;
    const page = hasMore ? results.slice(0, safeLimit) : results;
    const newLastId = page.length > 0 ? page[page.length - 1].company_id : null;

    return { enterprises: page, hasMore, lastId: newLastId };
};

const getEnterpriseYearlyMatrixPage = async ({
    year,
    zone_id,
    search,
    filters = {},
    lastId,
    limit = 20,
} = {}) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const matchQuery = { deleted_at: null };
    if (zone_id) {
        matchQuery.zone_id = zone_id;
    } else if (filters.zone_id) {
        if (Array.isArray(filters.zone_id)) {
            matchQuery.zone_id = { $in: filters.zone_id };
        } else {
            matchQuery.zone_id = filters.zone_id;
        }
    }
    if (filters.status) matchQuery.status = filters.status;
    if (filters.industry_group) {
        matchQuery.industry_group = Array.isArray(filters.industry_group)
            ? { $in: filters.industry_group }
            : filters.industry_group;
    }
    if (filters.company_type) matchQuery.company_type = filters.company_type;

    if (search && typeof search === 'string' && search.trim()) {
        const normalizedSearch = search.trim().normalize('NFC').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        matchQuery.company_name = { $regex: normalizedSearch, $options: 'i' };
    }

    if (lastId) {
        matchQuery.company_id = { ...(matchQuery.company_id || {}), $gt: lastId };
    }

    const startPeriod = Number(`${year}01`);
    const endPeriod = Number(`${year}12`);

    const pipeline = [
        { $match: matchQuery },
        { $sort: { company_id: 1 } },
        { $limit: safeLimit + 1 },
        {
            $lookup: {
                from: 'industrialzones',
                localField: 'zone_id',
                foreignField: 'zone_id',
                as: 'zone_info',
            },
        },
        { $unwind: { path: '$zone_info', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'summaryrecords',
                let: { company_id: '$company_id' },
                pipeline: [
                    { 
                        $match: { 
                            $expr: { $eq: ['$company_id', '$$company_id'] },
                            periodKey: { $gte: startPeriod, $lte: endPeriod },
                            isDeleted: { $ne: true }
                        }
                    },
                    { $project: { periodKey: 1, _id: 0 } }
                ],
                as: 'declarations',
            },
        },
        {
            $project: {
                _id: 0,
                company_id: 1,
                company_name: 1,
                zone_id: 1,
                zone_name: { $ifNull: ['$zone_info.zone_name', null] },
                declarations: 1
            },
        },
    ];

    const results = await Company.aggregate(pipeline);
    
    // Transform declarations array into matrix object { "m1": true, "m2": false ... }
    const enterprises = results.map(ent => {
        const matrix = {};
        for (let i = 1; i <= 12; i++) {
            const pk = Number(`${year}${String(i).padStart(2, '0')}`);
            matrix[`m${i}`] = ent.declarations.some(d => d.periodKey === pk);
        }
        ent.declarations = matrix; // replace array with matrix object
        return ent;
    });

    const hasMore = enterprises.length > safeLimit;
    const page = hasMore ? enterprises.slice(0, safeLimit) : enterprises;
    const newLastId = page.length > 0 ? page[page.length - 1].company_id : null;

    return { enterprises: page, hasMore, lastId: newLastId };
};

module.exports = {
    getCompanyById,
    createCompany,
    countCompanies,
    deleteCompanyById,
    deleteAllCompanies,
    restoreCompany,
    updateCompany,
    updateCompanyWithVersion,
    getAllCompanies,
    getCompanyByName,
    findOne,
    find,
    aggregate,
    countDocuments,
    getDeletedCompanies,
    findExists,
    getCompanyNameById,
    getZoneIdByCompanyId,
    getCompaniesWithAffectedUsers,
    hardDeleteCompany,
    hardDeleteCompanies,
    setRepresentativeUser,
    unsetRepresentativeUserIfMatches,
    addLicenseToCompany,
    updateLicenseInCompany,
    deleteLicenseFromCompany,
    getLicenseById,
    deleteMultipleLicensesFromCompany,
    getlistCompanyNameByIds,
    getCompanyIdsByZoneId,
    getAllCompanyIds,
    getEnterpriseListPage,
    getEnterpriseYearlyMatrixPage
};

