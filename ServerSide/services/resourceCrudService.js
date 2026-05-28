const summaryRecordRepository = require('../dataAccess/summaryRecordRepository');
const resoureceAndWasteRepository = require('../dataAccess/resoureceAndWasteRepository');
const companyRepository = require('../dataAccess/companyRepository');
const industrialzonesRepository = require('../dataAccess/industrialZoneRepository');
const resourceVersionModel = require('../models/resourceVersionModel');
const userRepository = require('../dataAccess/userRepository');
const { convertUsingGetName } = require('../utils/abbreviationInMemory');
const { commitTransaction } = require('./versionManagerService');
const {
    MissingVersionError,
    VersionConflictError,
    StateConflictError,
} = require('../utils/conflictError');
const DELETED_ACCOUNT_FALLBACK = {
    name: 'Tài khoản đã xóa',
    email: 'Tài khoản đã xóa',
};

const {
    groupMapping, subgroupMapping, modelMap,
    WASTE_VIETNAMESE_NAMES,
} = require('../constantField/resourceMappings');
const { initQueryGetDataResource, formatDate } = require('../utils/resourceHelpers');
const { processSection } = require('./resourceSectionProcessor');

const MONTH_ALREADY_DECLARED = {
    success: false,
    statusCode: 409,
    conflict: 'month_exists',
    message: 'Tháng này đã có dữ liệu tài nguyên/chất thải. Vui lòng vào trang cập nhật.',
};

// ============================================================================
//  PUBLIC API
// ============================================================================

const processResourceDataCreate = async (rawData, company_id, zone_id, periodKey, session, user_id) => {
    let effectiveZoneId = zone_id;
    if (!effectiveZoneId) {
        const zoneDoc = await companyRepository.getZoneIdByCompanyId(company_id, session);
        if (!zoneDoc) throw new Error(`Company ${company_id} not found`);
        effectiveZoneId = zoneDoc.zone_id;
    }

    const existed = await summaryRecordRepository.checkSummaryExists(company_id, effectiveZoneId, periodKey, session);
    if (existed) return MONTH_ALREADY_DECLARED;

    try {
        await summaryRecordRepository.claimSummaryRecord(company_id, effectiveZoneId, periodKey, session);
    } catch (error) {
        if (error?.code === 11000) {
            return MONTH_ALREADY_DECLARED;
        }
        throw error;
    }

    const txChanges = [];
    const monthHasData = await resoureceAndWasteRepository.checkMonthHasData(company_id, effectiveZoneId, periodKey, session);

    if (!monthHasData) {
        txChanges.push({
            resourceType: 'all', resourceId: null, actionType: 'init',
            oldObj: null, newObj: null, groupLabel: null,
            company_id, zone_id: effectiveZoneId, periodKey,
        });
        await commitTransaction({ changes: txChanges, modifiedBy: user_id, session });
    }

    const summaryData = summaryRecordRepository.createEmptySummaryData();
    const createdFuelIds = [];
    const createdWasteIds = [];
    const ctx = { company_id, zone_id: effectiveZoneId, periodKey, session, summaryData, txChanges, monthHasData, createdFuelIds, createdWasteIds };

    await processSection('Nguyên vật liệu', rawData['Nguyên vật liệu'], ctx);
    await processSection('Hóa chất', rawData['Hóa chất'], ctx);
    await processSection('Điện', rawData['Điện'], ctx);
    await processSection('Nước', rawData['Nước'], ctx);
    await processSection('Chất đốt & Nhiên liệu', rawData['Chất đốt & Nhiên liệu'], ctx);
    await processSection('Chất thải', rawData['Chất thải'], ctx);

    await summaryRecordRepository.updateSummaryRecord(company_id, effectiveZoneId, periodKey, summaryData, session);
    return { success: true, company_id, zone_id: effectiveZoneId, periodKey, createdFuelIds, createdWasteIds };
};

