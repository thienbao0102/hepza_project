/**
 * Collect all Cloudinary URLs associated with a company before hard-delete.
 * This runs INSIDE the transaction (to guarantee consistent reads),
 * while the actual Cloudinary cleanup runs AFTER commit (fire-and-forget).
 *
 * Design: read-only queries, zero mutation, safe to call anywhere.
 */
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const WasteResource = require('../models/wasteResourcesModel');
const FuelResource = require('../models/fuelResourcesModel');
const Company = require('../models/companyModel');

/**
 * Collect all Cloudinary URLs belonging to a company across all models
 * that store file references. Must be called BEFORE hard-deleting records.
 *
 * @param {string} company_id
 * @param {import('mongoose').ClientSession|null} session - MongoDB session (optional)
 * @returns {Promise<string[]>} Array of unique Cloudinary URLs
 */
async function collectCompanyCloudinaryUrls(company_id, session = null) {
    const opts = session ? { session } : {};
    const urls = [];

    // 1. WasteBuyDemand — attachments[].url
    const buyDemands = await WasteBuyDemand.find(
        { company_id },
        { 'attachments.url': 1 },
        opts
    ).lean();
    for (const doc of buyDemands) {
        for (const att of (doc.attachments || [])) {
            if (att?.url) urls.push(att.url);
        }
    }

    // 2. WasteSellOffer — attachments[].url
    const sellOffers = await WasteSellOffer.find(
        { company_id },
        { 'attachments.url': 1 },
        opts
    ).lean();
    for (const doc of sellOffers) {
        for (const att of (doc.attachments || [])) {
            if (att?.url) urls.push(att.url);
        }
    }

    // 3. WasteResource — attachments[].url
    const wasteResources = await WasteResource.find(
        { company_id },
        { 'attachments.url': 1 },
        opts
    ).lean();
    for (const doc of wasteResources) {
        for (const att of (doc.attachments || [])) {
            if (att?.url) urls.push(att.url);
        }
    }

    // 4. FuelResource — billImage
    const fuelResources = await FuelResource.find(
        { company_id, billImage: { $ne: null } },
        { billImage: 1 },
        opts
    ).lean();
    for (const doc of fuelResources) {
        if (doc.billImage) urls.push(doc.billImage);
    }

    // 5. Company licenses — licenses[].file_url
    const company = await Company.findOne(
        { company_id },
        { 'licenses.file_url': 1 },
        opts
    ).lean();
    if (company) {
        for (const license of (company.licenses || [])) {
            if (license?.file_url) urls.push(license.file_url);
        }
    }

    // Dedupe
    return [...new Set(urls.filter(Boolean))];
}

module.exports = { collectCompanyCloudinaryUrls };
