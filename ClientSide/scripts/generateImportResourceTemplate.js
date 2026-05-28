/**
 * Script tạo file Excel Template cho Import Resources
 * Chạy: node scripts/generateImportResourceTemplate.js
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Định nghĩa cấu trúc các sheets
const SHEET_CONFIGS = [
    {
        name: 'Nguyên vật liệu',
        headers: ['Nhóm phụ', 'Tên nguyên liệu', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        subGroups: [
            { label: 'Kim loại', code: 'MET' },
            { label: 'Phi kim loại', code: 'NMET' },
            { label: 'Polymer/Nhựa', code: 'POL' },
            { label: 'Gỗ', code: 'WOOD' },
            { label: 'Vải/Dệt', code: 'TEX' },
            { label: 'Nông sản', code: 'AGRI' },
            { label: 'Bao bì', code: 'PAC' },
            { label: 'Khác', code: 'MOTH' }
        ],
        sampleData: [
            ['Kim loại', 'Thép cuộn cán nóng', 150, 'Tấn', 'Nhập từ Formosa'],
            ['Polymer/Nhựa', 'Hạt nhựa PP', 80, 'Tấn', ''],
            ['Gỗ', 'Gỗ MDF', 25, 'Tấn', 'Gỗ công nghiệp']
        ],
        defaultUnit: 'Tấn'
    },
    {
        name: 'Hóa chất',
        headers: ['Nhóm phụ', 'Tên hóa chất', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        subGroups: [
            { label: 'Axit', code: 'ACD' },
            { label: 'Bazơ', code: 'BAS' },
            { label: 'Muối', code: 'SLT' },
            { label: 'Dung môi', code: 'SOL' },
            { label: 'Khí', code: 'GAS' },
            { label: 'Phụ gia', code: 'ADD' },
            { label: 'Oxy hóa - Khử', code: 'REDOX' },
            { label: 'Nguy hại', code: 'HAZ' },
            { label: 'Khác', code: 'CHOT' }
        ],
        sampleData: [
            ['Axit', 'Axit sulfuric H2SO4', 500, 'Kg', 'Nồng độ 98%'],
            ['Dung môi', 'Ethanol công nghiệp', 200, 'Lít', ''],
            ['Bazơ', 'NaOH', 150, 'Kg', 'Xút vảy']
        ],
        defaultUnit: 'Kg'
    },
    {
        name: 'Điện',
        headers: ['Nguồn điện', 'Tên nguồn điện', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        subGroups: [
            { label: 'Điện lưới', code: 'Grid' },
            { label: 'Điện tái tạo', code: 'Renewable' }
        ],
        sampleData: [
            ['Điện lưới', 'Điện lưới quốc gia', 50000, 'kWh', 'Trạm 1'],
            ['Điện tái tạo', 'Điện tái tạo', 10000, 'kWh', 'Trạm 2']
        ],
        defaultUnit: 'kWh'
    },
    {
        name: 'Nước',
        headers: ['Nguồn nước', 'Tên', 'Số lượng (m³)', 'Ghi chú'],
        subGroups: [
            { label: 'Nước máy', code: 'tap' },
            { label: 'Nước mưa', code: 'rain' },
            { label: 'Nước giếng', code: 'well' },
            { label: 'Nước tái chế', code: 'recycle' }
        ],
        sampleData: [
            ['Nước máy', 'Nước cấp thành phố', 1200, 'Hợp đồng với Sawaco'],
            ['Nước giếng', 'Giếng khoan số 1', 500, ''],
            ['Nước tái chế', 'Nước tái chế từ XLNT', 300, 'Tái sử dụng cho tưới cây']
        ],
        defaultUnit: 'm³'
    },
    {
        name: 'Chất đốt',
        headers: ['Loại nhiên liệu', 'Tên nhiên liệu', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        subGroups: [
            { label: 'Than đá', code: 'COL' },
            { label: 'Sinh khối', code: 'BIO' },
            { label: 'Xăng dầu', code: 'PET' },
            { label: 'Khí đốt', code: 'GASF' },
            { label: 'Khác', code: 'COTH' }
        ],
        sampleData: [
            ['Xăng dầu', 'Dầu DO', 5000, 'Lít', 'Nhiên liệu máy phát điện'],
            ['Khí đốt', 'Khí hóa lỏng LPG', 200, 'm³', ''],
            ['Than đá', 'Than anthracite', 50, 'Tấn', 'Than đốt lò hơi']
        ],
        defaultUnit: 'Lít'
    },
    {
        name: 'Chất thải',
        headers: ['Loại chất thải', 'Tên chất thải', 'Mã CTNH', 'Trạng thái', 'Số lượng', 'Đơn vị', 'Phương pháp xử lý'],
        subGroups: [
            { label: 'Sinh hoạt', code: 'DO' },
            { label: 'Công nghiệp', code: 'IND' },
            { label: 'Nguy hại', code: 'HA' },
            { label: 'Nước thải', code: 'WWA' },
            { label: 'Khí thải công nghiệp', code: 'GASW' }
        ],
        sampleData: [
            ['Sinh hoạt', 'Rác thải văn phòng', '', '', 2, 'Tấn', 'Thu gom hàng tuần'],
            ['Công nghiệp', 'Phế liệu sản xuất', '', '', 15, 'Tấn', 'Tái chế'],
            ['Nguy hại', 'Bùn thải nhiễm dầu', '13 02 05', 'Rắn', 0.5, 'Tấn', 'Thiêu đốt'],
            ['Nước thải', 'Nước thải sản xuất', '', '', 800, 'm³', 'Xử lý hóa lý'],
            ['Khí thải công nghiệp', 'Khí thải lò hơi', '', '', 120, 'mg/l', 'Hấp thụ bằng tháp rửa khí']
        ],
        defaultUnit: 'Tấn'
    }
];

// Style cho header
const HEADER_STYLE = {
    fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' } // Màu xanh dương đậm
    },
    font: {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 12
    },
    alignment: {
        horizontal: 'center',
        vertical: 'middle'
    },
    border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    }
};

// Style cho data cells
const DATA_STYLE = {
    border: {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    },
    alignment: {
        vertical: 'middle'
    }
};

// Style cho instruction row
const INSTRUCTION_STYLE = {
    fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF9E6' } // Màu vàng nhạt
    },
    font: {
        italic: true,
        color: { argb: 'FF666666' },
        size: 10
    }
};

async function generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HEPZA-SDMS';
    workbook.created = new Date();

    // Tạo sheet Hướng dẫn
    const guideSheet = workbook.addWorksheet('Hướng dẫn', {
        properties: { tabColor: { argb: 'FFFF9900' } }
    });

    guideSheet.columns = [{ width: 80 }];

    const guideContent = [
        ['📋 HƯỚNG DẪN SỬ DỤNG FILE TEMPLATE IMPORT RESOURCES'],
        [''],
        ['1. File này dùng để import dữ liệu tài nguyên vào hệ thống HEPZA-SDMS'],
        ['2. Mỗi sheet tương ứng với 1 loại tài nguyên'],
        ['3. Chỉ cần điền dữ liệu vào các sheet cần import, bỏ trống sheet nếu không có dữ liệu'],
        [''],
        ['⚠️ LƯU Ý QUAN TRỌNG:'],
        ['- Cột "Nhóm phụ" / "Nguồn" / "Loại" phải điền đúng giá trị trong danh sách cho phép'],
        ['- Số lượng phải là số dương'],
        ['- Đơn vị phải phù hợp với loại tài nguyên'],
        [''],
        ['📊 LOGIC IMPORT:'],
        ['- Nếu sheet CÓ dữ liệu → XÓA dữ liệu cũ + THÊM dữ liệu mới'],
        ['- Nếu sheet TRỐNG → GIỮ NGUYÊN dữ liệu cũ'],
        ['- Cột "Trạng thái" chỉ áp dụng cho chất thải nguy hại khi có mã CTNH'],
        ['- Khí thải công nghiệp luôn dùng đơn vị mg/l'],
        [''],
        ['📞 Liên hệ hỗ trợ: support@hepza-sdms.vn']
    ];

    guideContent.forEach((row, idx) => {
        const r = guideSheet.addRow(row);
        if (idx === 0) {
            r.font = { bold: true, size: 16, color: { argb: 'FF0066CC' } };
        } else if (row[0]?.startsWith('⚠️') || row[0]?.startsWith('📊')) {
            r.font = { bold: true, size: 12, color: { argb: 'FFCC6600' } };
        }
    });

    // Tạo các sheets dữ liệu
    for (const config of SHEET_CONFIGS) {
        const sheet = workbook.addWorksheet(config.name, {
            properties: { tabColor: { argb: 'FF00CC66' } }
        });

        // Set column widths
        sheet.columns = config.headers.map((header, idx) => ({
            width: idx === 0 ? 20 : (header.includes('Tên') ? 30 : 15)
        }));

        // Add instruction row (row 1)
        const subGroupLabels = config.subGroups.map(sg => sg.label).join(', ');
        const instructionRow = sheet.addRow([`Giá trị hợp lệ cho cột "${config.headers[0]}": ${subGroupLabels}`]);
        instructionRow.eachCell(cell => {
            cell.style = INSTRUCTION_STYLE;
        });
        sheet.mergeCells(1, 1, 1, config.headers.length);

        // Add header row (row 2)
        const headerRow = sheet.addRow(config.headers);
        headerRow.height = 25;
        headerRow.eachCell(cell => {
            cell.style = HEADER_STYLE;
        });

        // Add sample data (rows 3+)
        config.sampleData.forEach(data => {
            const dataRow = sheet.addRow(data);
            dataRow.eachCell(cell => {
                cell.style = DATA_STYLE;
            });
        });

        // Add data validation for first column (subGroup/source/type)
        const validValues = config.subGroups.map(sg => sg.label);
        sheet.dataValidations.add('A3:A1000', {
            type: 'list',
            allowBlank: false,
            formulae: [`"${validValues.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Giá trị không hợp lệ',
            error: `Vui lòng chọn một trong các giá trị: ${validValues.join(', ')}`
        });

        // Freeze header row
        sheet.views = [{ state: 'frozen', ySplit: 2 }];
    }

    // Save file
    const outputPath = path.join(__dirname, '../public/templates/Template_Import_Resources.xlsx');
    await workbook.xlsx.writeFile(outputPath);

    console.log('✅ Template đã được tạo thành công!');
    console.log(`📁 Đường dẫn: ${outputPath}`);

    return outputPath;
}

// Run
generateTemplate().catch(err => {
    console.error('❌ Lỗi tạo template:', err);
    process.exit(1);
});
