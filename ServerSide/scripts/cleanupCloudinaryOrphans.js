const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/companyModel');
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
  MANAGED_CLOUDINARY_PREFIXES,
  toCloudinaryAssetInfo,
} = require('../utils/cloudinaryAssetUtils');

const SHOULD_APPLY = process.argv.includes('--apply');
let currentStage = 'init';

function addReferencedAsset(map, url, source) {
  const asset = toCloudinaryAssetInfo(url);
  if (!asset) return;

  const existing = map.get(asset.key);
  if (existing) {
    existing.sources.add(source);
    return;
  }

  map.set(asset.key, {
    ...asset,
    sources: new Set([source]),
  });
}

async function collectReferencedAssets() {
  const referencedAssets = new Map();

  const [
    buyDemands, sellOffers, wasteResources, fuelResources,
    zones, errorLogs, companies,
    notifTemplates, notifSendLogs, notifInstances,
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
  ]);

  for (const doc of buyDemands) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'waste_buy_demand.attachments');
    }
  }

  for (const doc of sellOffers) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'waste_sell_offer.attachments');
    }
  }

  for (const doc of wasteResources) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'waste_resource.attachments');
    }
  }

  for (const doc of fuelResources) {
    addReferencedAsset(referencedAssets, doc.billImage, 'fuel_resource.billImage');
  }

  for (const doc of zones) {
    addReferencedAsset(referencedAssets, doc.image_url, 'industrial_zone.image_url');
  }

  for (const doc of errorLogs) {
    addReferencedAsset(referencedAssets, doc.screenshot, 'error_log.screenshot');
    for (const screenshotUrl of doc.screenshots || []) {
      addReferencedAsset(referencedAssets, screenshotUrl, 'error_log.screenshots');
    }
  }

  for (const doc of companies) {
    for (const license of doc.licenses || []) {
      addReferencedAsset(referencedAssets, license?.file_url, 'company.licenses.file_url');
    }
  }

  for (const doc of notifTemplates) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'notification_template.attachments');
    }
  }

  for (const doc of notifSendLogs) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'notification_send_log.attachments');
    }
  }

  for (const doc of notifInstances) {
    for (const attachment of doc.attachments || []) {
      addReferencedAsset(referencedAssets, attachment?.url, 'notification_instance.attachments');
    }
  }

  return referencedAssets;
}

async function listCloudinaryAssetsByPrefix(prefix, resourceType) {
  const assets = [];
  let nextCursor = undefined;

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
        etag: resource.etag || null,
        key: `${resourceType}:${resource.public_id}`,
      });
    }

    nextCursor = response.next_cursor;
  } while (nextCursor);

  return assets;
}

async function collectManagedCloudinaryAssets() {
  const allAssets = [];

  for (const { prefix, resourceTypes } of MANAGED_CLOUDINARY_PREFIXES) {
    for (const resourceType of resourceTypes) {
      const assets = await listCloudinaryAssetsByPrefix(prefix, resourceType);
      allAssets.push(...assets.map((asset) => ({ ...asset, prefix })));
    }
  }

  return allAssets;
}

/**
 * Tìm các asset trùng lặp (cùng etag + bytes + resourceType) và trả về
 * danh sách các asset cần xóa (giữ lại asset đầu tiên trong mỗi nhóm).
 * Chỉ xóa asset trùng lặp nếu nó KHÔNG được tham chiếu trong DB.
 */