const processResourceDataUpdate = async (rawData, company_id, periodKey, session, user_id) => {
    const zoneDoc = await companyRepository.getZoneIdByCompanyId(company_id, session);
    if (!zoneDoc) throw new Error(`Company ${company_id} not found`);
    const zone_id = zoneDoc.zone_id;
    const summaryVersion = Number(rawData?.summaryVersion);

    if (!Number.isInteger(summaryVersion) || summaryVersion < 0) {
        throw new MissingVersionError('Thiếu phiên bản kỳ khai báo hiện tại. Vui lòng tải lại dữ liệu trước khi lưu.');
    }

    const activeSummaryRecord = await summaryRecordRepository.getActiveSummaryRecord(company_id, zone_id, periodKey, session);
    if (!activeSummaryRecord) {
        throw new StateConflictError('Kỳ khai báo này không còn tồn tại hoặc đã bị thay đổi trạng thái. Vui lòng tải lại dữ liệu.');
    }

    const claimedSummary = await summaryRecordRepository.claimSummaryVersion(
        company_id,
        zone_id,
        periodKey,
        summaryVersion,
        session
    );

    if (!claimedSummary) {
        throw new VersionConflictError('Kỳ khai báo này vừa được người khác cập nhật. Vui lòng tải lại dữ liệu rồi thử lại.');
    }

    const txChanges = [];
    const monthHasData = await resoureceAndWasteRepository.checkMonthHasData(company_id, zone_id, periodKey, session);
    const summaryData = summaryRecordRepository.createEmptySummaryData();
    const createdFuelIds = [];
    const createdWasteIds = [];
    const ctx = { company_id, zone_id, periodKey, session, summaryData, txChanges, monthHasData, createdFuelIds, createdWasteIds };

    await processSection('Nguyên vật liệu', rawData['Nguyên vật liệu'], ctx);
    await processSection('Hóa chất', rawData['Hóa chất'], ctx);
    await processSection('Điện', rawData['Điện'], ctx);
    await processSection('Nước', rawData['Nước'], ctx);
    await processSection('Chất đốt & Nhiên liệu', rawData['Chất đốt & Nhiên liệu'], ctx);
    await processSection('Chất thải', rawData['Chất thải'], ctx);

    if (txChanges.length > 0) {
        await commitTransaction({ changes: txChanges, modifiedBy: user_id, session });
    }

    return { success: true, company_id, zone_id, periodKey, createdFuelIds, createdWasteIds };
};

const processGetListDataResource = async (periodKeyStart, periodKeyEnd, include, role, company_id, zone_id, skipConvert = false, session = null) => {
    const results = {};
    const groupQueries = {};

    const baseQuery = initQueryGetDataResource(periodKeyStart, periodKeyEnd, role, company_id, zone_id);

    const filteredInclude = include.filter(num => {
        const groupKey = groupMapping[num];
        if (!groupKey) return false;

        for (const [mainGroup, subs] of Object.entries(subgroupMapping)) {
            if (subs.includes(groupKey)) {
                const mainGroupNum = Object.keys(groupMapping).find(k => groupMapping[k] === mainGroup);
                if (include.includes(Number(mainGroupNum))) return false;
            }
        }
        return true;
    });

    for (const num of filteredInclude) {
        const groupKey = groupMapping[num];
        if (!groupKey) continue;

        let mainGroup = null;
        if (subgroupMapping[groupKey]) {
            mainGroup = groupKey;
        } else {
            for (const [group, subs] of Object.entries(subgroupMapping)) {
                if (subs.includes(groupKey)) { mainGroup = group; break; }
            }
        }
        if (!mainGroup) continue;

        const modelName = modelMap[mainGroup];
        if (!modelName) continue;

        if (!groupQueries[modelName]) {
            groupQueries[modelName] = { mainGroups: [], subGroups: [] };
        }

        if (subgroupMapping[groupKey]) {
            groupQueries[modelName].mainGroups.push(mainGroup);
        } else {
            groupQueries[modelName].subGroups.push(groupKey);
        }
    }

    const fetchPromises = Object.entries(groupQueries).map(async ([modelName, { mainGroups, subGroups }]) => {
        let groupQuery = { $or: [] };

        if (modelName === 'WasteResource') {
            const allWasteGroups = [...subgroupMapping['waste'], ...WASTE_VIETNAMESE_NAMES];
            groupQuery = { main_group: { $in: allWasteGroups } };
        } else {
            const orConditions = [];
            if (mainGroups.length > 0) orConditions.push({ main_group: { $in: mainGroups } });
            if (subGroups.length > 0) orConditions.push({ sub_group: { $in: subGroups } });
            if (orConditions.length > 0) groupQuery = { $or: orConditions };
        }

        const finalQuery = {
            ...baseQuery,
            ...(Object.keys(groupQuery).length > 0 ? groupQuery : {}),
        };

        const data = await resoureceAndWasteRepository.getListData(finalQuery, modelName, session);
        return {
            modelName,
            data: skipConvert ? data : data.map(item => convertUsingGetName(item))
        };
    });

    const resolvedData = await Promise.all(fetchPromises);
    for (const res of resolvedData) {
        results[res.modelName] = res.data;
    }

    return results;
};

