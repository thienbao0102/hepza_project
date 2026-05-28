const parseCompanyIds = (input) => {
    if (!input) throw new Error('company_ids is required');

    let ids = [];

    if (typeof input === 'string') {
        ids = input.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(input)) {
        ids = input;
    }

    if (ids.length === 0) {
        throw new Error('company_ids must not be empty');
    }

    return ids; // luôn là mảng
};

const parseZoneIds = (input) => {
    if (!input) throw new Error('zone_ids is required');
    let ids = [];
    if (typeof input === 'string') {
        ids = input.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(input)) {
        ids = input;
    }
    if (ids.length === 0) {
        throw new Error('zone_ids must not be empty');
    }
    return ids;
};

module.exports = { parseCompanyIds, parseZoneIds }