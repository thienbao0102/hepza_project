// import * as ExcelJS from 'exceljs'; // Lazy load instead
import dayjs from 'dayjs';

/**
 * Exports data to Excel using a template.
 * @param {Array} rawData 
 */
export const exportToExcel = async (rawData) => {
    try {
        // 1. Fetch Template
        const response = await fetch('/templates/Template_Import_DoanhNghiep.xlsx');
        if (!response.ok) throw new Error("Failed to fetch template");
        const arrayBuffer = await response.arrayBuffer();

        // 2. Load Workbook with ExcelJS
        const ExcelJS = (await import('exceljs')).default || await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0]; // Assume first sheet

        // 3. Find Header Row
        let headerRowIndex = -1;
        let headerMap = {}; // columnName -> colIndex (1-based)

        worksheet.eachRow((row, rowNumber) => {
            if (headerRowIndex !== -1) return; // Already found

            row.eachCell((cell, colNumber) => {
                const cellValue = cell.value ? String(cell.value).toLowerCase() : '';
                if (cellValue.includes('tên doanh nghiệp')) {
                    headerRowIndex = rowNumber;
                }
            });

            if (headerRowIndex === rowNumber) {
                // Map all columns in this row
                row.eachCell((cell, colNumber) => {
                    if (cell.value) {
                        headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
                    }
                });
            }
        });

        if (headerRowIndex === -1) {
            console.warn("Header row not found, defaulting to row 15 (data starts at row 16)");
            headerRowIndex = 15;
        }

        // 4. Map Data and Add Rows
        const getColIndex = (keywords) => {
            for (let key in headerMap) {
                if (keywords.some(k => key.includes(k))) return headerMap[key];
            }
            return -1;
        };

        const rowsToAdd = rawData.map((item, index) => {
            const rowData = []; // sparse array or object
            const setVal = (keywords, val) => {
                const colIdx = getColIndex(keywords);
                if (colIdx !== -1) {
                    rowData[colIdx] = val; // Set at specific index (sparse)
                }
            };

            setVal(['stt', 'số thứ tự'], index + 1);
            setVal(['tên doanh nghiệp'], item.name);
            setVal(['mã số thuế', 'mst'], item.company_registration_number);
            setVal(['khu công nghiệp', 'kcn'], item.kcn);
            setVal(['địa chỉ'], item.address);
            setVal(['điện thoại', 'sđt'], item.phone);
            setVal(['email'], item.email);
            setVal(['đại diện', 'giám đốc'], item.representative);
            setVal(['website'], item.website);
            setVal(['ngành nghề'], item.industry);
            setVal(['nhóm ngành'], item.group);
            setVal(['loại hình'], item.type);
            setVal(['năm thành lập'], item.year);
            setVal(['lao động', 'nhân sự'], item.employees);
            setVal(['thị trường'], item.market);
            setVal(['doanh thu'], item.revenue);

            return rowData;
        });

        // Insert rows starting at row 16 (fixed)
        let currentRowIndex = 16;
        rowsToAdd.forEach(rowData => {
            const row = worksheet.getRow(currentRowIndex);
            rowData.forEach((val, colIdx) => {
                if (val !== undefined) {
                    const cell = row.getCell(colIdx);
                    cell.value = val;
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });
            row.commit();
            currentRowIndex++;
        });

        // 5. Download (MODIFIED: Return Blob instead of auto-download)
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const dateStr = dayjs().format('DDMMYYYY_HHmm');
        const fileName = `Danh_sach_doanh_nghiep_${dateStr}.xlsx`;

        return { blob, fileName };

    } catch (error) {
        console.error("Export Excel error:", error);
        throw error; // Let caller handle UI feedback
    }
};