function findDuplicateAssets(cloudinaryAssets, referencedAssets) {
  // Nhóm theo etag + bytes + resourceType
  const groups = new Map();

  for (const asset of cloudinaryAssets) {
    if (!asset.etag) continue; // skip nếu không có etag
    const groupKey = `${asset.etag}:${asset.bytes}:${asset.resourceType}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(asset);
  }

  const duplicatesToDelete = [];

  for (const [, group] of groups) {
    if (group.length <= 1) continue; // không trùng

    // Ưu tiên giữ asset đang được tham chiếu trong DB
    const referenced = group.filter((a) => referencedAssets.has(a.key));
    const unreferenced = group.filter((a) => !referencedAssets.has(a.key));

    if (referenced.length > 0) {
      // Giữ tất cả asset được tham chiếu, xóa các bản unreferenced
      duplicatesToDelete.push(...unreferenced);
    } else {
      // Không có bản nào được tham chiếu → giữ bản đầu, xóa phần còn lại
      duplicatesToDelete.push(...group.slice(1));
    }
  }

  return duplicatesToDelete;
}

async function deleteAssets(assets, label) {
  const results = [];

  for (const asset of assets) {
    try {
      const response = await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
        type: 'upload',
      });
      results.push({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        prefix: asset.prefix,
        bytes: asset.bytes,
        category: label,
        status: response?.result || 'unknown',
      });
    } catch (error) {
      results.push({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        prefix: asset.prefix,
        bytes: asset.bytes,
        category: label,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return results;
}

function summarizeByPrefix(assets) {
  return assets.reduce((acc, asset) => {
    const key = `${asset.prefix} [${asset.resourceType}]`;
    if (!acc[key]) {
      acc[key] = { count: 0, bytes: 0 };
    }
    acc[key].count += 1;
    acc[key].bytes += asset.bytes || 0;
    return acc;
  }, {});
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

async function main() {
  currentStage = 'connect_db';
  await mongoose.connect(process.env.ATLAS_URI);
  console.log('✅ Kết nối DB thành công.\n');

  currentStage = 'collect_referenced_assets';
  console.log('📦 Thu thập asset đang được tham chiếu trong DB...');
  const referencedAssets = await collectReferencedAssets();
  console.log(`   → Tìm thấy ${referencedAssets.size} asset được tham chiếu.\n`);

  currentStage = 'collect_managed_cloudinary_assets';
  console.log('☁️  Thu thập asset trên Cloudinary...');
  const cloudinaryAssets = await collectManagedCloudinaryAssets();
  console.log(`   → Tìm thấy ${cloudinaryAssets.length} asset trên Cloudinary.\n`);

  // --- Debug: In ra các key không khớp ---
  currentStage = 'debug_key_comparison';
  const cloudinaryKeys = new Set(cloudinaryAssets.map((a) => a.key));
  const referencedKeys = new Set(referencedAssets.keys());
  const dbOnlyKeys = [...referencedKeys].filter((k) => !cloudinaryKeys.has(k));
  if (dbOnlyKeys.length > 0) {
    console.log(`⚠️  ${dbOnlyKeys.length} asset trong DB không tìm thấy trên Cloudinary (có thể đã bị xóa):`);
    for (const k of dbOnlyKeys.slice(0, 5)) {
      console.log(`   - ${k}`);
    }
    if (dbOnlyKeys.length > 5) console.log(`   ... và ${dbOnlyKeys.length - 5} asset khác.`);
    console.log();
  }

  // --- Tìm orphan ---
  currentStage = 'diff_orphan_assets';
  const orphanAssets = cloudinaryAssets.filter((asset) => !referencedAssets.has(asset.key));
  const orphanBytes = orphanAssets.reduce((sum, a) => sum + (a.bytes || 0), 0);

  // --- Tìm duplicate ---
  currentStage = 'find_duplicates';
  const duplicateAssets = findDuplicateAssets(cloudinaryAssets, referencedAssets);
  // Loại bỏ duplicate đã nằm trong orphan (tránh xóa 2 lần)
  const orphanKeySet = new Set(orphanAssets.map((a) => a.key));
  const uniqueDuplicates = duplicateAssets.filter((a) => !orphanKeySet.has(a.key));
  const duplicateBytes = uniqueDuplicates.reduce((sum, a) => sum + (a.bytes || 0), 0);

  currentStage = 'build_report';
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Chế độ:               ${SHOULD_APPLY ? '🔴 APPLY (xóa thật)' : '🟡 DRY-RUN (chỉ liệt kê)'}`);
  console.log(`  Asset tham chiếu (DB): ${referencedAssets.size}`);
  console.log(`  Asset trên Cloudinary: ${cloudinaryAssets.length}`);
  console.log(`  Asset mồ côi:         ${orphanAssets.length} (${formatBytes(orphanBytes)})`);
  console.log(`  Asset trùng lặp:      ${uniqueDuplicates.length} (${formatBytes(duplicateBytes)})`);
  console.log(`  Tổng sẽ xóa:          ${orphanAssets.length + uniqueDuplicates.length} (${formatBytes(orphanBytes + duplicateBytes)})`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (orphanAssets.length > 0) {
    console.log('--- ORPHAN (mồ côi) ---');
    const orphanSummary = summarizeByPrefix(orphanAssets);
    for (const [key, val] of Object.entries(orphanSummary)) {
      console.log(`  ${key}: ${val.count} files (${formatBytes(val.bytes)})`);
    }
    console.log();
  }

  if (uniqueDuplicates.length > 0) {
    console.log('--- DUPLICATE (trùng lặp) ---');
    const dupSummary = summarizeByPrefix(uniqueDuplicates);
    for (const [key, val] of Object.entries(dupSummary)) {
      console.log(`  ${key}: ${val.count} files (${formatBytes(val.bytes)})`);
    }
    console.log();
  }

  if (!SHOULD_APPLY) {
    currentStage = 'print_dry_run_detail';

    if (orphanAssets.length > 0) {
      console.log('📋 Danh sách orphan (top 20):');
      for (const asset of orphanAssets.slice(0, 20)) {
        console.log(`  ❌ [${asset.resourceType}] ${asset.publicId} (${formatBytes(asset.bytes)})`);
      }
      if (orphanAssets.length > 20) {
        console.log(`  ... và ${orphanAssets.length - 20} asset khác.`);
      }
      console.log();
    }

    if (uniqueDuplicates.length > 0) {
      console.log('📋 Danh sách duplicate sẽ xóa (top 20):');
      for (const asset of uniqueDuplicates.slice(0, 20)) {
        console.log(`  🔁 [${asset.resourceType}] ${asset.publicId} (${formatBytes(asset.bytes)}, etag=${asset.etag})`);
      }
      if (uniqueDuplicates.length > 20) {
        console.log(`  ... và ${uniqueDuplicates.length - 20} asset khác.`);
      }
      console.log();
    }

    console.log('💡 Dry-run hoàn tất. Chạy lại với --apply để xóa thật.');
    return;
  }

  // --- APPLY MODE ---
  const allDeletionResults = [];

  if (orphanAssets.length > 0) {
    currentStage = 'delete_orphan_assets';
    console.log(`🗑️  Đang xóa ${orphanAssets.length} orphan asset...`);
    const orphanResults = await deleteAssets(orphanAssets, 'orphan');
    allDeletionResults.push(...orphanResults);
    const orphanOk = orphanResults.filter((r) => r.status === 'ok').length;
    const orphanFail = orphanResults.filter((r) => r.status === 'failed').length;
    console.log(`   → Xóa thành công: ${orphanOk}, Thất bại: ${orphanFail}\n`);
  }

  if (uniqueDuplicates.length > 0) {
    currentStage = 'delete_duplicate_assets';
    console.log(`🗑️  Đang xóa ${uniqueDuplicates.length} duplicate asset...`);
    const dupResults = await deleteAssets(uniqueDuplicates, 'duplicate');
    allDeletionResults.push(...dupResults);
    const dupOk = dupResults.filter((r) => r.status === 'ok').length;
    const dupFail = dupResults.filter((r) => r.status === 'failed').length;
    console.log(`   → Xóa thành công: ${dupOk}, Thất bại: ${dupFail}\n`);
  }

  currentStage = 'print_apply_report';
  const totalOk = allDeletionResults.filter((r) => r.status === 'ok').length;
  const totalFail = allDeletionResults.filter((r) => r.status === 'failed').length;
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Hoàn tất! Đã xóa: ${totalOk}, Thất bại: ${totalFail}`);
  console.log('═══════════════════════════════════════════════════════');

  if (totalFail > 0) {
    console.log('\n⚠️  Các asset xóa thất bại:');
    for (const r of allDeletionResults.filter((r) => r.status === 'failed')) {
      console.log(`  - [${r.resourceType}] ${r.publicId}: ${r.error}`);
    }
  }
}

main()
  .catch((error) => {
    const safeMessage = error?.message || error?.error?.message || JSON.stringify(error) || String(error);
    console.error(`Không thể cleanup Cloudinary orphan assets [stage=${currentStage}]:`, safeMessage);
    if (error?.stack) {
      console.error(error.stack);
    } else {
      console.dir(error, { depth: 8 });
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
