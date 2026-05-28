const { getListData, getStreamData, countExportData, getProjectedStreamData } = require('../dataAccess/resoureceAndWasteRepository');
const companyRepository = require('../dataAccess/companyRepository');
const ExportHistory = require('../models/exportHistoryModel');
const ExcelJS = require('exceljs');


const getExportDataMultiCompany = async ({ company_ids, from, to, include }) => {
  const periodQuery = { $gte: from, $lte: to };
  const companies = await companyRepository.getlistCompanyNameByIds(company_ids);
  const results = [];

  for (const company of companies) {
    const zone_id = company.company_id === 'KCN004DN00001' ? 'KCN002' : null;
    const baseQuery = {
      // zone_id: zone_id ? zone_id : company.zone_id,
      company_id: company.company_id,
      periodKey: periodQuery,
      isDeleted: { $ne: true }
    };
    
    console.log(`[Export Stream] Processing company: ${company.company_id}, Query:`, JSON.stringify(baseQuery));

    const inputResources = (include.includes(1) || include.includes(2))
      ? await getListData(baseQuery, 'InputResource')
      : [];


    const fuelResources = include.includes(2)
      ? await getListData(baseQuery, 'FuelResource')
      : [];

    const wasteResources = include.includes(3)
      ? await getListData(baseQuery, 'WasteResource')
      : [];

    results.push({
      company,
      inputResources,
      fuelResources,
      wasteResources,
    });
  }

  return results;
};

const formatPeriod = (periodKey) => {
  if (!periodKey) return '';
  const str = String(periodKey);
  const year = str.substring(0, 4);
  const month = str.substring(4);
  return `${month}/${year}`;
};

const GROUP_LABEL = { material: 'Nguyên vật liệu', chemical: 'Hóa chất', el: 'Điện', wa: 'Nước', co: 'Chất đốt' };
const WASTE_GROUP_LABEL = { DO: 'Chất thải sinh hoạt', IND: 'Chất thải công nghiệp', HA: 'Chất thải nguy hại', WWA: 'Nước thải', GASW: 'Khí thải' };

const buildExportQuery = ({ company_ids, from, to }) => ({
  company_id: { $in: company_ids },
  periodKey: { $gte: from, $lte: to },
  isDeleted: { $ne: true }
});

const createExportWorkbook = (writerOptions) => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(writerOptions);
  return { workbook, ...createExportSheets(workbook) };
};

const createExportSheets = (workbook) => {
  const resourceSheet = workbook.addWorksheet('Dữ Liệu Tài Nguyên');
  resourceSheet.columns = [
    { header: 'Khu Công Nghiệp', key: 'zone_name', width: 20 },
    { header: 'Doanh Nghiệp', key: 'company', width: 30 },
    { header: 'Thời Gian', key: 'period', width: 15 },
    { header: 'Nhóm', key: 'group', width: 20 },
    { header: 'Tên', key: 'name', width: 25 },
    { header: 'Số Lượng', key: 'quantity', width: 15 },
    { header: 'Đơn Vị', key: 'unit', width: 10 },
    { header: 'Ghi Chú', key: 'note', width: 20 },
  ];

  const wasteSheet = workbook.addWorksheet('Chất Thải Phát Sinh');
  wasteSheet.columns = [
    { header: 'Khu Công Nghiệp', key: 'zone_name', width: 20 },
    { header: 'Doanh Nghiệp', key: 'company', width: 30 },
    { header: 'Thời Gian', key: 'period', width: 15 },
    { header: 'Loại Rác', key: 'wasteType', width: 25 },
    { header: 'Tên Chất Thải', key: 'name', width: 30 },
    { header: 'Số Lượng', key: 'quantity', width: 15 },
    { header: 'Đơn Vị', key: 'unit', width: 10 },
    { header: 'Trạng Thái', key: 'status', width: 20 },
    { header: 'Phương Pháp Xử Lý', key: 'treatment', width: 25 },
  ];

  return { resourceSheet, wasteSheet };
};

const buildCompanyInfoMap = (companies) => {
  const companyInfoMap = {};
  for (const c of companies) {
    companyInfoMap[c.company_id] = {
      zoneName: (c.zone_info && c.zone_info.zone_name) ? c.zone_info.zone_name : (c.zone_name || ''),
      companyName: c.company_name || ''
    };
  }
  return companyInfoMap;
};

