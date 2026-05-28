const inputResourcesModel = require('../models/inputResourcesModel');
const fuelResourcesModel = require('../models/fuelResourcesModel');
const wasteResourcesModel = require('../models/wasteResourcesModel');
const { capitalizeFirst } = require('../utils/resourceHelpers');

// ============= Constants ==================


const RESOURCE_MODELS = [inputResourcesModel, fuelResourcesModel, wasteResourcesModel];

const IS_NOT_DELETED_FILTER = {
  $or: [
    { isDeleted: { $exists: false } },
    { isDeleted: false }
  ]
};

const IS_DELETED_FILTER = {
  $or: [
    { isDeleted: { $exists: true } },
    { isDeleted: true }
  ]
};

// ============= Regex Helper ==================
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============= Vietnamese Name Helper ==================
const normalizeVietnamese = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const isSameVietnameseName = (name1, name2) => {
  if (!name1 || !name2) return false;
  return normalizeVietnamese(name1) === normalizeVietnamese(name2);
};

// ============= Generic Helpers ==================
const findExisting = async (Model, id, session) => {
  if (!id) return null;
  return await Model.findById(id).session(session);
};

const saveDocument = async (doc, session) => {
  await doc.save({ session });
  return doc;
};

const createDocument = async (Model, data, session) => {
  const [doc] = await Model.create([data], { session });
  return doc;
};

/**
 * Build a regex-safe name query for matching resource names
 */
const buildNameRegex = (label) => {
  return { $regex: new RegExp(`^\\s*${escapeRegex((label || '').trim())}\\s*$`, 'i') };
};

// ============= Bulk Operations (DRY delete/restore) ==================
/**
 * Perform bulk updateMany/deleteMany on multiple models sequentially
 * @param {Array} models - Array of Mongoose models
 * @param {Object} baseFilter - Base filter for the query
 * @param {'softDelete'|'hardDelete'|'restore'} action - Operation to perform
 * @param {Object} session - MongoDB session (optional)
 */
const bulkModelOperation = async (models, baseFilter, action, session = null) => {
  const opts = session ? { session } : {};

  const results = [];

  for (const Model of models) {
    if (action === 'hardDelete') {
      results.push(await Model.deleteMany(baseFilter, opts));
      continue;
    }

    const stateFilter = action === 'softDelete' ? IS_NOT_DELETED_FILTER : IS_DELETED_FILTER;
    const newValue = action === 'softDelete';

    results.push(await Model.updateMany(
      { ...baseFilter, ...stateFilter },
      { $set: { isDeleted: newValue } },
      opts
    ));
  }

  return results;
};

// ============= Insert Functions ==================

//insert input materials and chemicals data
const insertInputResource = async (data, company_id, zone_id, periodKey, mainGroup, subGroup, session) => {
  let oldObj = null, actionType = 'create', doc = null;

  let existed = await findExisting(inputResourcesModel, data._id, session);

  if (!existed) {
    existed = await inputResourcesModel.findOne({
      company_id,
      zone_id,
      periodKey,
      name: buildNameRegex(data.label),
      main_group: mainGroup,
      sub_group: subGroup,
      isDeleted: { $ne: true }
    }).session(session);
  }

  if (existed) {
    oldObj = existed.toObject();
    doc = await updateInputResource(existed, data, mainGroup, subGroup, session);
    actionType = 'update';
  }

  if (!doc) doc = await createInputResource(data, company_id, zone_id, periodKey, mainGroup, subGroup, session);
  return { doc, oldObj, newObj: doc.toObject(), actionType };
}