const getAllResourceDataWithHistory = async (company_id, zone_id, periodKey, include = [1, 2, 3, 4, 5, 6], role) => {
    const [company, zone, summaryRecord] = await Promise.all([
        companyRepository.getCompanyNameById(company_id),
        industrialzonesRepository.getZoneNameById(zone_id),
        summaryRecordRepository.getActiveSummaryRecord(company_id, zone_id, periodKey)
    ]);
    if (!company || !zone) throw new Error('Company or Zone not found');

    const snapshot = await processGetListDataResource(periodKey, null, include, role, company_id, zone_id);

    const versions = await resourceVersionModel.find(
        { company_id, zone_id, periodKey },
        { oldData: 0, newData: 0 }
    ).sort({ modifiedAt: 1 }).lean();

    const created_at = versions.length > 0 ? formatDate(versions[0].modifiedAt) : null;

    const userIds = [...new Set(versions.map(v => v.modifiedBy).filter(Boolean))];
    const users = await userRepository.getNameByUserId(userIds);
    const userMap = {};
    for (const u of users) {
        userMap[u._id.toString()] = {
            name: u.fullName || DELETED_ACCOUNT_FALLBACK.name,
            email: u.email || DELETED_ACCOUNT_FALLBACK.email
        };
    }

    const transactionMap = {};
    for (const v of versions) {
        const transId = v.transactionId;
        if (!transactionMap[transId]) {
            transactionMap[transId] = {
                trans_id: transId,
                modifiedAt: v.modifiedAt,
                timeLabel: formatDate(v.modifiedAt),
                modifiedBy: {
                    name: userMap[v.modifiedBy?.toString()]?.name || DELETED_ACCOUNT_FALLBACK.name,
                    email: userMap[v.modifiedBy?.toString()]?.email || DELETED_ACCOUNT_FALLBACK.email
                },
                changes: []
            };
        }
        transactionMap[transId].changes.push({
            commitMessage: v.commitMessage,
            diff: v.changes,
            actionType: v.actionType
        });
    }

    const resource_change = Object.values(transactionMap).sort(
        (a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)
    );

    const firstVersion = versions.length > 0 ? versions[0] : null;
    const createdBy = firstVersion && firstVersion.modifiedBy
        ? {
            name: userMap[firstVersion.modifiedBy.toString()]?.name || DELETED_ACCOUNT_FALLBACK.name,
            email: userMap[firstVersion.modifiedBy.toString()]?.email || DELETED_ACCOUNT_FALLBACK.email
        }
        : null;

    return {
        company_name: company ? company.company_name : '(Không rõ tên)',
        zone_name: zone ? zone.zone_name : '(Không rõ tên)',
        created_at,
        periodKey,
        summaryVersion: summaryRecord?.__v ?? null,
        createdBy,
        resource_change,
        input: snapshot.InputResource || [],
        fuel: snapshot.FuelResource || [],
        waste: snapshot.WasteResource || []
    };
};

module.exports = {
    processResourceDataCreate,
    processGetListDataResource,
    processResourceDataUpdate,
    getAllResourceDataWithHistory,
};