const writeExportRows = async ({ baseQuery, include, companyInfoMap, resourceSheet, wasteSheet, getCursor = getStreamData, onProgress }) => {
  let totalRecords = 0;
  const reportProgress = async () => {
    totalRecords++;
    if (onProgress) await onProgress(totalRecords);
  };

  if (include.includes(1) || include.includes(2)) {
    const inputCursor = getCursor(baseQuery, 'InputResource');
    for await (const r of inputCursor) {
      const info = companyInfoMap[r.company_id] || {};
      resourceSheet.addRow({
        zone_name: info.zoneName, company: info.companyName, period: formatPeriod(r.periodKey),
        group: GROUP_LABEL[r.main_group] || r.main_group || '',
        name: r.name || '', quantity: r.quantity ?? '', unit: r.unit || '', note: r.note || '',
      }).commit();
      await reportProgress();
    }
  }

  if (include.includes(2)) {
    const fuelCursor = getCursor(baseQuery, 'FuelResource');
    for await (const f of fuelCursor) {
      const info = companyInfoMap[f.company_id] || {};
      resourceSheet.addRow({
        zone_name: info.zoneName, company: info.companyName, period: formatPeriod(f.periodKey),
        group: GROUP_LABEL[f.main_group] || f.main_group || '',
        name: f.fuelName || '', quantity: f.quantity ?? '', unit: f.unit || '', note: '',
      }).commit();
      await reportProgress();
    }
  }

  if (include.includes(3)) {
    const wasteCursor = getCursor(baseQuery, 'WasteResource');
    for await (const w of wasteCursor) {
      const info = companyInfoMap[w.company_id] || {};
      wasteSheet.addRow({
        zone_name: info.zoneName, company: info.companyName, period: formatPeriod(w.periodKey),
        wasteType: WASTE_GROUP_LABEL[w.main_group] || w.main_group || '',
        name: w.wasteName || '', quantity: w.quantity ?? '', unit: w.unit || '', status: w.status || '', treatment: w.treatmentMethods || '',
      }).commit();
      await reportProgress();
    }
  }

  return totalRecords;
};

const countExportRecords = async ({ company_ids, from, to, include }) => {
  const baseQuery = buildExportQuery({ company_ids, from, to });
  let totalRecords = 0;

  if (include.includes(1) || include.includes(2)) {
    totalRecords += await countExportData(baseQuery, 'InputResource');
  }
  if (include.includes(2)) {
    totalRecords += await countExportData(baseQuery, 'FuelResource');
  }
  if (include.includes(3)) {
    totalRecords += await countExportData(baseQuery, 'WasteResource');
  }

  return totalRecords;
};

const exportDataMultiCompanyStream = async (res, { company_ids, from, to, include }) => {
  const companies = await companyRepository.getlistCompanyNameByIds(company_ids);
  const { workbook, resourceSheet, wasteSheet } = createExportWorkbook({ stream: res });
  const totalRecords = await writeExportRows({
    baseQuery: buildExportQuery({ company_ids, from, to }),
    include,
    companyInfoMap: buildCompanyInfoMap(companies),
    resourceSheet,
    wasteSheet,
  });

  resourceSheet.commit();
  wasteSheet.commit();
  await workbook.commit();
  return totalRecords;
};

const exportDataMultiCompanyToFile = async (filePath, { company_ids, from, to, include, onProgress }) => {
  const companies = await companyRepository.getlistCompanyNameByIds(company_ids);
  const { workbook, resourceSheet, wasteSheet } = createExportWorkbook({ filename: filePath });
  const totalRecords = await writeExportRows({
    baseQuery: buildExportQuery({ company_ids, from, to }),
    include,
    companyInfoMap: buildCompanyInfoMap(companies),
    resourceSheet,
    wasteSheet,
    getCursor: getProjectedStreamData,
    onProgress,
  });

  resourceSheet.commit();
  wasteSheet.commit();
  await workbook.commit();
  return { totalRecords };
};

const checkExportPermission = async (user, company_ids, zone_id, option = 1) => {
  if (user.role === 'company') {
    return [user.company_id];
  }
  //option 1: get data by company_ids
  else if (option === 1) {
    const companyIdArr = Array.isArray(company_ids) ? company_ids : company_ids.split(',');
    if (user.role === 'manager' && companyIdArr && companyIdArr.length > 0) {
      const zoneCompanyIds = await companyRepository.getCompanyIdsByZoneId(user.zone_id); // zone_id of manager
      return companyIdArr.filter(id => zoneCompanyIds.includes(id));
    }
    if (user.role === 'admin' && companyIdArr && companyIdArr.length > 0) {
      return companyIdArr;
    }
    throw new Error('Không có doanh nghiệp nào được chỉ định để xuất dữ liệu.');
  }
  //option 2: get data by zone_id
  else if (option === 2) {
    if (user.role === 'admin' && zone_id) {
      return await companyRepository.getCompanyIdsByZoneId(zone_id);
    }
    if (user.role === 'manager') {
      return await companyRepository.getCompanyIdsByZoneId(user.zone_id);
    }
    throw new Error('Không xác định được zone_id để xuất dữ liệu.');
  }
  //option 3: get data all company (admin only)
  else if (option === 3) {
    if (user.role === 'admin') {
      return await companyRepository.getAllCompanyIds();
    }
    // If manager requests ALL, return all in their zone (effectively option 2)
    if (user.role === 'manager') {
      return await companyRepository.getCompanyIdsByZoneId(user.zone_id);
    }
  }
  throw new Error('Không có quyền xuất dữ liệu cho các công ty được chỉ định.');
}

const saveExportHistory = async (data) => {
  try {
    const newHistory = new ExportHistory(data);
    return await newHistory.save();
  } catch (error) {
    throw error;
  }
};

module.exports = { getExportDataMultiCompany, exportDataMultiCompanyStream, countExportRecords, exportDataMultiCompanyToFile, checkExportPermission, saveExportHistory };
