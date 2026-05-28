const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

const IndustrialZone = require('../models/industrialZoneModel');
const Company = require('../models/companyModel');
const User = require('../models/userModel');
const Emission = require('../models/emissionModel');
const FuelResource = require('../models/fuelResourcesModel');
const InputResource = require('../models/inputResourcesModel');
const Product = require('../models/productModel');
const ResourceVersion = require('../models/resourceVersionModel');
const SummaryRecord = require('../models/summaryRecordsModel');
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteResource = require('../models/wasteResourcesModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const ExportHistory = require('../models/exportHistoryModel');
const NotificationSendLog = require('../models/notificationSendLogModel');
const NotificationTemplate = require('../models/notificationTemplateModel');
const { normalizeZoneNameForCompare } = require('../utils/zoneNameNormalizer');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TARGET_ZONE_NAME = 'KCN VSIP 1';
const SOURCE_ZONE_ALIASES = [
  'KCN VSIP',
  'KCN Việt Nam - Singapore',
  'KCN Vsip',
];
const SCRIPT_ACTOR = 'script:merge-vsip-zones';
const SHOULD_APPLY = process.argv.includes('--apply');

const ZONE_MODELS = [
  { label: 'Phát thải', model: Emission },
  { label: 'Tài nguyên nhiên liệu', model: FuelResource },
  { label: 'Tài nguyên đầu vào', model: InputResource },
  { label: 'Sản phẩm', model: Product },
  { label: 'Phiên bản tài nguyên', model: ResourceVersion },
  { label: 'Bản ghi tổng hợp', model: SummaryRecord },
  { label: 'Nhu cầu mua chất thải', model: WasteBuyDemand },
  { label: 'Tài nguyên chất thải', model: WasteResource },
  { label: 'Chào bán chất thải', model: WasteSellOffer },
  { label: 'Lịch sử xuất báo cáo', model: ExportHistory },
];

const buildArrayFieldPipeline = (fieldPath, sourceZoneIds, targetZoneId) => ([
  {
    $set: {
      [fieldPath]: {
        $let: {
          vars: {
            currentValues: {
              $cond: [
                { $isArray: `$${fieldPath}` },
                `$${fieldPath}`,
                [],
              ],
            },
          },
          in: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $setIntersection: ['$$currentValues', sourceZoneIds],
                    },
                  },
                  0,
                ],
              },
              {
                $setUnion: [
                  [targetZoneId],
                  {
                    $filter: {
                      input: '$$currentValues',
                      as: 'zoneId',
                      cond: { $not: { $in: ['$$zoneId', sourceZoneIds] } },
                    },
                  },
                ],
              },
              '$$currentValues',
            ],
          },
        },
      },
    },
  },
]);

const getCount = async (model, filter) => model.countDocuments(filter);

