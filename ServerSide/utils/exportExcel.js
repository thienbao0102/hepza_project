const ExcelJS = require('exceljs');

const buildExcelMultiCompany = async (datasets, include) => {
  const workbook = new ExcelJS.Workbook();

  /* ================= RESOURCE (combined) ================= */
  if (include.includes(2)) {
    const sheet = workbook.addWorksheet('Dữ Liệu Tài Nguyên');
    sheet.columns = [
      { header: 'Khu Công Nghiệp', key: 'zone_name' },
      { header: 'Doanh Nghiệp', key: 'company' },
      { header: 'Thời Gian', key: 'period' },
      { header: 'Nhóm', key: 'group' },
      { header: 'Tên', key: 'name' },
      { header: 'Số Lượng', key: 'quantity' },
      { header: 'Đơn Vị', key: 'unit' },
      { header: 'Ghi Chú', key: 'note' },
    ];

    // Helper: map main_group to Vietnamese label
    const GROUP_LABEL = {
      material: 'Nguyên vật liệu',
      chemical: 'Hóa chất',
      el: 'Điện',
      wa: 'Nước',
      co: 'Chất đốt',
    };

    // Helper: convert periodKey (YYYYMM) to MM/YYYY
    const formatPeriod = (periodKey) => {
      if (!periodKey) return '';
      const str = String(periodKey);
      const year = str.substring(0, 4);
      const month = str.substring(4);
      return `${month}/${year}`;
    };

    datasets.forEach(d => {
      const zoneName = d.company.zone_name || '';
      const companyName = d.company.company_name || '';
      const rows = [];

      // InputResources (nguyên vật liệu + hóa chất)
      if (d.inputResources && d.inputResources.length > 0) {
        d.inputResources.forEach(r => {
          rows.push({
            zone_name: zoneName,
            company: companyName,
            period: formatPeriod(r.periodKey),
            group: GROUP_LABEL[r.main_group] || r.main_group || '',
            name: r.name || '',
            quantity: r.quantity ?? '',
            unit: r.unit || '',
            note: r.note || '',
          });
        });
      }

      // FuelResources (điện, nước, chất đốt)
      if (d.fuelResources && d.fuelResources.length > 0) {
        d.fuelResources.forEach(f => {
          rows.push({
            zone_name: zoneName,
            company: companyName,
            period: formatPeriod(f.periodKey),
            group: GROUP_LABEL[f.main_group] || f.main_group || '',
            name: f.fuelName || '',
            quantity: f.quantity ?? '',
            unit: f.unit || '',
            note: '',
          });
        });
      }

      // Sort by period, then by group
      rows.sort((a, b) => {
        if (a.period !== b.period) return a.period.localeCompare(b.period);
        return a.group.localeCompare(b.group);
      });

      if (rows.length === 0) {
        sheet.addRow({
          zone_name: zoneName,
          company: companyName,
          period: '',
          group: '',
          name: 'không có dữ liệu',
          quantity: '',
          unit: '',
          note: '',
        });
      } else {
        rows.forEach(row => sheet.addRow(row));
      }
    });

    mergeColumn(sheet, 'zone_name');
    mergeColumn(sheet, 'company');
    mergeColumn(sheet, 'period');
    mergeColumn(sheet, 'group');
    styleHeader(sheet);
    styleColumn(sheet, 'zone_name');
    styleColumn(sheet, 'company');
    applyTableBorder(sheet);
    styleSheetByType(sheet, 'fuel');
    finalizeSheet(sheet, 'company');
  }

  /* ================= WASTE ================= */
  if (include.includes(3)) {
    const sheet = workbook.addWorksheet('Chất Thải Phát Sinh');
    sheet.columns = [
      { header: 'Khu Công Nghiệp', key: 'zone_name' },
      { header: 'Doanh Nghiệp', key: 'company' },
      { header: 'Thời Gian', key: 'period' },
      { header: 'Nhóm', key: 'group' },
      { header: 'Tên', key: 'name' },
      { header: 'Số Lượng', key: 'quantity' },
      { header: 'Đơn Vị', key: 'unit' },
      { header: 'Ghi Chú', key: 'note' },
    ];

    const WASTE_GROUP_LABEL = {
      DO: 'Chất thải sinh hoạt',
      IND: 'Chất thải công nghiệp',
      HA: 'Chất thải nguy hại',
      WWA: 'Nước thải',
      GASW: 'Khí thải',
    };

    const formatPeriodWaste = (periodKey) => {
      if (!periodKey) return '';
      const str = String(periodKey);
      const year = str.substring(0, 4);
      const month = str.substring(4);
      return `${month}/${year}`;
    };

    datasets.forEach(d => {
      const zoneName = d.company.zone_name || '';
      const companyName = d.company.company_name || '';
      const rows = [];

      if (d.wasteResources && d.wasteResources.length > 0) {
        d.wasteResources.forEach(w => {
          rows.push({
            zone_name: zoneName,
            company: companyName,
            period: formatPeriodWaste(w.periodKey),
            group: WASTE_GROUP_LABEL[w.main_group] || w.main_group || '',
            name: w.wasteName || '',
            quantity: w.quantity ?? '',
            unit: w.unit || '',
            note: w.note || '',
          });
        });
      }

      // Sort by period, then by group
      rows.sort((a, b) => {
        if (a.period !== b.period) return a.period.localeCompare(b.period);
        return a.group.localeCompare(b.group);
      });

      if (rows.length === 0) {
        sheet.addRow({
          zone_name: zoneName,
          company: companyName,
          period: '',
          group: '',
          name: 'không có dữ liệu',
          quantity: '',
          unit: '',
          note: '',
        });
      } else {
        rows.forEach(row => sheet.addRow(row));
      }
    });

    mergeColumn(sheet, 'zone_name');
    mergeColumn(sheet, 'company');
    mergeColumn(sheet, 'period');
    mergeColumn(sheet, 'group');
    styleHeader(sheet);
    styleColumn(sheet, 'zone_name');
    styleColumn(sheet, 'company');
    applyTableBorder(sheet);
    styleSheetByType(sheet, 'waste');
    finalizeSheet(sheet, 'company');
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet('No Data');
    sheet.addRow(['Không có dữ liệu để xuất']);
  }

  return workbook;
};

