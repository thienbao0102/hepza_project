const InputResourceModel = require('../models/inputResourcesModel');
const FuelResourceModel = require('../models/fuelResourcesModel');
const WasteResourceModel = require('../models/wasteResourcesModel');
const resoureceAndWasteRepository = require('../dataAccess/resoureceAndWasteRepository');
const { commitTransaction, computeDiff } = require('./versionManagerService');
const { capitalizeFirst, normalizeString, pickChangedFields } = require('../utils/resourceHelpers');

const INPUT_GROUP_SETTINGS = {
    material: { defaultSubGroup: 'MOTH', defaultUnit: 'Tấn', groupLabel: 'Nguyên vật liệu' },
    chemical: { defaultSubGroup: 'CHOT', defaultUnit: 'Kg', groupLabel: 'Hóa chất' },
};

const FUEL_GROUP_SETTINGS = {
    el: { defaultSubGroup: 'Grid', defaultUnit: 'kWh', groupLabel: 'Điện' },
    wa: { defaultSubGroup: 'tap', defaultUnit: 'm³', groupLabel: 'Nước' },
    co: { defaultSubGroup: 'PET', defaultUnit: 'Lít', groupLabel: 'Chất đốt' },
};

const WASTE_GROUP_SETTING = {
    defaultSubGroup: 'DO',
    defaultUnit: 'Tấn',
    groupLabel: 'Chất thải',
};

const MAIN_GROUP_ORDER = ['material', 'chemical', 'el', 'wa', 'co', 'waste'];

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const normalizeKeyPart = (value) => normalizeString(value === undefined || value === null ? '' : value);

const coalesceDefined = (value, fallback) => (typeof value !== 'undefined' ? value : fallback);

const createGroupSummary = () => ({ added: 0, updated: 0, skipped: 0, deleted: 0 });

const createSummary = () => {
    const byType = {};
    for (const key of MAIN_GROUP_ORDER) {
        byType[key] = createGroupSummary();
    }

    return {
        total: 0,
        added: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        byType,
    };
};

const buildIndexedSnapshots = (items, keyBuilder) => {
    const byKey = new Map();
    const byId = new Map();

    for (const item of items || []) {
        const id = String(item?._id || '');
        if (!id) continue;

        byId.set(id, item);
        const key = keyBuilder(item);
        if (key) {
            byKey.set(key, item);
        }
    }

    return { byKey, byId };
};

const buildInputKey = (entry, groupKey) => {
    const settings = INPUT_GROUP_SETTINGS[groupKey];
    const subGroup = entry.sub_group || settings?.defaultSubGroup || 'MOTH';
    const name = entry.name || entry.label || '';
    return `${groupKey}|${normalizeKeyPart(subGroup)}|${normalizeKeyPart(name)}`;
};

const buildFuelKey = (entry, groupKey) => {
    const settings = FUEL_GROUP_SETTINGS[groupKey];
    const subGroup = entry.sub_group || settings?.defaultSubGroup || 'Grid';
    const name = entry.fuelName || entry.name || entry.label || '';
    return `${groupKey}|${normalizeKeyPart(subGroup)}|${normalizeKeyPart(name)}`;
};

const buildWasteKey = (entry) => {
    const mainGroup = entry.main_group || entry.sub_group || WASTE_GROUP_SETTING.defaultSubGroup;
    const name = entry.wasteName || entry.name || entry.label || '';
    const codeWaste = entry.codeWaste || '';
    const status = entry.status || '';
    return `${normalizeKeyPart(mainGroup)}|${normalizeKeyPart(name)}|${normalizeKeyPart(codeWaste)}|${normalizeKeyPart(status)}`;
};

const buildInputSnapshot = (existing, item, groupKey) => {
    const settings = INPUT_GROUP_SETTINGS[groupKey];
    const subGroup = item.sub_group || existing?.sub_group || settings?.defaultSubGroup || 'MOTH';
    const unit = item.unit || existing?.unit || settings?.defaultUnit || 'Tấn';

    return {
        ...(existing || {}),
        name: capitalizeFirst(item.name || existing?.name || ''),
        quantity: toNumber(item.quantity),
        unit,
        note: coalesceDefined(item.note, existing?.note ?? ''),
        main_group: groupKey,
        sub_group: subGroup,
        hazardLevel: coalesceDefined(item.hazardLevel, existing?.hazardLevel ?? null),
    };
};

