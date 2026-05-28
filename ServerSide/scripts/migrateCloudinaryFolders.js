const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/companyModel');
const EnvironmentalReport = require('../models/environmentalReportModel');
const ErrorLog = require('../models/errorLog');
const FuelResource = require('../models/fuelResourcesModel');
const IndustrialZone = require('../models/industrialZoneModel');
const NotificationInstance = require('../models/notificationInstanceModel');
const NotificationSendLog = require('../models/notificationSendLogModel');
const NotificationTemplate = require('../models/notificationTemplateModel');
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteResource = require('../models/wasteResourcesModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const { cloudinary, extractPublicId } = require('../config/cloudinary');
const {
  LEGACY_CLOUDINARY_PREFIX_MIGRATIONS,
  rewriteCloudinaryPublicId,
} = require('../utils/cloudinaryFolders');

const SHOULD_APPLY = process.argv.includes('--apply');
const LEGACY_URL_MATCHERS = [
  /\/symbiosis\/buy-demand\//,
  /\/symbiosis\/sell-supply\//,
  /\/company\/licenses\//,
  /\/environmental-reports\//,
  /\/industrial_zones\//,
  /\/error_logs\//,
  /\/hepza\/bills\//,
  /\/hepza\/waste\//,
  /\/raw\/upload\/(?:v\d+\/)?notifications\//,
  /\/image\/upload\/(?:v\d+\/)?notifications\//,
];

function isLegacyCloudinaryUrl(url) {
  return typeof url === 'string' && LEGACY_URL_MATCHERS.some((matcher) => matcher.test(url));
}

function inferResourceTypeFromUrl(url) {
  if (typeof url !== 'string') return 'image';
  if (url.includes('/raw/upload/')) return 'raw';
  if (url.includes('/video/upload/')) return 'video';
  return 'image';
}

function inferResourceTypes(prefix) {
  if (prefix === 'environmental-reports') return ['raw'];
  if (prefix === 'industrial_zones' || prefix === 'error_logs' || prefix === 'hepza/bills') return ['image'];
  return ['image', 'raw'];
}

async function listCloudinaryAssetsByPrefix(prefix, resourceType) {
  const assets = [];
  let nextCursor;

  do {
    const response = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      resource_type: resourceType,
      max_results: 500,
      next_cursor: nextCursor,
    });

    for (const resource of response.resources || []) {
      assets.push({
        publicId: resource.public_id,
        resourceType,
        secureUrl: resource.secure_url,
      });
    }

    nextCursor = response.next_cursor;
  } while (nextCursor);

  return assets;
}

async function collectLegacyAssets() {
  const assets = [];

  for (const { from } of LEGACY_CLOUDINARY_PREFIX_MIGRATIONS) {
    const resourceTypes = inferResourceTypes(from);
    for (const resourceType of resourceTypes) {
      const foundAssets = await listCloudinaryAssetsByPrefix(from, resourceType);
      assets.push(...foundAssets);
    }
  }

  const uniqueAssets = new Map();
  for (const asset of assets) {
    uniqueAssets.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }

  return Array.from(uniqueAssets.values());
}

function toUrlMapEntries(assets) {
  return assets
    .map((asset) => {
      const nextPublicId = rewriteCloudinaryPublicId(asset.publicId);
      if (!asset.secureUrl || !nextPublicId || nextPublicId === asset.publicId) {
        return null;
      }

      return {
        ...asset,
        nextPublicId,
        nextUrl: cloudinary.url(nextPublicId, {
          secure: true,
          resource_type: asset.resourceType,
          type: 'upload',
        }),
      };
    })
    .filter(Boolean);
}

function buildRewrittenUrlFromLegacy(url) {
  if (!isLegacyCloudinaryUrl(url)) {
    return null;
  }

  const publicId = extractPublicId(url);
  if (!publicId) {
    return null;
  }

  const nextPublicId = rewriteCloudinaryPublicId(publicId);
  if (!nextPublicId || nextPublicId === publicId) {
    return null;
  }

  return cloudinary.url(nextPublicId, {
    secure: true,
    resource_type: inferResourceTypeFromUrl(url),
    type: 'upload',
  });
}

async function renameAssets(entries) {
  const urlMap = new Map();

  for (const entry of entries) {
    const response = await cloudinary.uploader.rename(entry.publicId, entry.nextPublicId, {
      resource_type: entry.resourceType,
      type: 'upload',
      overwrite: false,
      invalidate: true,
    });

    urlMap.set(entry.secureUrl, response.secure_url || entry.nextUrl);
  }

  return urlMap;
}

async function collectLegacyDatabaseUrls() {
  const urls = new Set();
  const addUrl = (url) => {
    if (isLegacyCloudinaryUrl(url)) {
      urls.add(url);
    }
  };

  const [
    buyDemands, sellOffers, wasteResources, fuelResources,
    zones, errorLogs, companies,
    notifTemplates, notifSendLogs, notifInstances,
    reports,
  ] = await Promise.all([
    WasteBuyDemand.find({}, { attachments: 1 }).lean(),
    WasteSellOffer.find({}, { attachments: 1 }).lean(),
    WasteResource.find({}, { attachments: 1 }).lean(),
    FuelResource.find({}, { billImage: 1 }).lean(),
    IndustrialZone.find({}, { image_url: 1 }).lean(),
    ErrorLog.find({}, { screenshot: 1, screenshots: 1 }).lean(),
    Company.find({}, { licenses: 1 }).lean(),
    NotificationTemplate.find({}, { attachments: 1 }).lean(),
    NotificationSendLog.find({}, { attachments: 1 }).lean(),
    NotificationInstance.find({}, { attachments: 1 }).lean(),
    EnvironmentalReport.find({}, { file_url: 1 }).lean(),
  ]);

  for (const doc of buyDemands) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of sellOffers) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of wasteResources) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of fuelResources) addUrl(doc.billImage);
  for (const doc of zones) addUrl(doc.image_url);
  for (const doc of errorLogs) {
    addUrl(doc.screenshot);
    for (const item of doc.screenshots || []) addUrl(item);
  }
  for (const doc of companies) {
    for (const license of doc.licenses || []) addUrl(license?.file_url);
  }
  for (const doc of notifTemplates) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of notifSendLogs) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of notifInstances) {
    for (const item of doc.attachments || []) addUrl(item?.url);
  }
  for (const doc of reports) addUrl(doc.file_url);

  return Array.from(urls);
}