//insert fuelResource
const insertFuelResource = async (data, company_id, zone_id, periodKey, mainGroup, subGroup, session) => {
  let actionType = 'create';
  let oldObj = null;

  let existed = await findExisting(fuelResourcesModel, data._id, session);

  if (!existed) {
    existed = await fuelResourcesModel.findOne({
      company_id,
      zone_id,
      periodKey,
      fuelName: buildNameRegex(data.label),
      main_group: mainGroup,
      sub_group: subGroup,
      isDeleted: { $ne: true }
    }).session(session);
  }

  if (existed) {
    oldObj = existed.toObject();

    // update quantity
    existed.quantity = data.value;
    existed.unit = data.unit;
    existed.fuelName = data.label ? capitalizeFirst(data.label) : existed.fuelName;
    existed.main_group = mainGroup ?? existed.main_group;
    existed.sub_group = subGroup ?? existed.sub_group;
    existed.note = data.note ?? existed.note;

    await existed.save({ session });

    // Fuel detail update removed

    const merged = existed.toObject();
    return { doc: existed, oldObj, newObj: merged, actionType: 'update' };
  }

  const detailDoc = null; // Fuel detail creation removed
  const fuelDoc = await createFuelResource(
    data,
    detailDoc,
    company_id,
    zone_id,
    periodKey,
    mainGroup,
    subGroup,
    session
  );

  const merged = fuelDoc.toObject();
  return { doc: fuelDoc, oldObj: null, newObj: merged, actionType };
};

//insert waste
const insertWasteResource = async (data, company_id, zone_id, periodKey, mainGroup, session) => {
  let oldObj = null, actionType = 'create', wasteDoc = null;

  let existed = await findExisting(wasteResourcesModel, data._id, session);

  if (!existed) {
    existed = await wasteResourcesModel.findOne({
      company_id,
      zone_id,
      periodKey,
      wasteName: buildNameRegex(data.label),
      main_group: mainGroup,
      isDeleted: { $ne: true }
    }).session(session);
  }

  if (existed) {
    oldObj = existed.toObject();
    wasteDoc = await updateWasteResource(existed, data, session);
    actionType = 'update';
  }

  if (!wasteDoc) wasteDoc = await createWasteResource(data, company_id, zone_id, periodKey, mainGroup, session);

  return { doc: wasteDoc, oldObj, newObj: wasteDoc.toObject(), actionType };
};

// ============= Get List Data ==================
const getModelByName = (modelName) => {
  if (modelName === 'InputResource') return inputResourcesModel;
  if (modelName === 'FuelResource') return fuelResourcesModel;
  if (modelName === 'WasteResource') return wasteResourcesModel;
  return null;
};

const countExportData = async (query, modelName) => {
  const Model = getModelByName(modelName);
  if (!Model) return 0;
  return await Model.countDocuments(query);
};

const getProjectedStreamData = (query, modelName, projection = {}) => {
  const Model = getModelByName(modelName);
  if (!Model) return null;
  return Model.find(query, projection).sort({ createdAt: -1 }).lean().cursor({ batchSize: 1000 });
};