async function main() {
  await mongoose.connect(process.env.ATLAS_URI);

  const activeZones = await IndustrialZone.find({ deleted_at: null }).lean();
  const targetZone = activeZones.find((zone) => zone.zone_name === TARGET_ZONE_NAME)
    || activeZones.find((zone) => normalizeZoneNameForCompare(zone.zone_name) === normalizeZoneNameForCompare(TARGET_ZONE_NAME));

  if (!targetZone) {
    throw new Error(`Không tìm thấy KCN đích "${TARGET_ZONE_NAME}" trong hệ thống.`);
  }

  const aliasNormalizations = new Set(
    SOURCE_ZONE_ALIASES.map((name) => normalizeZoneNameForCompare(name)),
  );

  const sourceZones = activeZones.filter((zone) => (
    zone.zone_id !== targetZone.zone_id
    && aliasNormalizations.has(normalizeZoneNameForCompare(zone.zone_name))
  ));

  if (sourceZones.length === 0) {
    console.log('Không có KCN/KCX alias nào cần gộp vào KCN VSIP 1.');
    return;
  }

  const sourceZoneIds = sourceZones.map((zone) => zone.zone_id);
  const affectedManagers = await User.find({
    role: 'manager',
    zone_id: { $in: [targetZone.zone_id, ...sourceZoneIds] },
    deleted_at: null,
  })
    .select({ user_id: 1, full_name: 1, email: 1, zone_id: 1, _id: 0 })
    .lean();

  if (SHOULD_APPLY && affectedManagers.length > 1) {
    throw new Error(
      `Có ${affectedManagers.length} tài khoản manager đang gắn với KCN đích/nguồn. ` +
      'Hãy rà soát và hợp nhất manager trước khi chạy --apply để tránh vi phạm unique index role=manager + zone_id.',
    );
  }

  const summary = {
    targetZone: {
      zone_id: targetZone.zone_id,
      zone_name: targetZone.zone_name,
    },
    sourceZones: sourceZones.map((zone) => ({
      zone_id: zone.zone_id,
      zone_name: zone.zone_name,
    })),
    affectedCompanies: await getCount(Company, { zone_id: { $in: sourceZoneIds } }),
    affectedCompanyUsers: await getCount(User, { role: 'company', zone_id: { $in: sourceZoneIds } }),
    affectedManagers,
    datasets: {},
  };

  for (const { label, model } of ZONE_MODELS) {
    summary.datasets[label] = await getCount(model, { zone_id: { $in: sourceZoneIds } });
  }

  summary.notificationLogs = {
    zone_ids: await getCount(NotificationSendLog, { zone_ids: { $in: sourceZoneIds } }),
    target_zone_ids: await getCount(NotificationSendLog, { 'target.zone_ids': { $in: sourceZoneIds } }),
  };
  summary.notificationTemplates = {
    target_zone_ids: await getCount(NotificationTemplate, { 'target.zone_ids': { $in: sourceZoneIds } }),
  };

  console.log('=== KẾ HOẠCH GỘP KCN VSIP ===');
  console.log(JSON.stringify(summary, null, 2));

  if (!SHOULD_APPLY) {
    console.log('Dry-run hoàn tất. Chạy lại với --apply để thực hiện cập nhật dữ liệu.');
    return;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Company.updateMany(
        { zone_id: { $in: sourceZoneIds } },
        { $set: { zone_id: targetZone.zone_id } },
        { session },
      );

      await User.updateMany(
        { role: 'company', zone_id: { $in: sourceZoneIds } },
        { $set: { zone_id: targetZone.zone_id } },
        { session },
      );

      if (affectedManagers.length === 1) {
        await User.updateMany(
          { user_id: affectedManagers[0].user_id },
          { $set: { zone_id: targetZone.zone_id } },
          { session },
        );
      }

      for (const { model } of ZONE_MODELS) {
        await model.updateMany(
          { zone_id: { $in: sourceZoneIds } },
          { $set: { zone_id: targetZone.zone_id } },
          { session },
        );
      }

      await NotificationSendLog.updateMany(
        {
          $or: [
            { zone_ids: { $in: sourceZoneIds } },
            { 'target.zone_ids': { $in: sourceZoneIds } },
          ],
        },
        buildArrayFieldPipeline('zone_ids', sourceZoneIds, targetZone.zone_id),
        { session },
      );

      await NotificationSendLog.updateMany(
        { 'target.zone_ids': { $in: sourceZoneIds } },
        buildArrayFieldPipeline('target.zone_ids', sourceZoneIds, targetZone.zone_id),
        { session },
      );

      await NotificationTemplate.updateMany(
        { 'target.zone_ids': { $in: sourceZoneIds } },
        buildArrayFieldPipeline('target.zone_ids', sourceZoneIds, targetZone.zone_id),
        { session },
      );

      await IndustrialZone.updateMany(
        { zone_id: { $in: sourceZoneIds }, deleted_at: null },
        {
          $set: {
            deleted_at: new Date(),
            deleted_by: SCRIPT_ACTOR,
            updated_at: new Date(),
            updated_by: SCRIPT_ACTOR,
            status: 'off',
          },
        },
        { session },
      );
    });

    console.log('Đã gộp dữ liệu KCN/KCX alias về KCN VSIP 1 thành công.');
  } finally {
    await session.endSession();
  }
}

main()
  .catch((error) => {
    console.error('Không thể gộp KCN VSIP:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
