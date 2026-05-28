/**
 * Resource Helper Utilities
 * Shared utility functions for resource & waste processing
 */

const Fuse = require('fuse.js');
const levenshtein = require('fast-levenshtein');

/**
 * Chuẩn hóa chuỗi về dạng không dấu và chữ thường
 */
const normalizeString = (str = '') => {
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
};

const normalizeFuelToken = (str = '') => {
    return normalizeString(str).replace(/0/g, 'o');
};

const FUEL_CATALOG = {
    grid_electricity: {
        aliases: ['dien luoi', 'grid electricity', 'electricity grid', 'điện lưới ', 'điện lưới quốc gia'],
        subGroupCodes: ['grid'],
    },
    water: {
        aliases: ['nuoc', 'nuoc may', 'water', 'tap water', 'nước', 'nước máy'],
        subGroupCodes: ['tap', 'rain', 'well', 'recycle'],
    },
    DO_oil: {
        aliases: ['dau do', 'dau d0', 'diesel', 'do oil', 'dau diesel'],
        subGroupCodes: ['pet'],
    },
    gasoline: {
        aliases: ['xang', 'gasoline', 'petrol', 'ron95'],
        subGroupCodes: ['pet'],
    },
    FO_oil: {
        aliases: ['dau fo', 'dau f0', 'fuel oil', 'fo oil'],
        subGroupCodes: ['pet'],
    },
    biomass: {
        aliases: ['sinh khoi', 'biomass'],
        subGroupCodes: ['bio'],
    },
    charcoal: {
        aliases: ['than', 'charcoal'],
        subGroupCodes: ['col'],
    },
    natural_gas: {
        aliases: ['khi tu nhien', 'natural gas', 'cng',],
        subGroupCodes: ['gasf'],
    },
    LPG: {
        aliases: ['lpg', 'liquefied petroleum gas', 'khí hóa lỏng'],
        subGroupCodes: ['gasf'],
    },
    gas: {
        aliases: ['gas', 'khi dot'],
        subGroupCodes: ['gasf'],
    }
};

/**
 * Fuel density values in kg/m³ (IPCC 2006 / GHG Protocol)
 * Used by convertToTons() for m³ → tấn conversion
 */
const FUEL_DENSITY_MAP = {
    DO_oil: 832,        // kg/m³ — Diesel (IPCC 2006 Table 1.2)
    gasoline: 740,      // kg/m³ — Gasoline (IPCC 2006 Table 1.2)
    FO_oil: 960,        // kg/m³ — Fuel Oil heavy (IPCC 2006 Table 1.2)
    LPG: 540,           // kg/m³ — Liquefied Petroleum Gas (GHG Protocol)
    natural_gas: 0.78,  // kg/m³ — Natural Gas at STP (GHG Protocol)
    gas: 0.78,          // kg/m³ — Gas generic (same as natural_gas)
    biomass: 400,       // kg/m³ — Biomass dry wood average (IPCC 2006)
    charcoal: 500,      // kg/m³ — Coal sub-bituminous average (IPCC 2006)
    water: 1000,        // kg/m³ — Water (IPCC 2006 Table 1.2)
};

/**
 * Convert quantity from given unit to tons (tấn)
 * @param {number} value - Raw quantity
 * @param {string|null} unit - Unit: 'tấn'/'tan'/'t' or 'm3'/'m³'
 * @param {string} fuelType - Key from FUEL_CATALOG (e.g. 'DO_oil', 'gasoline')
 * @returns {number} Quantity in tons
 */
const convertToTons = (value, unit, fuelType) => {
    if (!unit) return value;

    const normalizedUnit = normalizeString(unit);

    if (normalizedUnit === 'tan' || normalizedUnit === 't') {
        return value;
    }

    if (normalizedUnit === 'm3' || normalizedUnit === 'm³' || normalizedUnit === 'm^3') {
        const density = FUEL_DENSITY_MAP[fuelType];
        if (!density) {
            console.warn(`[CO2] No density for fuelType="${fuelType}" with unit m³ — returning 0`);
            return 0;
        }
        return (value * density) / 1000;
    }

    if (fuelType === 'grid_electricity') {
        if (normalizedUnit === 'kwh') {
            return value / 1000;
        }
        if (normalizedUnit === 'mwh') {
            return value;
        }
    }

    return value;
};

