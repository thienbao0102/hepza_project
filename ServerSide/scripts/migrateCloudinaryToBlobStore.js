const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/companyModel');
const CloudinaryAsset = require('../models/cloudinaryAssetModel');
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
const { cloudinary } = require('../config/cloudinary');
const {
  CLOUDINARY_BLOB_ROOT,
  getManagedCloudinaryPrefixes,
  normalizeCloudinarySegment,
} = require('../utils/cloudinaryFolders');

const SHOULD_APPLY = process.argv.includes('--apply');

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
        bytes: resource.bytes || 0,
      });
    }

    nextCursor = response.next_cursor;
  } while (nextCursor);

  return assets;
}

function getBlobTargetPublicId(asset) {
  const basename = String(asset.publicId || '').split('/').pop();
  return `${CLOUDINARY_BLOB_ROOT}/${asset.resourceType}/${basename}`;
}

function getAssetHashFromPublicId(publicId, resourceType) {
  const basename = String(publicId || '').split('/').pop();
  return resourceType === 'raw' ? basename.replace(/\.[^.]+$/, '') : basename;
}

function buildBlobDeliveryUrl(publicId, resourceType) {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    type: 'upload',
  });
}

function buildLogicalScopeFromPublicId(publicId) {
  const normalizedPublicId = String(publicId || '').replace(/^\/+/, '');
  if (!normalizedPublicId) return 'migrated';

  const segments = normalizedPublicId.split('/');
  segments.pop();

  return segments.map((segment) => normalizeCloudinarySegment(segment)).filter(Boolean).join('/') || 'migrated';
}

async function collectAssetsByManagedPrefixes() {
  const prefixes = getManagedCloudinaryPrefixes().filter(({ prefix }) => prefix !== CLOUDINARY_BLOB_ROOT);
  const assets = [];

  for (const { prefix, resourceTypes } of prefixes) {
    for (const resourceType of resourceTypes) {
      const foundAssets = await listCloudinaryAssetsByPrefix(prefix, resourceType);
      assets.push(...foundAssets.map((asset) => ({ ...asset, prefix })));
    }
  }

  const uniqueAssets = new Map();
  for (const asset of assets) {
    uniqueAssets.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }

  return Array.from(uniqueAssets.values());
}

async function collectExistingBlobAssets() {
  const assets = [];
  for (const resourceType of ['image', 'raw', 'video']) {
    const foundAssets = await listCloudinaryAssetsByPrefix(CLOUDINARY_BLOB_ROOT, resourceType);
    assets.push(...foundAssets);
  }

  const byTargetKey = new Map();
  for (const asset of assets) {
    byTargetKey.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }

  return byTargetKey;
}

function buildMigrationPlan(sourceAssets, existingBlobAssets) {
  const groupedByTarget = new Map();

  for (const asset of sourceAssets) {
    const targetPublicId = getBlobTargetPublicId(asset);
    const targetKey = `${asset.resourceType}:${targetPublicId}`;
    if (!groupedByTarget.has(targetKey)) {
      groupedByTarget.set(targetKey, {
        targetKey,
        targetPublicId,
        resourceType: asset.resourceType,
        assets: [],
      });
    }
    groupedByTarget.get(targetKey).assets.push(asset);
  }

  const plans = [];
  for (const group of groupedByTarget.values()) {
    const existingBlob = existingBlobAssets.get(group.targetKey) || null;
    const canonicalAsset = existingBlob || group.assets[0];
    const duplicateAssets = existingBlob ? group.assets : group.assets.slice(1);

    plans.push({
      resourceType: group.resourceType,
      targetPublicId: group.targetPublicId,
      targetUrl: existingBlob
        ? existingBlob.secureUrl
        : buildBlobDeliveryUrl(group.targetPublicId, group.resourceType),
      renameSource: existingBlob ? null : group.assets[0],
      duplicateAssets,
      assets: group.assets,
      canonicalAsset,
    });
  }

  return plans;
}

async function upsertRegistryEntry({ publicId, resourceType, secureUrl, logicalScope, bytes }) {
  await CloudinaryAsset.findOneAndUpdate(
    {
      asset_hash: getAssetHashFromPublicId(publicId, resourceType),
      resource_type: resourceType,
    },
    {
      $set: {
        public_id: publicId,
        secure_url: secureUrl,
        bytes: Number(bytes || 0),
        last_seen_at: new Date(),
      },
      $addToSet: {
        logical_scopes: logicalScope,
      },
      $setOnInsert: {
        extension: resourceType === 'raw'
          ? path.extname(String(publicId).split('/').pop())
          : '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function executeMigrationPlan(plans) {
  const urlMap = new Map();
  const duplicateAssetsToDelete = [];

  for (const plan of plans) {
    let targetUrl = plan.targetUrl;

    if (plan.renameSource) {
      try {
        const response = await cloudinary.uploader.rename(
          plan.renameSource.publicId,
          plan.targetPublicId,
          {
            resource_type: plan.resourceType,
            type: 'upload',
            overwrite: false,
            invalidate: true,
          }
        );
        targetUrl = response.secure_url || targetUrl;
      } catch (error) {
        if (!String(error.message || '').toLowerCase().includes('already exists')) {
          throw error;
        }
      }
    }

    for (const asset of plan.assets) {
      urlMap.set(asset.secureUrl, targetUrl);
    }

    for (const duplicateAsset of plan.duplicateAssets) {
      duplicateAssetsToDelete.push(duplicateAsset);
    }

    await upsertRegistryEntry({
      publicId: plan.targetPublicId,
      resourceType: plan.resourceType,
      secureUrl: targetUrl,
      logicalScope: buildLogicalScopeFromPublicId(plan.renameSource?.publicId || plan.canonicalAsset.publicId),
      bytes: plan.canonicalAsset.bytes || 0,
    });
  }

  return { urlMap, duplicateAssetsToDelete };
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

async function deleteDuplicateAssets(assets) {
  for (const asset of assets) {
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      type: 'upload',
    }).catch(() => null);
  }
}

async function main() {
  await mongoose.connect(process.env.ATLAS_URI);

  const sourceAssets = await collectAssetsByManagedPrefixes();
  const existingBlobAssets = await collectExistingBlobAssets();
  const plans = buildMigrationPlan(sourceAssets, existingBlobAssets);

  console.log(`Managed source assets: ${sourceAssets.length}`);
  console.log(`Blob targets to sync: ${plans.length}`);

  if (!SHOULD_APPLY) {
    for (const plan of plans.slice(0, 30)) {
      const sourceLabel = plan.renameSource ? plan.renameSource.publicId : '(reuse existing blob)';
      console.log(`${plan.resourceType}: ${sourceLabel} -> ${plan.targetPublicId} | duplicates=${plan.duplicateAssets.length}`);
    }
    if (plans.length > 30) {
      console.log(`... and ${plans.length - 30} more targets.`);
    }
    console.log('Dry run complete. Re-run with --apply to migrate existing assets into the blob store.');
    return;
  }

  const { urlMap, duplicateAssetsToDelete } = await executeMigrationPlan(plans);
  const summary = await updateDatabaseReferences(urlMap);
  await deleteDuplicateAssets(duplicateAssetsToDelete);

  console.log(`Updated URL mappings: ${urlMap.size}`);
  console.log(`Deleted duplicate source assets: ${duplicateAssetsToDelete.length}`);
  console.log('Database updates by model:');
  Object.entries(summary).forEach(([modelName, count]) => {
    console.log(`- ${modelName}: ${count}`);
  });
}

main()
  .catch((error) => {
    console.error('Cloudinary blob migration failed:', error.message);
    if (error?.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