const getListData = async (query, modelName, session = null) => {
  const sortOption = { createdAt: -1 };

  if (modelName === 'InputResource') {
    const q = inputResourcesModel.find(query).sort(sortOption);
    if (session) q.session(session);
    return await q.lean();
  } else if (modelName === 'FuelResource') {
    const q = fuelResourcesModel.find(query).sort(sortOption);
    if (session) q.session(session);
    const data = await q.lean();
    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (modelName === 'WasteResource') {
    const q = wasteResourcesModel.find(query).sort(sortOption);
    if (session) q.session(session);
    return await q.lean();
  }

  return [];
}

const getStreamData = (query, modelName) => {
  const sortOption = { createdAt: -1 };

  if (modelName === 'InputResource') {
    return inputResourcesModel.find(query).sort(sortOption).lean().cursor({ batchSize: 1000 });
  } else if (modelName === 'FuelResource') {
    return fuelResourcesModel.find(query).sort(sortOption).lean().cursor({ batchSize: 1000 });
  } else if (modelName === 'WasteResource') {
    return wasteResourcesModel.find(query).sort(sortOption).lean().cursor({ batchSize: 1000 });
  }

  return null;
};

// ============= Check Month Data (Sequential) ==================
/**
 * Kiểm tra tháng đó đã có dữ liệu hay chưa — chạy tuần tự trên cùng session
 */
async function checkMonthHasData(company_id, zone_id, periodKey, session) {
  const baseQuery = {
    company_id,
    zone_id,
    periodKey,
    isDeleted: { $ne: true }
  };

  const inputCount = await inputResourcesModel.countDocuments(baseQuery).session(session);
  const fuelCount = await fuelResourcesModel.countDocuments(baseQuery).session(session);
  const wasteCount = await wasteResourcesModel.countDocuments(baseQuery).session(session);

  return inputCount > 0 || fuelCount > 0 || wasteCount > 0;
}

// ============= Soft Delete / Hard Delete / Restore (DRY) ==================

//soft delete resource and waste + fuel detail by company_id
const deleteSoftResourceAndWaste = async (company_id, session = null) => {
  // Soft delete all resource models
  await bulkModelOperation(RESOURCE_MODELS, { company_id }, 'softDelete', session);
};

//hard delete resource and waste + fuel detail by company_id
const deleteHardResourceAndWaste = async (company_id, session = null) => {
  // Hard delete all resource models
  await bulkModelOperation(RESOURCE_MODELS, { company_id }, 'hardDelete', session);
};

//restore resource and waste + fuel detail by company_id
const restoreResourceAndWaste = async (company_id, session = null) => {
  // Restore all resource models
  await bulkModelOperation(RESOURCE_MODELS, { company_id }, 'restore', session);
};

// ============= Find Existing (Duplicate Check) ==================

//find existing document input resource has the same data
const findExistingInputResource = async (data, company_id, zone_id, periodKey, mainGroup, subGroupCode, session) => {
  const result = await inputResourcesModel.findOne({
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,
    sub_group: subGroupCode,
    quantity: data.value,
    unit: data.unit,
    isDeleted: { $ne: true }
  }).session(session).lean();
  return isSameVietnameseName(result?.name, data.label);
};

//find existing document fuel resource has the same data
const findExistingFuelResource = async (data, company_id, zone_id, periodKey, mainGroup, subGroupCode, session) => {
  const result = await fuelResourcesModel.findOne({
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,
    sub_group: subGroupCode,
    quantity: data.value,
    unit: data.unit,
    isDeleted: { $ne: true }
  }).session(session).lean();
  return isSameVietnameseName(result?.fuelName, data.label);
};

//find existing document waste resource has the same data
const findExistingWasteResource = async (data, company_id, zone_id, periodKey, mainGroup, session) => {
  const result = await wasteResourcesModel.findOne({
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,
    quantity: data.value,
    unit: data.unit,
    isDeleted: { $ne: true }
  }).session(session).lean();
  return isSameVietnameseName(result?.wasteName, data.label);
};

// ============= Module Exports ==================
module.exports = {
  insertInputResource,
  insertFuelResource,
  insertWasteResource,
  getListData,
  getStreamData,
  countExportData,
  getProjectedStreamData,
  checkMonthHasData,
  deleteSoftResourceAndWaste,
  deleteHardResourceAndWaste,
  restoreResourceAndWaste,
  findExistingInputResource,
  findExistingFuelResource,
  findExistingWasteResource,
}

// ============= Private Helpers ==================



//=================== Input Resource helpers ===================
const updateInputResource = async (existed, data, mainGroup, subGroup, session) => {
  existed.set({
    name: capitalizeFirst(data.label ?? existed.name),
    quantity: data.value ?? existed.quantity,
    unit: data.unit ?? existed.unit,
    main_group: mainGroup ?? existed.main_group,
    sub_group: subGroup ?? existed.sub_group,
    hazardLevel: data.hazardLevel ?? existed.hazardLevel,
    note: data.note ?? existed.note,
  });
  await existed.save({ session });
  return existed;
};

const createInputResource = async (data, company_id, zone_id, periodKey, mainGroup, subGroup, session) => {
  const inputData = {
    name: data.label ? capitalizeFirst(data.label) : '',
    quantity: data.value || 0,
    unit: data.unit || 'Tấn',
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,
    sub_group: subGroup,
    hazardLevel: data.hazardLevel || null,
    note: data.note || '',
  };
  return await createDocument(inputResourcesModel, inputData, session);
};

//=================== Fuel Resource helpers ===================
// Fuel detail functions removed

const createFuelDetail = async (mainGroup, data, session) => {
  return null; // Fuel detail creation removed
};

const createFuelResource = async (data, detailDoc, company_id, zone_id, periodKey, mainGroup, subGroup, session) => {
  const fuelData = {
    fuelName: data.label ? capitalizeFirst(data.label) : '',
    quantity: data.value || 0,
    unit: data.unit || 'Tấn',
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,
    sub_group: subGroup,
    note: data.note || ''
  };
  const fuelDoc = await createDocument(fuelResourcesModel, fuelData, session);

  return fuelDoc;
};

//=================== Waste Resource helpers ===================
const updateWasteResource = async (existed, data, session) => {
  const isGasWaste = (existed.main_group || data.main_group || data.sub_group || '').toString().toUpperCase() === 'GASW';
  existed.set({
    // THÔNG TIN CƠ BẢN
    wasteName: capitalizeFirst(data.label ?? data.wasteName ?? existed.wasteName),
    otherWasteName: Array.isArray(data.otherWasteName)
      ? data.otherWasteName
      : (data.otherWasteName ? [data.otherWasteName] : existed.otherWasteName),
    quantity: data.value !== undefined ? Number(data.value) : (data.quantity !== undefined ? Number(data.quantity) : existed.quantity),
    unit: isGasWaste ? 'mg/l' : (data.unit ?? existed.unit),
    codeWaste: data.codeWaste ?? data.code ?? existed.codeWaste,
    wasteCodeName: data.wasteCodeName ?? existed.wasteCodeName,
    note: data.note ?? existed.note,
    status: data.status ?? existed.status,

    // TÍNH CHẤT VẬT LIỆU
    physicalState: data.physicalState ?? existed.physicalState,
    purity: data.purity !== undefined ? Number(data.purity) : existed.purity,
    moistureContent: data.moistureContent !== undefined ? Number(data.moistureContent) : existed.moistureContent,
    contaminants: Array.isArray(data.contaminants)
      ? data.contaminants
      : (data.contaminants ? [data.contaminants] : existed.contaminants),
    purpose: data.purpose ?? existed.purpose,

    // phương pháp xử lý
    treatmentMethods: data.treatmentMethods ?? existed.treatmentMethods,

    // THÔNG TIN MUA BÁN
    price: data.price !== undefined ? Number(data.price) : existed.price,
    purchasingAddress: data.purchasingAddress ?? existed.purchasingAddress,
    purchasingUnit: data.purchasingUnit ?? existed.purchasingUnit,
  });

  await existed.save({ session });
  return existed;
};

const createWasteResource = async (data, company_id, zone_id, periodKey, mainGroup, session) => {
  const isGasWaste = (mainGroup || data.sub_group || '').toString().toUpperCase() === 'GASW';
  const wasteData = {
    // TÊN & CƠ BẢN
    wasteName: capitalizeFirst(data.label || data.wasteName || ''),
    otherWasteName: Array.isArray(data.otherWasteName)
      ? data.otherWasteName
      : (data.otherWasteName ? [data.otherWasteName] : []),

    quantity: Number(data.value) || Number(data.quantity) || 0,
    unit: isGasWaste ? 'mg/l' : (data.unit || 'Tấn'),

    codeWaste: data.codeWaste || null,
    wasteCodeName: data.wasteCodeName || null,
    note: data.note || null,
    status: data.status || null,

    // THÔNG TIN TỔ CHỨC
    company_id,
    zone_id,
    periodKey,
    main_group: mainGroup,

    // TÍNH CHẤT VẬT LIỆU
    physicalState: data.physicalState || null,

    purity: data.purity !== undefined ? Number(data.purity) : null,
    moistureContent: data.moistureContent !== undefined ? Number(data.moistureContent) : null,

    contaminants: Array.isArray(data.contaminants)
      ? data.contaminants
      : (data.contaminants ? [data.contaminants] : []),

    purpose: data.purpose || null,

    // phương pháp xử lý
    treatmentMethods: data.treatmentMethods || null,

    // THÔNG TIN MUA BÁN
    price: data.price ? Number(data.price) : 0,
    purchasingAddress: data.purchasingAddress || null,
    purchasingUnit: data.purchasingUnit || null,
  };

  return await createDocument(wasteResourcesModel, wasteData, session);
};