const buildFuelSnapshot = (existing, item, groupKey) => {
    const settings = FUEL_GROUP_SETTINGS[groupKey];
    const quantity = toNumber(item.quantity);
    const subGroup = item.sub_group || existing?.sub_group || settings?.defaultSubGroup || 'Grid';
    const unit = item.unit || existing?.unit || settings?.defaultUnit || 'kWh';

    const nextSnapshot = {
        ...(existing || {}),
        fuelName: capitalizeFirst(item.name || existing?.fuelName || ''),
        quantity,
        unit,
        note: coalesceDefined(item.note, existing?.note ?? ''),
        main_group: groupKey,
        sub_group: subGroup,
        detail: existing?.detail ? { ...existing.detail } : null,
    };

    if (groupKey === 'wa') {
        const detail = existing?.detail || {};
        nextSnapshot.detail = {
            production: quantity,
            domestic: toNumber(detail.domestic),
            irrigation: toNumber(detail.irrigation),
            other: toNumber(detail.other),
        };
    } else if (groupKey === 'co') {
        const detail = existing?.detail || {};
        nextSnapshot.detail = {
            purpose: coalesceDefined(item.note, detail.purpose ?? ''),
        };
    }

    return nextSnapshot;
};

const buildWasteSnapshot = (existing, item) => {
    const mainGroup = item.sub_group || existing?.main_group || WASTE_GROUP_SETTING.defaultSubGroup;
    const isGasWaste = String(mainGroup || '').toUpperCase() === 'GASW';

    return {
        ...(existing || {}),
        wasteName: capitalizeFirst(item.name || existing?.wasteName || ''),
        quantity: toNumber(item.quantity),
        unit: isGasWaste ? 'mg/l' : (item.unit || existing?.unit || WASTE_GROUP_SETTING.defaultUnit),
        codeWaste: coalesceDefined(item.codeWaste, existing?.codeWaste ?? null),
        status: coalesceDefined(item.status, existing?.status ?? null),
        note: coalesceDefined(item.note, existing?.note ?? ''),
        treatmentMethods: coalesceDefined(item.treatmentMethods, existing?.treatmentMethods ?? null),
        main_group: mainGroup,
    };
};

const compareSnapshots = (existingSnapshot, proposedSnapshot, resourceType) => {
    const { oldData, newData } = pickChangedFields(existingSnapshot, proposedSnapshot, resourceType);
    if (!existingSnapshot) {
        return { oldData, newData, hasDiff: true };
    }

    return {
        oldData,
        newData,
        hasDiff: !!computeDiff(oldData, newData),
    };
};

const buildChangeRecord = ({
    resourceType,
    resourceId,
    oldObj,
    newObj,
    company_id,
    zone_id,
    periodKey,
    actionType,
    groupLabel,
}) => ({
    resourceType,
    resourceId,
    oldObj,
    newObj,
    company_id,
    zone_id,
    periodKey,
    actionType,
    groupLabel,
});

const loadExistingSnapshots = async (company_id, zone_id, periodKey, session) => {
    const baseQuery = {
        company_id,
        zone_id,
        periodKey,
        isDeleted: { $ne: true },
    };

    const material = await resoureceAndWasteRepository.getListData({ ...baseQuery, main_group: 'material' }, 'InputResource', session);
    const chemical = await resoureceAndWasteRepository.getListData({ ...baseQuery, main_group: 'chemical' }, 'InputResource', session);
    const el = await resoureceAndWasteRepository.getListData({ ...baseQuery, main_group: 'el' }, 'FuelResource', session);
    const wa = await resoureceAndWasteRepository.getListData({ ...baseQuery, main_group: 'wa' }, 'FuelResource', session);
    const co = await resoureceAndWasteRepository.getListData({ ...baseQuery, main_group: 'co' }, 'FuelResource', session);
    const waste = await resoureceAndWasteRepository.getListData(baseQuery, 'WasteResource', session);

    return {
        material: material || [],
        chemical: chemical || [],
        el: el || [],
        wa: wa || [],
        co: co || [],
        waste: waste || [],
    };
};

const getFuelDetailModel = (groupKey) => {
    return null; // Fuel detail models removed
};

const findFuelDetail = async (doc, session) => {
    return { detailDoc: null, detailId: null, linkedByFuelId: false };
};

const applyFuelDetailSnapshot = async (doc, proposedSnapshot, session) => {
    return { detailId: null, created: false };
};

