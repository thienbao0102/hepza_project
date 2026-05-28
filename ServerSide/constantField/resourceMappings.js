/**
 * Resource & Waste Mappings
 * Centralized constants for group/subgroup/model mappings
 */

// Ánh xạ số → nhóm code
const groupMapping = {
    1: 'material',
    2: 'chemical',
    3: 'el',
    4: 'wa',
    5: 'co',
    6: 'waste',

    // subgroups (material)
    11: 'WOOD', 12: 'MET', 13: 'NMET', 14: 'POL',
    15: 'TEX', 16: 'AGRI', 17: 'PAC', 18: 'MOTH',

    // subgroups (chemical)
    21: 'ACD', 22: 'BAS', 23: 'SLT', 24: 'SOL',
    25: 'GAS', 26: 'ADD', 27: 'REDOX', 28: 'CHOT', 29: 'HAZ',

    // subgroups (electricity)
    31: 'Grid', 32: 'Renewable',

    // subgroups (water)
    41: 'rain', 42: 'well', 43: 'tap', 44: 'recycle',

    // subgroups (combustion)
    51: 'COL', 52: 'BIO', 53: 'PET', 54: 'GASF', 55: 'COTH',

    // subgroups (waste)
    61: 'DO', 62: 'HA', 63: 'IND', 64: 'WWA', 65: 'GASW',
};

// Ánh xạ main_group → sub_groups
const subgroupMapping = {
    material: ['MET', 'NMET', 'POL', 'WOOD', 'TEX', 'AGRI', 'PAC', 'MOTH'],
    chemical: ['ACD', 'BAS', 'SLT', 'SOL', 'GAS', 'ADD', 'REDOX', 'CHOT', 'HAZ'],
    el: ['grid', 'renewable'],
    wa: ['tap', 'rain', 'well', 'recycle'],
    co: ['COL', 'BIO', 'PET', 'GASF', 'COTH'],
    waste: ['DO', 'HA', 'IND', 'WWA', 'GASW'],
};

// Ánh xạ main_group → model name
const modelMap = {
    material: 'InputResource',
    chemical: 'InputResource',
    el: 'FuelResource',
    wa: 'FuelResource',
    co: 'FuelResource',
    waste: 'WasteResource',
};

// Usage field mapping for electricity/water
const USAGE_FIELD_MAP = {
    'Sản xuất': 'production',
    'Sinh hoạt': 'domestic',
    'Tưới tiêu': 'irrigation',
    'Khác': 'other',
};

// Vietnamese name → waste group code mapping
const WASTE_GROUP_MAP = {
    'chất thải sinh hoạt': 'DO',
    'chất thải công nghiệp': 'IND',
    'chất thải nguy hại': 'HA',
    'nước thải': 'WWA',
    'khí thải công nghiệp': 'GASW',
    'khí thải': 'GASW',
};

// Vietnamese waste names for DB compatibility
const WASTE_VIETNAMESE_NAMES = ['chất thải sinh hoạt', 'chất thải công nghiệp', 'chất thải nguy hại', 'nước thải', 'khí thải công nghiệp', 'khí thải'];

// Import group name mapping
const IMPORT_GROUP_NAMES = {
    material: 'nguyên vật liệu',
    chemical: 'hóa chất',
    el: 'điện',
    wa: 'nước',
    co: 'chất đốt',
    waste: 'chất thải',
};

module.exports = {
    groupMapping,
    subgroupMapping,
    modelMap,
    USAGE_FIELD_MAP,
    WASTE_GROUP_MAP,
    WASTE_VIETNAMESE_NAMES,
    IMPORT_GROUP_NAMES,
};
