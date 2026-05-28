const Abbreviation = require('../models/abbreviationModel');
let abbrMap = {};

const loadAbbreviations = async () => {
    const docs = await Abbreviation.find().lean();
    abbrMap = Object.fromEntries(docs.map(a => [a._id, a.name_group]));
    // console.log('Abbreviations loaded successfully');
}

const getName = (code) => {
    return abbrMap[code] || code;
}

const getCode = (name) => {
    const normalize = str =>
        str?.normalize('NFC').trim().toLowerCase();

    const normalizedName = normalize(name);
    // Tìm trong abbrMap giá trị có tên chuẩn hóa có chứa ký tự giống normalizedName
    const entry = Object.entries(abbrMap).find(([_, value]) => normalize(value) === normalizedName);

    // Fallback hardcoded map for critical system codes
    const HARDCODED_ABBREVIATIONS = {
        'nước tái sử dụng': 'recycle', 'nuoc tai su dung': 'recycle',
        'nước tái chế': 'recycle', 'nuoc tai che': 'recycle',
        'nước mưa': 'rain', 'nuoc mua': 'rain',
        'nước cấp': 'supply', 'nuoc cap': 'supply',
        'nước máy': 'tap', 'nuoc may': 'tap',
        'nước giếng': 'well', 'nuoc gieng': 'well',
        'điện lưới': 'Grid', 'dien luoi': 'Grid',
        'điện tái tạo': 'Renewable', 'dien tai tao': 'Renewable',
        'kim loại': 'MET', 'kim loai': 'MET',
        'gỗ': 'WOOD', 'go0': 'WOOD', 'go': 'WOOD',
        'nhựa': 'POL', 'nhua': 'POL',
    };

    if (entry) return entry[0];

    // Check hardcoded map
    for (const [key, code] of Object.entries(HARDCODED_ABBREVIATIONS)) {
        if (normalizedName.includes(key)) return code;
    }

    if (!entry) {
        // Fallback: Nếu name chính là code (key trong maps) thì trả về luôn
        if (abbrMap[name]) return name;
        if (Object.values(HARDCODED_ABBREVIATIONS).includes(name)) return name;

        console.warn(`Abbreviation name "${normalizedName}" not found, returning raw name.`);
        return name;
    }

    return entry[0];
}

const convertUsingGetName = (item) => {
    const obj = { ...item };

    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === "string" && abbrMap[obj[key]]) {
            obj[key] = getName(obj[key]);
        }
    }

    return obj;
};


module.exports = { loadAbbreviations, getName, getCode, convertUsingGetName };
