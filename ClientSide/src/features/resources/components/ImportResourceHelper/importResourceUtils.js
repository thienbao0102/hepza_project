import { z } from 'zod';

// Định nghĩa các sheet config - mapping từ tên sheet sang code hệ thống
export const SHEET_CONFIGS = {
    'Nguyên vật liệu': {
        mainGroup: 'material',
        model: 'InputResource',
        nameField: 'name',
        subGroupMap: {
            'Kim loại & Hợp kim': 'MET',
            'Kim loại': 'MET',
            'Phi kim': 'NMET',
            'Phi kim loại': 'NMET',
            'Nhựa & Polyme': 'POL',
            'Polymer/Nhựa': 'POL',
            'Gỗ': 'WOOD',
            'Vải & Sợi vải': 'TEX',
            'Vải/Dệt': 'TEX',
            'Thực phẩm & Nông sản': 'AGRI',
            'Nông sản': 'AGRI',
            'Giấy & Bìa carton': 'PAC',
            'Bao bì': 'PAC',
            'Vật liệu khác': 'MOTH',
            'Khác': 'MOTH'
        },
        columns: ['Nhóm phụ', 'Tên nguyên liệu', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        defaultUnit: 'Tấn'
    },
    'Hóa chất': {
        mainGroup: 'chemical',
        model: 'InputResource',
        nameField: 'name',
        subGroupMap: {
            'Hóa chất nguy hiểm': 'HAZ',
            'Nguy hại': 'HAZ',
            'Axit': 'ACD',
            'Bazơ/Kiềm': 'BAS',
            'Bazơ': 'BAS',
            'Muối': 'SLT',
            'Dung môi': 'SOL',
            'Khí & Hóa chất bay hơi': 'GAS',
            'Khí': 'GAS',
            'Phụ gia': 'ADD',
            'Chất khử': 'REDOX',
            'Oxy hóa - Khử': 'REDOX',
            'Hóa chất khác': 'CHOT',
            'Khác': 'CHOT'
        },
        columns: ['Nhóm phụ', 'Tên hóa chất', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        defaultUnit: 'Kg'
    },
    'Điện': {
        mainGroup: 'el',
        model: 'FuelResource',
        nameField: 'fuelName',
        subGroupMap: {
            'Điện lưới': 'Grid',
            'Điện tái tạo': 'Renewable'
        },
        columns: ['Nguồn điện', 'Tên nguồn điện', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        defaultUnit: 'kWh'
    },
    'Nước': {
        mainGroup: 'wa',
        model: 'FuelResource',
        nameField: 'fuelName',
        subGroupMap: {
            'Nước cấp': 'tap',
            'Nước mưa': 'rain',
            'Nước giếng': 'well',
            'Nước tái chế': 'recycle',
            'Nước tái sử dụng': 'recycle'
        },
        columns: ['Nguồn nước', 'Số lượng (m³)', 'Ghi chú'],
        defaultUnit: 'm³'
    },
    'Chất đốt': {
        mainGroup: 'co',
        model: 'FuelResource',
        nameField: 'fuelName',
        subGroupMap: {
            'Than': 'COL',
            'Than đá': 'COL',
            'Biomass': 'BIO',
            'Sinh khối': 'BIO',
            'Nhiên liệu dầu mỏ': 'PET',
            'Xăng dầu': 'PET',
            'Chất đốt dạng khí': 'GASF',
            'Khí đốt': 'GASF',
            'Chất đốt khác': 'COTH',
            'Khác': 'COTH'
        },
        columns: ['Loại nhiên liệu', 'Tên nhiên liệu', 'Số lượng', 'Đơn vị', 'Ghi chú'],
        defaultUnit: 'Lít'
    },
    'Chất thải': {
        mainGroup: 'waste',
        model: 'WasteResource',
        nameField: 'wasteName',
        subGroupMap: {
            'Chất thải sinh hoạt': 'DO',
            'Sinh hoạt': 'DO',
            'Chất thải công nghiệp': 'IND',
            'Công nghiệp': 'IND',
            'Chất thải nguy hại': 'HA',
            'Nguy hại': 'HA',
            'Nước thải': 'WWA',
            'Khí thải công nghiệp': 'GASW',
            'Khí thải': 'GASW'
        },
        columns: ['Loại chất thải', 'Tên chất thải', 'Mã CTNH', 'Trạng thái', 'Số lượng', 'Đơn vị', 'Phương pháp xử lý'],
        defaultUnit: 'Tấn'
    }
};

// Validatable sheet names
export const VALID_SHEET_NAMES = Object.keys(SHEET_CONFIGS);

// Helper: Format File Size
export const formatFileSize = (bytes) => {
    if (!bytes) return '0 Byte';
    const k = 1024;
    const sizes = ['Byte', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper: Get Vietnamese label for main group
export const getMainGroupLabel = (mainGroup) => {
    const labels = {
        material: 'Nguyên vật liệu',
        chemical: 'Hóa chất',
        el: 'Điện',
        wa: 'Nước',
        co: 'Chất đốt',
        waste: 'Chất thải'
    };
    return labels[mainGroup] || mainGroup;
};

// Helper: Get sub group label by code
export const getSubGroupLabel = (sheetName, code) => {
    const config = SHEET_CONFIGS[sheetName];
    if (!config) return code;
    const entry = Object.entries(config.subGroupMap).find(([_, c]) => c === code);
    return entry ? entry[0] : code;
};

// Color scheme for each resource type
export const RESOURCE_COLORS = {
    material: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    chemical: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
    el: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
    wa: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
    co: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
    waste: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
};

// Icons for each resource type
export const RESOURCE_ICONS = {
    material: '🏭',
    chemical: '⚗️',
    el: '⚡',
    wa: '💧',
    co: '🔥',
    waste: '🗑️'
};