//coler exportExcel
const COLORS = {
  HEADER_BG: 'E9EEF3',
  BORDER: 'D1D5DB',
  INPUT: 'E8F3FF',
  FUEL: 'FFF7E6',
  WASTE: 'FDECEC',
};
const COMPANY_BG_COLORS = [
  'F5F5F5', // Xám sáng
  'EDF4EC', // Xanh lá pastel
];
//merge rows exportExcel
const mergeColumn = (sheet, colKey) => {
  const colIndex = sheet.getColumn(colKey).number;

  let startRow = null;
  let currentValue = null;

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const cellValue = sheet.getRow(rowIndex).getCell(colIndex).value;

    if (cellValue !== currentValue) {
      if (startRow !== null && rowIndex - startRow > 1) {
        sheet.mergeCells(startRow, colIndex, rowIndex - 1, colIndex);
        sheet.getRow(startRow).getCell(colIndex).alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      }
      currentValue = cellValue;
      startRow = rowIndex;
    }
  }

  if (startRow !== null && sheet.rowCount - startRow >= 1) {
    sheet.mergeCells(startRow, colIndex, sheet.rowCount, colIndex);
    sheet.getRow(startRow).getCell(colIndex).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  }
};
//header style exportExcel
const styleHeader = (sheet) => {
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;

  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.HEADER_BG },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
};
//column style exportExcel
const styleColumn = (sheet, colKey) => {
  const col = sheet.getColumn(colKey);
  col.width = 28;
  const colIndex = col.number;

  let lastCompany = null;
  let colorIndex = 0;

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const cell = row.getCell(colIndex);
    const currentCompany = cell.value;

    // 👇 đổi màu khi sang DN mới
    if (currentCompany && currentCompany !== lastCompany) {
      colorIndex = (colorIndex + 1) % COMPANY_BG_COLORS.length;
      lastCompany = currentCompany;
    }

    cell.font = { bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COMPANY_BG_COLORS[colorIndex] },
    };
  }
};
//table border style exportExcel
const applyTableBorder = (sheet) => {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  });
};
//sheet coler by tye exportExcel
const styleSheetByType = (sheet, type) => {
  let bgColor;
  if (type === 'input') bgColor = COLORS.INPUT;
  if (type === 'fuel') bgColor = COLORS.FUEL;
  if (type === 'waste') bgColor = COLORS.WASTE;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell(cell => {
      if (!cell.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
      }
    });
  });
};
//freeze and auto width exportExcel
const finalizeSheet = (sheet, exclude = '') => {
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];

  sheet.columns.forEach(col => {
    if (col.key === exclude) return;
    let maxLength = 12;
    col.eachCell({ includeEmpty: true }, cell => {
      const val = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, val.length + 2);
    });
    col.width = maxLength;
  });
};
module.exports = { buildExcelMultiCompany };
