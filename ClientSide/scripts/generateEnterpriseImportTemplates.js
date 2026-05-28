import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_MANAGER_TEMPLATE_PATH = path.resolve(__dirname, './Template_Import_DoanhNghiep_Manager.base.xlsx');
const outputDir = path.resolve(__dirname, '../public/templates');
const vsicPath = path.resolve(__dirname, '../../ServerSide/scripts/data/vsic_level4.json');

const TEMPLATE_START_ROW = 15;
const TEMPLATE_END_ROW = 500;

const HEPZA_GROUPS = [
  'Cơ khí, điện, điện tử',
  'Hoá dược, cao su, nhựa',
  'Chế biến lương thực, thực phẩm',
  'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  'May mặc, thuộc da, dệt nhuộm',
  'Khác',
];

const GROUP_MAPPING = {
  '10': 'Chế biến lương thực, thực phẩm',
  '11': 'Chế biến lương thực, thực phẩm',
  '12': 'Chế biến lương thực, thực phẩm',
  '13': 'May mặc, thuộc da, dệt nhuộm',
  '14': 'May mặc, thuộc da, dệt nhuộm',
  '15': 'May mặc, thuộc da, dệt nhuộm',
  '16': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '17': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '20': 'Hoá dược, cao su, nhựa',
  '21': 'Hoá dược, cao su, nhựa',
  '22': 'Hoá dược, cao su, nhựa',
  '23': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '24': 'Cơ khí, điện, điện tử',
  '25': 'Cơ khí, điện, điện tử',
  '26': 'Cơ khí, điện, điện tử',
  '27': 'Cơ khí, điện, điện tử',
  '28': 'Cơ khí, điện, điện tử',
  '29': 'Cơ khí, điện, điện tử',
  '30': 'Cơ khí, điện, điện tử',
  '31': 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
  '33': 'Cơ khí, điện, điện tử',
};

const COMPANY_TYPES = ['Công ty TNHH', 'Công ty cổ phần', 'Doanh nghiệp tư nhân', 'Doanh nghiệp FDI', 'Hợp tác xã'];
const MARKETS = ['Nội địa', 'Xuất khẩu', 'Nội địa và xuất khẩu'];
const HELPER_LIST_COLUMNS = ['AM', 'AN', 'AO', 'AP', 'AQ', 'AR'];

const cloneValue = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

const getGroupName = (industryCode) => GROUP_MAPPING[String(industryCode).slice(0, 2)] || 'Khác';

const readIndustryCatalog = () => {
  const raw = fs.readFileSync(vsicPath, 'utf8');
  const parsed = JSON.parse(raw);
  const grouped = new Map(HEPZA_GROUPS.map((group) => [group, []]));

  parsed.forEach((item) => {
    const group = getGroupName(item.code);
    const nextValues = grouped.get(group) || [];
    const displayValue = `${item.code} - ${item.name}`;
    if (!nextValues.includes(displayValue)) {
      nextValues.push(displayValue);
      grouped.set(group, nextValues);
    }
  });

  return grouped;
};

const getSampleIndustry = (industriesByGroup, preferredGroup) => {
  const preferred = industriesByGroup.get(preferredGroup) || [];
  if (preferred.length > 0) return preferred[0];

  for (const values of industriesByGroup.values()) {
    if (values.length > 0) return values[0];
  }

  return '';
};

const setListValidation = (cell, formula) => {
  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    showErrorMessage: true,
    errorTitle: 'Giá trị không hợp lệ',
    error: 'Vui lòng chọn giá trị trong danh sách gợi ý.',
  };
};

const copyCellState = (sourceCell, targetCell) => {
  targetCell.value = cloneValue(sourceCell.value);
  targetCell.style = cloneValue(sourceCell.style) || {};
  targetCell.dataValidation = cloneValue(sourceCell.dataValidation);
  targetCell.numFmt = sourceCell.numFmt;
  targetCell.note = cloneValue(sourceCell.note);
  targetCell.protection = cloneValue(sourceCell.protection);
};