const FUEL_ALIAS_INDEX = Object.entries(FUEL_CATALOG).flatMap(([type, def]) =>
    def.aliases.map((alias) => ({ type, alias: normalizeFuelToken(alias) }))
);

const fuelFuse = new Fuse(FUEL_ALIAS_INDEX, {
    keys: ['alias'],
    includeScore: true,
    threshold: 0.8,
    ignoreLocation: true,
    minMatchCharLength: 2,
});

const resolveFuelType = (name, sub) => {
    const normalizedName = normalizeFuelToken(name);
    const normalizedSub = normalizeString(sub);

    if (!normalizedName) {
        for (const [type, def] of Object.entries(FUEL_CATALOG)) {
            if (def.subGroupCodes.includes(normalizedSub)) return type;
        }
        return null;
    }

    if (normalizedName.length <= 2) return null;

    const exactNameMatches = [];
    for (const [type, def] of Object.entries(FUEL_CATALOG)) {
        for (const rawAlias of def.aliases) {
            const alias = normalizeFuelToken(rawAlias);
            if (!alias) continue;
            if (normalizedName === alias) {
                exactNameMatches.push({ type });
            }
        }
    }

    if (exactNameMatches.length > 0) {
        let scopedExact = exactNameMatches;
        if (normalizedSub) {
            const subScoped = exactNameMatches.filter((x) => FUEL_CATALOG[x.type].subGroupCodes.includes(normalizedSub));
            if (subScoped.length > 0) scopedExact = subScoped;
        }

        const exactTypes = [...new Set(scopedExact.map((x) => x.type))];
        if (exactTypes.length === 1) return exactTypes[0];
    }

    const exactAliasMatches = [];
    for (const [type, def] of Object.entries(FUEL_CATALOG)) {
        for (const rawAlias of def.aliases) {
            const alias = normalizeFuelToken(rawAlias);
            if (!alias) continue;
            if (normalizedName.includes(alias) || alias.includes(normalizedName)) {
                exactAliasMatches.push({ type, aliasLen: alias.length });
            }
        }
    }

    if (exactAliasMatches.length > 0) {
        let scopedMatches = exactAliasMatches;
        if (normalizedSub) {
            const subScoped = exactAliasMatches.filter((x) => FUEL_CATALOG[x.type].subGroupCodes.includes(normalizedSub));
            if (subScoped.length > 0) scopedMatches = subScoped;
        }

        scopedMatches.sort((a, b) => b.aliasLen - a.aliasLen);
        const bestExact = scopedMatches[0];
        const hasExactTie = scopedMatches.some((x) => x.type !== bestExact.type && x.aliasLen === bestExact.aliasLen);
        if (!hasExactTie) return bestExact.type;
    }

    const candidates = fuelFuse.search(normalizedName, { limit: 5 });
    if (!candidates.length) return null;

    let ranked = candidates
        .map(({ item }) => ({
            type: item.type,
            dist: levenshtein.get(normalizedName, item.alias),
            aliasLen: Math.max(normalizedName.length, item.alias.length),
        }))
        .sort((a, b) => a.dist - b.dist);

    if (normalizedSub) {
        const subMatched = ranked.filter((x) => FUEL_CATALOG[x.type].subGroupCodes.includes(normalizedSub));
        if (subMatched.length > 0) ranked = subMatched;
    }

    const best = ranked[0];
    const ratio = best.aliasLen === 0 ? 1 : best.dist / best.aliasLen;
    if (ratio > 0.35) return null;

    const tieCount = ranked.filter((x) => x.type !== best.type && x.dist === best.dist).length;
    if (tieCount > 0) return null;

    return best.type;
};
/**
 * Chuẩn hóa tên: viết hoa chữ đầu, giữ nguyên phần còn lại
 * Ví dụ: "gỗ công nghiệp MDF" → "Gỗ công nghiệp MDF"
 */