async function buildLegacyDatabaseUrlMap() {
  const legacyUrls = await collectLegacyDatabaseUrls();
  const urlMap = new Map();

  for (const url of legacyUrls) {
    const nextUrl = buildRewrittenUrlFromLegacy(url);
    if (nextUrl && nextUrl !== url) {
      urlMap.set(url, nextUrl);
    }
  }

  return urlMap;
}

function replaceAttachmentUrls(items = [], urlMap) {
  let changed = false;
  const nextItems = items.map((item) => {
    if (!item?.url || !urlMap.has(item.url)) {
      return item;
    }

    changed = true;
    return {
      ...(item.toObject?.() || item),
      url: urlMap.get(item.url),
    };
  });

  return { changed, nextItems };
}

async function updateModelUrls(Model, mutateDoc) {
  const docs = await Model.find({});
  let changedCount = 0;

  for (const doc of docs) {
    const changed = mutateDoc(doc);
    if (changed) {
      await doc.save();
      changedCount += 1;
    }
  }

  return changedCount;
}

async function updateDatabaseReferences(urlMap) {
  const summary = {};

  summary.WasteBuyDemand = await updateModelUrls(WasteBuyDemand, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.WasteSellOffer = await updateModelUrls(WasteSellOffer, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.WasteResource = await updateModelUrls(WasteResource, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.FuelResource = await updateModelUrls(FuelResource, (doc) => {
    if (!doc.billImage || !urlMap.has(doc.billImage)) return false;
    doc.billImage = urlMap.get(doc.billImage);
    return true;
  });

  summary.IndustrialZone = await updateModelUrls(IndustrialZone, (doc) => {
    if (!doc.image_url || !urlMap.has(doc.image_url)) return false;
    doc.image_url = urlMap.get(doc.image_url);
    return true;
  });

  summary.ErrorLog = await updateModelUrls(ErrorLog, (doc) => {
    let changed = false;

    if (doc.screenshot && urlMap.has(doc.screenshot)) {
      doc.screenshot = urlMap.get(doc.screenshot);
      changed = true;
    }

    if (Array.isArray(doc.screenshots) && doc.screenshots.length > 0) {
      const nextScreenshots = doc.screenshots.map((item) => urlMap.get(item) || item);
      if (nextScreenshots.some((item, index) => item !== doc.screenshots[index])) {
        doc.screenshots = nextScreenshots;
        changed = true;
      }
    }

    return changed;
  });

  summary.Company = await updateModelUrls(Company, (doc) => {
    let changed = false;
    doc.licenses = (doc.licenses || []).map((license) => {
      if (!license?.file_url || !urlMap.has(license.file_url)) {
        return license;
      }

      changed = true;
      return {
        ...license.toObject(),
        file_url: urlMap.get(license.file_url),
      };
    });
    return changed;
  });

  summary.NotificationTemplate = await updateModelUrls(NotificationTemplate, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.NotificationSendLog = await updateModelUrls(NotificationSendLog, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.NotificationInstance = await updateModelUrls(NotificationInstance, (doc) => {
    const { changed, nextItems } = replaceAttachmentUrls(doc.attachments || [], urlMap);
    if (changed) doc.attachments = nextItems;
    return changed;
  });

  summary.EnvironmentalReport = await updateModelUrls(EnvironmentalReport, (doc) => {
    if (!doc.file_url || !urlMap.has(doc.file_url)) return false;
    doc.file_url = urlMap.get(doc.file_url);
    return true;
  });

  return summary;
}

async function main() {
  await mongoose.connect(process.env.ATLAS_URI);

  const legacyAssets = await collectLegacyAssets();
  const renamePlan = toUrlMapEntries(legacyAssets);

  console.log(`Legacy assets found: ${legacyAssets.length}`);
  console.log(`Assets needing move: ${renamePlan.length}`);

  if (!SHOULD_APPLY) {
    for (const item of renamePlan.slice(0, 30)) {
      console.log(`${item.resourceType}: ${item.publicId} -> ${item.nextPublicId}`);
    }
    if (renamePlan.length > 30) {
      console.log(`... and ${renamePlan.length - 30} more assets.`);
    }
    console.log('Dry run complete. Re-run with --apply to move assets and update database URLs.');
    return;
  }

  const urlMap = await renameAssets(renamePlan);
  const dbRewriteMap = await buildLegacyDatabaseUrlMap();
  for (const [oldUrl, newUrl] of dbRewriteMap.entries()) {
    if (!urlMap.has(oldUrl)) {
      urlMap.set(oldUrl, newUrl);
    }
  }
  const summary = await updateDatabaseReferences(urlMap);

  console.log(`Moved assets: ${urlMap.size}`);
  console.log('Database updates by model:');
  Object.entries(summary).forEach(([modelName, count]) => {
    console.log(`- ${modelName}: ${count}`);
  });
}

main()
  .catch((error) => {
    console.error('Cloudinary folder migration failed:', error.message);
    if (error?.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