const clearCellState = (cell) => {
  cell.value = null;
  cell.style = {};
  cell.dataValidation = null;
  cell.numFmt = undefined;
  cell.note = undefined;
  cell.protection = undefined;
};

const setManagerGuidance = (worksheet) => {
  worksheet.getCell('A5').value = '  TEMPLATE MANAGER | USER ĐẠI DIỆN BẮT BUỘC | 1 NHÓM NGÀNH / 1 NGÀNH NGHỀ | GIỮ NGUYÊN DÒNG MACHINE KEY';
  worksheet.getCell('A8').value = {
    richText: [
      { text: '1. Cột có nền ', font: { size: 10, name: 'Segoe UI' } },
      { text: 'VÀNG', font: { bold: true, size: 10, name: 'Segoe UI' } },
      { text: ' là ', font: { size: 10, name: 'Segoe UI' } },
      { text: 'BẮT BUỘC', font: { bold: true, size: 10, color: { argb: 'FFFF0000' }, name: 'Segoe UI' } },
      { text: ' nhập.', font: { size: 10, name: 'Segoe UI' } },
      { text: '\n2. Thông tin người đại diện là bắt buộc để tạo tài khoản ngay khi import.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n3. Mỗi dòng chỉ chọn 1 nhóm ngành và 1 ngành nghề chi tiết.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
    ],
  };
  worksheet.getCell('F8').value = {
    richText: [
      { text: '⚠ Giữ nguyên dòng machine key ở hàng 14 để hệ thống đọc đúng dữ liệu.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n🏭 Manager không cần nhập Khu công nghiệp; hệ thống sẽ tự gán theo phạm vi quản lý.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n📧 Nếu email hoặc số điện thoại người đại diện bị trùng, file sẽ bị báo lỗi ngay ở bước kiểm tra.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
    ],
  };
};

const setAdminGuidance = (worksheet) => {
  worksheet.getCell('A5').value = '  TEMPLATE ADMIN | USER ĐẠI DIỆN BẮT BUỘC | 1 NHÓM NGÀNH / 1 NGÀNH NGHỀ | GIỮ NGUYÊN DÒNG MACHINE KEY';
  worksheet.getCell('A8').value = {
    richText: [
      { text: '1. Cột có nền ', font: { size: 10, name: 'Segoe UI' } },
      { text: 'VÀNG', font: { bold: true, size: 10, name: 'Segoe UI' } },
      { text: ' là ', font: { size: 10, name: 'Segoe UI' } },
      { text: 'BẮT BUỘC', font: { bold: true, size: 10, color: { argb: 'FFFF0000' }, name: 'Segoe UI' } },
      { text: ' nhập.', font: { size: 10, name: 'Segoe UI' } },
      { text: '\n2. Thông tin người đại diện là bắt buộc để tạo tài khoản ngay khi import.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n3. Mỗi dòng chỉ chọn 1 nhóm ngành và 1 ngành nghề chi tiết.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
    ],
  };
  worksheet.getCell('F8').value = {
    richText: [
      { text: '⚠ Admin cần nhập đúng tên Khu công nghiệp theo dữ liệu hệ thống.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n📧 Nếu email hoặc số điện thoại người đại diện bị trùng, file sẽ bị báo lỗi ngay ở bước kiểm tra.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
      { text: '\n🧩 Giữ nguyên dòng machine key ở hàng 14 để file import được nhận diện chính xác.', font: { size: 10, name: 'Segoe UI', color: { argb: 'FF212529' } } },
    ],
  };
};

const applyHeadersAndExample = (worksheet, columns) => {
  columns.forEach((column, index) => {
    const headerCell = worksheet.getCell(13, index + 1);
    const keyCell = worksheet.getCell(14, index + 1);
    const exampleCell = worksheet.getCell(15, index + 1);

    headerCell.value = column.header;
    keyCell.value = column.key;
    exampleCell.value = column.example;
  });
};

const writeHelperData = (workbook, worksheet, industriesByGroup) => {
  const helperColumnsToHide = ['AA', 'AB', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AZ', 'BA', 'BB'];

  helperColumnsToHide.forEach((column) => {
    worksheet.getColumn(column).hidden = true;
  });

  HEPZA_GROUPS.forEach((group, index) => {
    worksheet.getCell(`AA${index + 2}`).value = group;
    worksheet.getCell(`AB${index + 2}`).value = `LIST_IG${String(index + 1).padStart(3, '0')}`;

    const listColumn = HELPER_LIST_COLUMNS[index];
    const values = industriesByGroup.get(group) || [];

    for (let row = 2; row <= TEMPLATE_END_ROW; row += 1) {
      worksheet.getCell(`${listColumn}${row}`).value = null;
    }

    values.forEach((value, valueIndex) => {
      worksheet.getCell(`${listColumn}${valueIndex + 2}`).value = value;
    });
  });

  COMPANY_TYPES.forEach((value, index) => {
    worksheet.getCell(`AZ${index + 2}`).value = value;
  });

  MARKETS.forEach((value, index) => {
    worksheet.getCell(`BA${index + 2}`).value = value;
  });

  worksheet.getCell('BB2').value = '';
  workbook.definedNames.model = [];

  HEPZA_GROUPS.forEach((_, index) => {
    const listName = `LIST_IG${String(index + 1).padStart(3, '0')}`;
    const listColumn = HELPER_LIST_COLUMNS[index];
    const values = industriesByGroup.get(HEPZA_GROUPS[index]) || [];
    const endRow = Math.max(values.length + 1, 2);
    workbook.definedNames.add(`'Form_Nhap_Lieu'!$${listColumn}$2:$${listColumn}$${endRow}`, listName);
  });

  workbook.definedNames.add(`'Form_Nhap_Lieu'!$AA$2:$AB$${HEPZA_GROUPS.length + 1}`, 'MAP_GROUP');
  workbook.definedNames.add(`'Form_Nhap_Lieu'!$BB$2:$BB$2`, 'EMPTY_LIST');
};

const clearVisibleInputRows = (worksheet, visibleColumnCount) => {
  for (let row = TEMPLATE_START_ROW + 1; row <= TEMPLATE_END_ROW; row += 1) {
    for (let col = 1; col <= visibleColumnCount; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.value = null;
      cell.note = undefined;
    }
  }
};

const trimTrailingColumns = (worksheet) => {
  const maxKeptColumn = 54; // BB
  if (Array.isArray(worksheet._columns) && worksheet._columns.length > maxKeptColumn) {
    worksheet._columns.length = maxKeptColumn;
  }

  if (Array.isArray(worksheet._rows)) {
    worksheet._rows.forEach((row) => {
      if (row && Array.isArray(row._cells) && row._cells.length > maxKeptColumn) {
        row._cells.length = maxKeptColumn;
      }
    });
  }
};

const trimTrailingRows = (worksheet) => {
  if (Array.isArray(worksheet._rows) && worksheet._rows.length > TEMPLATE_END_ROW) {
    worksheet._rows.length = TEMPLATE_END_ROW;
  }
};

const clearVisibleNotes = (worksheet, visibleColumnCount) => {
  for (let row = 13; row <= TEMPLATE_END_ROW; row += 1) {
    for (let col = 1; col <= visibleColumnCount; col += 1) {
      worksheet.getCell(row, col).note = undefined;
    }
  }
};

const ensureVisibleColumns = (worksheet, visibleColumnCount) => {
  for (let col = 1; col <= visibleColumnCount; col += 1) {
    worksheet.getColumn(col).hidden = false;
  }
};

const applyWrapTextToVisibleArea = (worksheet, visibleColumnCount) => {
  for (let row = 15; row <= TEMPLATE_END_ROW; row += 1) {
    for (let col = 1; col <= visibleColumnCount; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.alignment = {
        ...(cell.alignment || {}),
        vertical: (cell.alignment && cell.alignment.vertical) || 'middle',
        wrapText: true,
      };
    }
  }
};

const applyManagerDropdowns = (worksheet) => {
  for (let row = TEMPLATE_START_ROW; row <= TEMPLATE_END_ROW; row += 1) {
    setListValidation(worksheet.getCell(`D${row}`), '$AA$2:$AA$7');
    setListValidation(worksheet.getCell(`E${row}`), `INDIRECT(IFERROR(VLOOKUP(D${row}, MAP_GROUP, 2, FALSE), "EMPTY_LIST"))`);
    setListValidation(worksheet.getCell(`F${row}`), `$AZ$2:$AZ$${COMPANY_TYPES.length + 1}`);
    setListValidation(worksheet.getCell(`K${row}`), `$BA$2:$BA$${MARKETS.length + 1}`);
  }
};

const applyAdminDropdowns = (worksheet) => {
  for (let row = TEMPLATE_START_ROW; row <= TEMPLATE_END_ROW; row += 1) {
    setListValidation(worksheet.getCell(`E${row}`), '$AA$2:$AA$7');
    setListValidation(worksheet.getCell(`F${row}`), `INDIRECT(IFERROR(VLOOKUP(E${row}, MAP_GROUP, 2, FALSE), "EMPTY_LIST"))`);
    setListValidation(worksheet.getCell(`G${row}`), `$AZ$2:$AZ$${COMPANY_TYPES.length + 1}`);
    setListValidation(worksheet.getCell(`L${row}`), `$BA$2:$BA$${MARKETS.length + 1}`);
  }
};

const applyManagerTemplate = (worksheet, industriesByGroup) => {
  setManagerGuidance(worksheet);

  applyHeadersAndExample(worksheet, [
    { header: 'TÊN DOANH NGHIỆP *', key: 'ten_doanh_nghiep', example: 'CÔNG TY CP CÔNG NGHỆ ALPHA' },
    { header: 'NĂM THÀNH LẬP', key: 'nam_thanh_lap', example: 2015 },
    { header: 'ĐỊA CHỈ TRỤ SỞ', key: 'dia_chi', example: '123 Đường Số 1, Quận 9, TP.HCM' },
    { header: 'NHÓM NGÀNH *', key: 'nhom_nganh', example: 'Cơ khí, điện, điện tử' },
    { header: 'NGÀNH NGHỀ CHI TIẾT *', key: 'nganh_nghe', example: getSampleIndustry(industriesByGroup, 'Cơ khí, điện, điện tử') },
    { header: 'LOẠI HÌNH DN', key: 'loai_hinh_doanh_nghiep', example: 'Công ty cổ phần' },
    { header: 'QUY MÔ NHÂN SỰ', key: 'so_luong_nhan_vien', example: 150 },
    { header: 'WEBSITE', key: 'website', example: 'https://alpha.tech' },
    { header: 'DOANH THU (VNĐ)', key: 'doanh_thu', example: 50000000000 },
    { header: 'SỐ ĐĂNG KÝ KINH DOANH *', key: 'so_dk_kd', example: '0312345678' },
    { header: 'THỊ TRƯỜNG', key: 'thi_truong', example: 'Xuất khẩu' },
    { header: 'NGƯỜI ĐẠI DIỆN *', key: 'nguoi_dai_dien_ho_ten', example: 'Nguyễn Văn A' },
    { header: 'EMAIL LIÊN HỆ *', key: 'nguoi_dai_dien_email', example: 'contact@alpha.tech' },
    { header: 'SỐ ĐIỆN THOẠI LIÊN HỆ *', key: 'nguoi_dai_dien_so_dien_thoai', example: '0909123456' },
  ]);

  worksheet.autoFilter = 'A13:N13';
  worksheet.views = [{ state: 'frozen', ySplit: 14 }];
  worksheet.getColumn('D').width = 28;
  worksheet.getColumn('E').width = 42;
};

const convertManagerSheetToAdminLayout = (worksheet) => {
  const topStyles = {
    title: cloneValue(worksheet.getCell('A1').style),
    system: cloneValue(worksheet.getCell('A5').style),
    rules: cloneValue(worksheet.getCell('A7').style),
    support: cloneValue(worksheet.getCell('F7').style),
    rulesBody: cloneValue(worksheet.getCell('A8').style),
    supportBody: cloneValue(worksheet.getCell('F8').style),
    businessSection: cloneValue(worksheet.getCell('A12').style),
    representativeSection: cloneValue(worksheet.getCell('L12').style),
  };

  ['A1:N3', 'A5:N5', 'A7:D7', 'F7:N7', 'A8:D10', 'F8:N10', 'A12:K12', 'L12:N12'].forEach((range) => {
    worksheet.unMergeCells(range);
  });

  for (let row = 13; row <= TEMPLATE_END_ROW; row += 1) {
    for (let col = 14; col >= 2; col -= 1) {
      copyCellState(worksheet.getCell(row, col), worksheet.getCell(row, col + 1));
    }
    clearCellState(worksheet.getCell(row, 2));
  }

  const originalWidths = Array.from({ length: 14 }, (_, index) => worksheet.getColumn(index + 1).width);
  worksheet.getColumn(1).width = originalWidths[0];
  worksheet.getColumn(2).width = 28;
  for (let index = 2; index <= 14; index += 1) {
    worksheet.getColumn(index + 1).width = originalWidths[index - 1];
  }

  worksheet.getCell('L12').value = null;
  worksheet.getCell('M12').style = topStyles.representativeSection;
  worksheet.getCell('A12').style = topStyles.businessSection;
  worksheet.getCell('A1').style = topStyles.title;
  worksheet.getCell('A5').style = topStyles.system;
  worksheet.getCell('A7').style = topStyles.rules;
  worksheet.getCell('F7').style = topStyles.support;
  worksheet.getCell('A8').style = topStyles.rulesBody;
  worksheet.getCell('F8').style = topStyles.supportBody;

  worksheet.mergeCells('A1:O3');
  worksheet.mergeCells('A5:O5');
  worksheet.mergeCells('A7:D7');
  worksheet.mergeCells('F7:O7');
  worksheet.mergeCells('A8:D10');
  worksheet.mergeCells('F8:O10');
  worksheet.mergeCells('A12:L12');
  worksheet.mergeCells('M12:O12');

  worksheet.getCell('A12').value = 'THÔNG TIN DOANH NGHIỆP';
  worksheet.getCell('M12').value = 'THÔNG TIN NGƯỜI ĐẠI DIỆN';
  worksheet.getCell('M12').style = topStyles.representativeSection;

  worksheet.getCell('B13').style = cloneValue(worksheet.getCell('A13').style);
  worksheet.getCell('B14').style = cloneValue(worksheet.getCell('A14').style);
  worksheet.getCell('B15').style = cloneValue(worksheet.getCell('A15').style);
  worksheet.getCell('B13').note = undefined;
  worksheet.getCell('B14').note = undefined;
  worksheet.getCell('B15').note = undefined;

  for (let row = 16; row <= TEMPLATE_END_ROW; row += 1) {
    worksheet.getCell(`B${row}`).style = cloneValue(worksheet.getCell(`A${row}`).style);
    worksheet.getCell(`B${row}`).protection = cloneValue(worksheet.getCell(`A${row}`).protection);
    worksheet.getCell(`B${row}`).dataValidation = null;
    worksheet.getCell(`B${row}`).note = undefined;
  }
};

const applyAdminTemplate = (worksheet, industriesByGroup) => {
  convertManagerSheetToAdminLayout(worksheet);
  setAdminGuidance(worksheet);

  applyHeadersAndExample(worksheet, [
    { header: 'TÊN DOANH NGHIỆP *', key: 'ten_doanh_nghiep', example: 'CÔNG TY CP CÔNG NGHỆ ALPHA' },
    { header: 'KHU CÔNG NGHIỆP *', key: 'khu_cong_nghiep', example: 'KCN Hiệp Phước' },
    { header: 'NĂM THÀNH LẬP', key: 'nam_thanh_lap', example: 2015 },
    { header: 'ĐỊA CHỈ TRỤ SỞ', key: 'dia_chi', example: '123 Đường Số 1, Quận 9, TP.HCM' },
    { header: 'NHÓM NGÀNH *', key: 'nhom_nganh', example: 'Cơ khí, điện, điện tử' },
    { header: 'NGÀNH NGHỀ CHI TIẾT *', key: 'nganh_nghe', example: getSampleIndustry(industriesByGroup, 'Cơ khí, điện, điện tử') },
    { header: 'LOẠI HÌNH DN', key: 'loai_hinh_doanh_nghiep', example: 'Công ty cổ phần' },
    { header: 'QUY MÔ NHÂN SỰ', key: 'so_luong_nhan_vien', example: 150 },
    { header: 'WEBSITE', key: 'website', example: 'https://alpha.tech' },
    { header: 'DOANH THU (VNĐ)', key: 'doanh_thu', example: 50000000000 },
    { header: 'SỐ ĐĂNG KÝ KINH DOANH *', key: 'so_dk_kd', example: '0312345678' },
    { header: 'THỊ TRƯỜNG', key: 'thi_truong', example: 'Xuất khẩu' },
    { header: 'NGƯỜI ĐẠI DIỆN *', key: 'nguoi_dai_dien_ho_ten', example: 'Nguyễn Văn A' },
    { header: 'EMAIL LIÊN HỆ *', key: 'nguoi_dai_dien_email', example: 'contact@alpha.tech' },
    { header: 'SỐ ĐIỆN THOẠI LIÊN HỆ *', key: 'nguoi_dai_dien_so_dien_thoai', example: '0909123456' },
  ]);

  worksheet.autoFilter = 'A13:O13';
  worksheet.views = [{ state: 'frozen', ySplit: 14 }];
  worksheet.getColumn('E').width = 28;
  worksheet.getColumn('F').width = 42;
};

const buildTemplate = async ({ outputName, applyLayout, applyDropdowns, industriesByGroup, visibleColumnCount }) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(BASE_MANAGER_TEMPLATE_PATH);

  const worksheet = workbook.getWorksheet('Form_Nhap_Lieu');
  workbook.creator = 'HEPZA';
  workbook.modified = new Date();

  applyLayout(worksheet, industriesByGroup);
  writeHelperData(workbook, worksheet, industriesByGroup);
  applyDropdowns(worksheet);
  clearVisibleInputRows(worksheet, visibleColumnCount);
  clearVisibleNotes(worksheet, visibleColumnCount);
  ensureVisibleColumns(worksheet, visibleColumnCount);
  applyWrapTextToVisibleArea(worksheet, visibleColumnCount);
  trimTrailingRows(worksheet);
  trimTrailingColumns(worksheet);

  await workbook.xlsx.writeFile(path.join(outputDir, outputName));
};

const main = async () => {
  if (!fs.existsSync(BASE_MANAGER_TEMPLATE_PATH)) {
    throw new Error('Thiếu file base template manager để sinh template import.');
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const industriesByGroup = readIndustryCatalog();

  await buildTemplate({
    outputName: 'Template_Import_DoanhNghiep_Manager.xlsx',
    applyLayout: applyManagerTemplate,
    applyDropdowns: applyManagerDropdowns,
    industriesByGroup,
    visibleColumnCount: 14,
  });

  await buildTemplate({
    outputName: 'Template_Import_DoanhNghiep.xlsx',
    applyLayout: applyAdminTemplate,
    applyDropdowns: applyAdminDropdowns,
    industriesByGroup,
    visibleColumnCount: 15,
  });

  console.log('Đã tạo lại template import doanh nghiệp từ file gốc, giữ nguyên style cũ.');
};

main().catch((error) => {
  console.error('Không thể tạo template import doanh nghiệp:', error);
  process.exit(1);
});
