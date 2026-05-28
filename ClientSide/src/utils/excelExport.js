import ExcelJS from 'exceljs';

/**
 * Utility function to export beautifully styled Excel files using ExcelJS.
 *
 * @param {Object} options
 * @param {Array<{sheetName: string, data: Array<Object>}>} options.sheets - Array of sheets to export
 * @param {string} options.fileName - Output file name
 */
export const exportToStyledExcel = async ({ sheets, fileName }) => {
  try {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Hepza System';
    workbook.created = new Date();

    sheets.forEach(({ sheetName, data }) => {
      if (!data || data.length === 0) return;

      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
      });

      const headers = Object.keys(data[0]);

      // Add Header Row
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 30;

      // Style Header
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0D9488' }, // Teal 600
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11,
          name: 'Arial',
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });

      // Add Data Rows
      data.forEach((item, index) => {
        const row = worksheet.addRow(Object.values(item));
        row.height = 25;
        const isAlternate = index % 2 === 1;

        row.eachCell((cell) => {
          if (isAlternate) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }, // Slate 50
            };
          }
          cell.font = {
            color: { argb: 'FF334155' },
            size: 11,
            name: 'Arial',
          };

          // Format numbers with commas, text centered
          const isNumber = typeof cell.value === 'number';
          if (isNumber) {
            cell.numFmt = '#,##0';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      });

      // Auto-fit Columns with padding
      worksheet.columns.forEach((column, index) => {
        const headerLength = headers[index] ? headers[index].length : 10;
        let maxLength = headerLength;

        // Sample up to 100 rows to find max width to save performance
        const sampleData = data.slice(0, 100);
        sampleData.forEach(row => {
          const val = Object.values(row)[index];
          const cellValue = val !== null && val !== undefined ? String(val) : '';
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });

        // Add padding and cap width
        column.width = Math.min(Math.max(maxLength + 6, 15), 60);
      });
    });

    // Generate Blob and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Styled Excel Export Error:', error);
    throw error;
  }
};