const saveInputSnapshot = async ({
    existingSnapshot,
    proposedSnapshot,
    groupKey,
    company_id,
    zone_id,
    periodKey,
    session,
}) => {
    let doc = existingSnapshot
        ? await InputResourceModel.findById(existingSnapshot._id).session(session)
        : null;

    if (!doc) {
        doc = new InputResourceModel(existingSnapshot ? { _id: existingSnapshot._id } : {});
    }

    doc.name = proposedSnapshot.name;
    doc.quantity = proposedSnapshot.quantity;
    doc.unit = proposedSnapshot.unit;
    doc.note = proposedSnapshot.note;
    doc.company_id = company_id;
    doc.zone_id = zone_id;
    doc.periodKey = periodKey;
    doc.main_group = groupKey;
    doc.sub_group = proposedSnapshot.sub_group;
    doc.hazardLevel = proposedSnapshot.hazardLevel ?? null;
    doc.isDeleted = false;

    await doc.save({ session });
    return doc;
};

const saveFuelSnapshot = async ({
    existingSnapshot,
    proposedSnapshot,
    groupKey,
    company_id,
    zone_id,
    periodKey,
    session,
}) => {
    let doc = existingSnapshot
        ? await FuelResourceModel.findById(existingSnapshot._id).session(session)
        : null;

    if (!doc) {
        doc = new FuelResourceModel(existingSnapshot ? { _id: existingSnapshot._id } : {});
    }

    doc.fuelName = proposedSnapshot.fuelName;
    doc.quantity = proposedSnapshot.quantity;
    doc.unit = proposedSnapshot.unit;
    doc.note = proposedSnapshot.note;
    doc.company_id = company_id;
    doc.zone_id = zone_id;
    doc.periodKey = periodKey;
    doc.main_group = groupKey;
    doc.sub_group = proposedSnapshot.sub_group;
    doc.isDeleted = false;

    await doc.save({ session });

    // Fuel detail logic removed

    return doc;
};

const saveWasteSnapshot = async ({
    existingSnapshot,
    proposedSnapshot,
    company_id,
    zone_id,
    periodKey,
    session,
}) => {
    let doc = existingSnapshot
        ? await WasteResourceModel.findById(existingSnapshot._id).session(session)
        : null;

    if (!doc) {
        doc = new WasteResourceModel(existingSnapshot ? { _id: existingSnapshot._id } : {});
    }

    doc.wasteName = proposedSnapshot.wasteName;
    doc.quantity = proposedSnapshot.quantity;
    doc.unit = proposedSnapshot.unit;
    doc.codeWaste = proposedSnapshot.codeWaste;
    doc.status = proposedSnapshot.status;
    doc.note = proposedSnapshot.note;
    doc.treatmentMethods = proposedSnapshot.treatmentMethods;
    doc.company_id = company_id;
    doc.zone_id = zone_id;
    doc.periodKey = periodKey;
    doc.main_group = proposedSnapshot.main_group;
    doc.isDeleted = false;

    await doc.save({ session });
    return doc;
};

const deleteFuelSnapshot = async (doc, session) => {
    doc.isDeleted = true;
    await doc.save({ session });
};

const deleteInputSnapshot = async (doc, session) => {
    doc.isDeleted = true;
    await doc.save({ session });
};

const deleteWasteSnapshot = async (doc, session) => {
    doc.isDeleted = true;
    await doc.save({ session });
};

const processInputGroup = async (groupKey, items, ctx) => {
    const settings = INPUT_GROUP_SETTINGS[groupKey];
    if (!settings || !Array.isArray(items) || items.length === 0) {
        return;
    }

    const existingByKey = ctx.existingIndexes[groupKey].byKey;
    const processedIds = ctx.processedIds[groupKey];
    const groupSummary = ctx.summary.byType[groupKey];

    for (const item of items) {
        const existing = existingByKey.get(buildInputKey(item, groupKey));
        const proposedSnapshot = buildInputSnapshot(existing, item, groupKey);
        const comparison = compareSnapshots(existing, proposedSnapshot, 'InputResource');

        if (existing && !comparison.hasDiff) {
            processedIds.add(String(existing._id));
            groupSummary.skipped += 1;
            ctx.summary.skipped += 1;
            continue;
        }

        try {
            const doc = await saveInputSnapshot({
                existingSnapshot: existing,
                proposedSnapshot,
                groupKey,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                session: ctx.session,
            });

            processedIds.add(String(doc._id));

            const actionType = existing ? 'update' : 'create';
            groupSummary[actionType === 'create' ? 'added' : 'updated'] += 1;
            ctx.summary[actionType === 'create' ? 'added' : 'updated'] += 1;

            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'InputResource',
                resourceId: doc._id,
                oldObj: comparison.oldData,
                newObj: comparison.newData,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType,
                groupLabel: settings.groupLabel,
            }));
        } catch (error) {
            console.error(`Import sync error (${groupKey}) for item "${item.name}"`, error);
            if (existing) {
                processedIds.add(String(existing._id));
            }
        }
    }
};

