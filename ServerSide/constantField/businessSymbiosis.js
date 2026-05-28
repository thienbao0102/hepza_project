// BUY DEMAND fields
const BUY_DEMAND_FIELDS = `
    _id __v wasteName wasteNameNormalized otherWasteName desiredWasteCode
    quantity unit price expiryDate currency industrialGrs
    notes attachments createdAt __v
`;
// SELL SUPPLY fields
const SELL_SUPPLY_FIELDS = `
    _id __v wasteName wasteNameNormalized otherWasteName wasteCode hazardLevel
    quantity unit price industrialGrs expiryDate frequency currency
    notes attachments createdAt __v
`;
// SELL SUPPLY fields projection
const SELL_SUPPLY_PROJECTION = {
    _id: 1,
    __v: 1,
    wasteName: 1,
    wasteNameNormalized: 1,
    otherWasteName: 1,
    wasteCode: 1,
    industrialGrs: 1,
    hazardLevel: 1,
    quantity: 1,
    unit: 1,
    price: 1,
    currency: 1,
    frequency: 1,
    notes: 1,
    attachments: 1,
    expiryDate: 1,
    createdAt: 1,
    __v: 1,

    user: {
        user_id: '$user.user_id',
        full_name: '$user.full_name',
        email: '$user.email',
        phone_number: '$user.phone_number'
    },

    company: {
        company_id: '$company.company_id',
        company_name: '$company.company_name',
        zone_id: '$company.zone_id',
        zone_name: '$zoneInfo.zone_name',
        industry: '$company.industry',
        industry_group: '$company.industry_group',
        status: '$company.status'
    }
};
// BUY DEMAND fields projection
const BUY_DEMAND_PROJECTION = {
    _id: 1,
    __v: 1,
    wasteName: 1,
    wasteNameNormalized: 1,
    otherWasteName: 1,
    industrialGrs: 1,
    desiredWasteCode: 1,
    quantity: 1,
    unit: 1,
    price: 1,
    currency: 1,
    notes: 1,
    attachments: 1,
    expiryDate: 1,
    createdAt: 1,
    __v: 1,

    user: {
        user_id: '$user.user_id',
        full_name: '$user.full_name',
        email: '$user.email',
        phone_number: '$user.phone_number'
    },

    company: {
        company_id: '$company.company_id',
        company_name: '$company.company_name',
        zone_id: '$company.zone_id',
        zone_name: '$zoneInfo.zone_name',
        industry: '$company.industry',
        industry_group: '$company.industry_group',
        status: '$company.status'
    }
};

module.exports = {
    BUY_DEMAND_FIELDS,
    SELL_SUPPLY_FIELDS,
    SELL_SUPPLY_PROJECTION,
    BUY_DEMAND_PROJECTION
};