const capitalizeFirst = (str) => {
    if (!str) return '';
    const s = str.toString().trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Format date to dd/mm/yyyy hh:mm
 */
const formatDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/**
 * Chọn các trường quan trọng để lưu vào versioning
 */
const pickChangedFields = (oldObj, newObj, resourceType) => {
    const importantFields = {
        InputResource: ['name', 'quantity', 'unit', 'main_group', 'sub_group', 'note', 'price'],
        FuelResource: ['fuelName', 'quantity', 'unit', 'main_group', 'sub_group', 'note', 'production', 'domestic', 'irrigation', 'other', 'purpose'],
        WasteResource: ['wasteName', 'quantity', 'unit', 'codeWaste', 'wasteCodeName', 'status', 'treatmentMethods', 'main_group', 'note', 'price', 'purpose', 'purchasingAddress', 'purchasingUnit'],
    };

    const fields = importantFields[resourceType] || [];

    const normalize = (obj) => {
        if (!obj) return null;
        // Flatten detail if exists
        const source = obj.detail ? { ...obj, ...obj.detail } : obj;

        const res = {};
        for (const f of fields) {
            let val = source[f];
            if (val === undefined || val === null) res[f] = '';
            else if (typeof val === 'number') res[f] = Number(val.toFixed(10));
            else if (typeof val === 'string') res[f] = val.trim();
            else res[f] = val;
        }
        return res;
    };

    return {
        oldData: normalize(oldObj),
        newData: normalize(newObj),
    };
};

/**
 * Xác định nguồn nhiên liệu đốt từ label hoặc subGroup
 */
const getCombustionSource = (normalizedLabel, subGroup) => {
    return String(resolveFuelType(normalizedLabel, subGroup));
};

/**
 * Tính khí thải CO2 từ tài nguyên
 * @param {number} quantity - Số lượng
 * @param {string} fuelName - Tên nhiên liệu
 * @param {string} subGroup - Mã nhóm phụ
 * @param {string} [unit='tấn'] - Đơn vị nguyên liệu ('tấn' hoặc 'm3')
 * @returns {number} CO2 tính bằng tấn
 */
const calculateCO2Emission = (quantity, fuelName, subGroup, unit = 'tấn') => {
    const q_raw = Number(quantity) || 0;
    if (q_raw <= 0) return 0;

    const name = normalizeString(fuelName);
    const sub = normalizeString(subGroup);

    const fuelType = getCombustionSource(name, sub);

    // Convert m³ → tấn if needed (uses FUEL_DENSITY_MAP)
    const q = convertToTons(q_raw, unit, fuelType);
    if (q <= 0) return 0;

    let co2eKg = 0;

    switch (fuelType) {
        case 'grid_electricity':
            return q * 0.6811;//tấn co2e
            break;
        case 'water':
            co2eKg = q * 0.177;
            break;
        case 'DO_oil': {
            const energy = q * 42707.4 * 1e-6;
            co2eKg = energy * (74100 + 3 * 24 + 6 * 298);
            break;
        }
        case 'gasoline': {
            const energy = q * 44300 * 1e-6;
            co2eKg = energy * (69300 + 33 * 24 + 3.2 * 298);
            break;
        }
        case 'FO_oil': {
            const energy = q * 40193 * 1e-6;
            co2eKg = energy * (77400 + 3 * 24 + 0.6 * 298);
            break;
        }
        case 'biomass': {
            const energy = q * 15600 * 1e-6;
            co2eKg = energy * (100000 + 30 * 24 + 4 * 298);
            break;
        }
        case 'charcoal': {
            const energy = q * 31402 * 1e-6;
            co2eKg = energy * (112000 + 200 * 24 + 4 * 298);
            break;
        }
        case 'natural_gas':
        case 'gas': {
            const energy = q * 37683 * 1e-6;
            co2eKg = energy * (56100 + 1 * 24 + 1 * 298);
            break;
        }
        case 'LPG': {
            const energy = q * 45638.3 * 1e-6;
            co2eKg = energy * (63100 + 1 * 24 + 1 * 298);
            break;
        }
    }
    // convert kg -> ton
    return co2eKg / 1000;
};

/**
 * Xác định loại nhiên liệu dựa trên tên (normalized) + subGroup fallback
 */
const identifyFuelType = (name, sub) => {
    return resolveFuelType(name, sub);
};

/**
 * Group electricity data — gom nhiều dòng cùng label+sub_group lại
 */
const groupElectricityData = (rawElectricity, USAGE_FIELD_MAP) => {
    const result = {};

    for (const [usageType, items] of Object.entries(rawElectricity || {})) {
        if (!Array.isArray(items)) continue;

        for (const item of items) {
            const value = Number(item.value) || 0;
            if (value <= 0) continue;

            const key = `${item.label}__${item.sub_group}`;

            if (!result[key]) {
                result[key] = {
                    _id: item._id,
                    label: item.label,
                    unit: item.unit,
                    sub_group: item.sub_group,
                    total: 0,
                    detail: { production: 0, domestic: 0, irrigation: 0, other: 0 },
                    note: item.note || '',
                };
            } else if (item._id && !result[key]._id) {
                result[key]._id = item._id;
            }

            const field = USAGE_FIELD_MAP[usageType];
            if (field) {
                result[key].detail[field] += value;
                result[key].total += value;
            }
        }
    }

    return Object.values(result);
};

/**
 * Group water data — gom nhiều dòng cùng label+sub_group lại
 */
const groupWaterData = (rawWater) => {
    const result = {};

    for (const items of Object.values(rawWater || {})) {
        if (!Array.isArray(items)) continue;

        for (const item of items) {
            const value = Number(item.value) || 0;
            if (value <= 0) continue;

            const key = `${item.label}__${item.sub_group}`;

            if (!result[key]) {
                result[key] = {
                    _id: item._id,
                    label: item.label,
                    unit: item.unit,
                    sub_group: item.sub_group,
                    total: 0,
                    note: item.note || '',
                };
            } else if (item._id && !result[key]._id) {
                result[key]._id = item._id;
            }

            result[key].total += value;
        }
    }

    return Object.values(result);
};

/**
 * Build key cho emission từ combustion source
 */
const buildCombustionEmissionKey = (label, subGroupCode) => {
    const source = getCombustionSource(normalizeString(label || ''), subGroupCode);
    return source ? `total_co2_from_${source}` : null;
};

/**
 * Chuẩn hóa đơn vị hóa chất thành: 'kg' | 'l' | 'm3'
 * Xử lý tất cả biến thể tiếng Việt, Unicode, viết hoa/thường
 */
const normalizeChemicalUnit = (rawUnit) => {
    if (!rawUnit) return 'kg';
    const u = rawUnit.toString().toLowerCase().trim();
    if (u === 'kg' || u === 'tấn' || u === 'tan' || u === 'g' || u === 'gram') return 'kg';
    if (u === 'l' || u === 'lít' || u === 'lit' || u === 'liter' || u === 'litre') return 'l';
    if (u === 'm3' || u === 'm³' || u === 'm^3' || u === 'khối') return 'm3';
    return 'kg';
};

/**
 * Regex escape for import queries
 */
const escapeRegexForImport = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Khởi tạo query lấy data resource
 */
const initQueryGetDataResource = (periodKeyStart, periodKeyEnd, role, company_id, zone_id) => {
    const query = { isDeleted: { $ne: true } };

    if ((role === 'admin' || role === 'manager' || role === 'company') && company_id) {
        query.company_id = company_id;
    } else if ((role === 'admin' || role === 'manager') && zone_id) {
        query.zone_id = zone_id;
    }

    if (periodKeyStart && periodKeyEnd) {
        query.periodKey = { $gte: periodKeyStart, $lte: periodKeyEnd };
    } else if (periodKeyStart) {
        query.periodKey = periodKeyStart;
    } else if (periodKeyEnd) {
        query.periodKey = periodKeyEnd;
    }

    return query;
};

/**
 * Ánh xạ subGroup sang code — uses getCode from abbreviationInMemory
 */
const { getCode } = require('./abbreviationInMemory');

function mapToSubGroup(feMainGroup, feSubGroup, itemLabel = null) {
    let abbreviation_id;

    if (feSubGroup) {
        abbreviation_id = getCode(feSubGroup);
    }
    if (!abbreviation_id && itemLabel) {
        abbreviation_id = getCode(itemLabel);
    }

    if (!abbreviation_id) {
        throw new Error(`Không tìm thấy sub_group cho: ${feSubGroup} (main: ${feMainGroup})`);
    }

    return abbreviation_id;
}

module.exports = {
    normalizeString,
    capitalizeFirst,
    formatDate,
    pickChangedFields,
    getCombustionSource,
    calculateCO2Emission,
    convertToTons,
    FUEL_DENSITY_MAP,
    identifyFuelType,
    groupElectricityData,
    groupWaterData,
    buildCombustionEmissionKey,
    normalizeChemicalUnit,
    escapeRegexForImport,
    initQueryGetDataResource,
    mapToSubGroup,
};