const processFuelGroup = async (groupKey, items, ctx) => {
    const settings = FUEL_GROUP_SETTINGS[groupKey];
    if (!settings || !Array.isArray(items) || items.length === 0) {
        return;
    }

    const existingByKey = ctx.existingIndexes[groupKey].byKey;
    const processedIds = ctx.processedIds[groupKey];
    const groupSummary = ctx.summary.byType[groupKey];

    for (const item of items) {
        const existing = existingByKey.get(buildFuelKey(item, groupKey));
        const proposedSnapshot = buildFuelSnapshot(existing, item, groupKey);
        const comparison = compareSnapshots(existing, proposedSnapshot, 'FuelResource');

        if (existing && !comparison.hasDiff) {
            processedIds.add(String(existing._id));
            groupSummary.skipped += 1;
            ctx.summary.skipped += 1;
            continue;
        }

        try {
            const doc = await saveFuelSnapshot({
                existingSnapshot: existing,
                proposedSnapshot,
                groupKey,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                session: ctx.session,
            });

            processedIds.add(String(doc._id));

            const actionType = existing ? 'update' : 'create';
            groupSummary[actionType === 'create' ? 'added' : 'updated'] += 1;
            ctx.summary[actionType === 'create' ? 'added' : 'updated'] += 1;

            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'FuelResource',
                resourceId: doc._id,
                oldObj: comparison.oldData,
                newObj: comparison.newData,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType,
                groupLabel: settings.groupLabel,
            }));
        } catch (error) {
            console.error(`Import sync error (${groupKey}) for item "${item.name}"`, error);
            if (existing) {
                processedIds.add(String(existing._id));
            }
        }
    }
};

const processWasteGroup = async (items, ctx) => {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    const existingByKey = ctx.existingIndexes.waste.byKey;
    const processedIds = ctx.processedIds.waste;
    const groupSummary = ctx.summary.byType.waste;

    for (const item of items) {
        const existing = existingByKey.get(buildWasteKey(item));
        const proposedSnapshot = buildWasteSnapshot(existing, item);
        const comparison = compareSnapshots(existing, proposedSnapshot, 'WasteResource');

        if (existing && !comparison.hasDiff) {
            processedIds.add(String(existing._id));
            groupSummary.skipped += 1;
            ctx.summary.skipped += 1;
            continue;
        }

        try {
            const doc = await saveWasteSnapshot({
                existingSnapshot: existing,
                proposedSnapshot,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                session: ctx.session,
            });

            processedIds.add(String(doc._id));

            const actionType = existing ? 'update' : 'create';
            groupSummary[actionType === 'create' ? 'added' : 'updated'] += 1;
            ctx.summary[actionType === 'create' ? 'added' : 'updated'] += 1;

            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'WasteResource',
                resourceId: doc._id,
                oldObj: comparison.oldData,
                newObj: comparison.newData,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType,
                groupLabel: WASTE_GROUP_SETTING.groupLabel,
            }));
        } catch (error) {
            console.error(`Import sync error (waste) for item "${item.name}"`, error);
            if (existing) {
                processedIds.add(String(existing._id));
            }
        }
    }
};

const deleteMissingInputs = async (groupKey, ctx) => {
    const existingById = ctx.existingIndexes[groupKey].byId;
    const processedIds = ctx.processedIds[groupKey];
    const groupSummary = ctx.summary.byType[groupKey];
    const settings = INPUT_GROUP_SETTINGS[groupKey];

    for (const [id, snapshot] of existingById.entries()) {
        if (processedIds.has(id)) {
            continue;
        }

        try {
            const doc = await InputResourceModel.findById(id).session(ctx.session);
            if (!doc) {
                continue;
            }

            const { oldData } = pickChangedFields(snapshot, null, 'InputResource');
            await deleteInputSnapshot(doc, ctx.session);

            groupSummary.deleted += 1;
            ctx.summary.deleted += 1;
            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'InputResource',
                resourceId: id,
                oldObj: oldData,
                newObj: null,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType: 'delete',
                groupLabel: settings.groupLabel,
            }));
        } catch (error) {
            console.error(`Delete sync error (${groupKey}) for resource "${snapshot.name || snapshot.label || id}"`, error);
        }
    }
};

const deleteMissingFuels = async (groupKey, ctx) => {
    const existingById = ctx.existingIndexes[groupKey].byId;
    const processedIds = ctx.processedIds[groupKey];
    const groupSummary = ctx.summary.byType[groupKey];
    const settings = FUEL_GROUP_SETTINGS[groupKey];

    for (const [id, snapshot] of existingById.entries()) {
        if (processedIds.has(id)) {
            continue;
        }

        try {
            const doc = await FuelResourceModel.findById(id).session(ctx.session);
            if (!doc) {
                continue;
            }

            const { oldData } = pickChangedFields(snapshot, null, 'FuelResource');
            await deleteFuelSnapshot(doc, ctx.session);

            groupSummary.deleted += 1;
            ctx.summary.deleted += 1;
            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'FuelResource',
                resourceId: id,
                oldObj: oldData,
                newObj: null,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType: 'delete',
                groupLabel: settings.groupLabel,
            }));
        } catch (error) {
            console.error(`Delete sync error (${groupKey}) for resource "${snapshot.fuelName || snapshot.label || id}"`, error);
        }
    }
};

const deleteMissingWaste = async (ctx) => {
    const existingById = ctx.existingIndexes.waste.byId;
    const processedIds = ctx.processedIds.waste;
    const groupSummary = ctx.summary.byType.waste;

    for (const [id, snapshot] of existingById.entries()) {
        if (processedIds.has(id)) {
            continue;
        }

        try {
            const doc = await WasteResourceModel.findById(id).session(ctx.session);
            if (!doc) {
                continue;
            }

            const { oldData } = pickChangedFields(snapshot, null, 'WasteResource');
            await deleteWasteSnapshot(doc, ctx.session);

            groupSummary.deleted += 1;
            ctx.summary.deleted += 1;
            ctx.txChanges.push(buildChangeRecord({
                resourceType: 'WasteResource',
                resourceId: id,
                oldObj: oldData,
                newObj: null,
                company_id: ctx.company_id,
                zone_id: ctx.zone_id,
                periodKey: ctx.periodKey,
                actionType: 'delete',
                groupLabel: WASTE_GROUP_SETTING.groupLabel,
            }));
        } catch (error) {
            console.error(`Delete sync error (waste) for resource "${snapshot.wasteName || snapshot.label || id}"`, error);
        }
    }
};

const processImportResourceData = async (data, company_id, zone_id, periodKey, session, user_id, options = {}) => {
    try {
        const summary = createSummary();
        const txChanges = [];

        const existingSnapshots = await loadExistingSnapshots(company_id, zone_id, periodKey, session);
        const existingIndexes = {
            material: buildIndexedSnapshots(existingSnapshots.material, (entry) => buildInputKey(entry, 'material')),
            chemical: buildIndexedSnapshots(existingSnapshots.chemical, (entry) => buildInputKey(entry, 'chemical')),
            el: buildIndexedSnapshots(existingSnapshots.el, (entry) => buildFuelKey(entry, 'el')),
            wa: buildIndexedSnapshots(existingSnapshots.wa, (entry) => buildFuelKey(entry, 'wa')),
            co: buildIndexedSnapshots(existingSnapshots.co, (entry) => buildFuelKey(entry, 'co')),
            waste: buildIndexedSnapshots(existingSnapshots.waste, buildWasteKey),
        };

        const processedIds = {
            material: new Set(),
            chemical: new Set(),
            el: new Set(),
            wa: new Set(),
            co: new Set(),
            waste: new Set(),
        };

        const ctx = {
            company_id,
            zone_id,
            periodKey,
            session,
            summary,
            txChanges,
            existingIndexes,
            processedIds,
            options,
        };

        await processInputGroup('material', data.material, ctx);
        await processInputGroup('chemical', data.chemical, ctx);
        await processFuelGroup('el', data.el, ctx);
        await processFuelGroup('wa', data.wa, ctx);
        await processFuelGroup('co', data.co, ctx);
        await processWasteGroup(data.waste, ctx);

        if (txChanges.length > 0 && user_id) {
            await commitTransaction({
                changes: txChanges,
                modifiedBy: user_id,
                commitMessage: '',
                session,
            });
        }

        summary.total = summary.added + summary.updated + summary.skipped;

        return {
            isSuccess: true,
            summary,
            company_id,
            zone_id,
            periodKey,
        };
    } catch (error) {
        console.error('------- processImportResourceData CRITICAL ERROR -------');
        console.error(error);
        console.error('--------------------------------------------------------');
        return { isSuccess: false, message: error.message };
    }
};

module.exports = { processImportResourceData };
