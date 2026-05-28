const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/companyModel');
const Counter = require('../models/counterModel');
const Emission = require('../models/emissionModel');
const EnvironmentalReport = require('../models/environmentalReportModel');
const ExportHistory = require('../models/exportHistoryModel');
const FuelResource = require('../models/fuelResourcesModel');
const IndustrialZone = require('../models/industrialZoneModel');
const InputResource = require('../models/inputResourcesModel');
const NotificationSendLog = require('../models/notificationSendLogModel');
const NotificationTemplate = require('../models/notificationTemplateModel');
const Product = require('../models/productModel');
const ResourceRecord = require('../models/resourceModel');
const ResourceVersion = require('../models/resourceVersionModel');
const SummaryRecord = require('../models/summaryRecordsModel');
const User = require('../models/userModel');
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const WasteResource = require('../models/wasteResourcesModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const { normalizeZoneNameForCompare } = require('../utils/zoneNameNormalizer');

const TARGET_ZONE_NAME = 'KCN VSIP 1';
const SOURCE_ZONE_ALIASES = [
  'KCN VSIP',
  'KCN Việt Nam - Singapore',
  'KCN Vsip',
];
const SHOULD_APPLY = process.argv.includes('--apply');

const SCALAR_COLLECTIONS = [
  { label: 'users.company_id', collection: User.collection },
  { label: 'emissions.company_id', collection: Emission.collection },
  { label: 'environmentalreports.company_id', collection: EnvironmentalReport.collection },
  { label: 'fuelresources.company_id', collection: FuelResource.collection },
  { label: 'inputresources.company_id', collection: InputResource.collection },
  { label: 'products.company_id', collection: Product.collection },
  { label: 'resourcerecords.company_id', collection: ResourceRecord.collection },
  { label: 'resourceversions.company_id', collection: ResourceVersion.collection },
  { label: 'summaryrecords.company_id', collection: SummaryRecord.collection },
  { label: 'wastebuydemands.company_id', collection: WasteBuyDemand.collection },
  { label: 'wasteresources.company_id', collection: WasteResource.collection },
  { label: 'wasteselloffers.company_id', collection: WasteSellOffer.collection },
];

const ARRAY_COLLECTIONS = [
  { label: 'users.managed_company_ids', collection: User.collection, fieldPath: 'managed_company_ids' },
  { label: 'exporthistories.company_ids', collection: ExportHistory.collection, fieldPath: 'company_ids' },
  { label: 'notificationsendlogs.company_ids', collection: NotificationSendLog.collection, fieldPath: 'company_ids' },
  { label: 'notificationsendlogs.target.company_ids', collection: NotificationSendLog.collection, fieldPath: 'target.company_ids' },
  { label: 'notificationtemplates.target.company_ids', collection: NotificationTemplate.collection, fieldPath: 'target.company_ids' },
];

const companyIdRegex = /^([A-Z0-9]+)DN(\d+)$/;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCompanySequence(companyId) {
  const match = companyIdRegex.exec(companyId || '');
  if (!match) return null;
  return {
    zoneId: match[1],
    sequence: Number(match[2]),
    digits: match[2].length,
  };
}

function buildArrayReplacementPipeline(fieldPath, oldValue, newValue) {
  return [
    {
      $set: {
        [fieldPath]: {
          $cond: [
            { $isArray: `$${fieldPath}` },
            {
              $map: {
                input: `$${fieldPath}`,
                as: 'currentValue',
                in: {
                  $cond: [
                    { $eq: ['$$currentValue', oldValue] },
                    newValue,
                    '$$currentValue',
                  ],
                },
              },
            },
            `$${fieldPath}`,
          ],
        },
      },
    },
  ];
}

async function countArrayReferences(collection, fieldPath, companyId) {
  return collection.countDocuments({ [fieldPath]: companyId });
}

async function main() {
  await mongoose.connect(process.env.ATLAS_URI);

  const allZones = await IndustrialZone.find({}).lean();
  const targetZone = allZones.find((zone) => normalizeZoneNameForCompare(zone.zone_name) === normalizeZoneNameForCompare(TARGET_ZONE_NAME));

  if (!targetZone) {
    throw new Error(`Target zone "${TARGET_ZONE_NAME}" not found.`);
  }

  const aliasNormalizations = new Set(
    SOURCE_ZONE_ALIASES.map((name) => normalizeZoneNameForCompare(name)),
  );

  const sourceZones = allZones.filter((zone) => (
    zone.zone_id !== targetZone.zone_id
    && aliasNormalizations.has(normalizeZoneNameForCompare(zone.zone_name))
  ));

  if (sourceZones.length === 0) {
    throw new Error('No VSIP alias zones found to derive old company_id prefixes.');
  }

  const sourceZoneIds = sourceZones.map((zone) => zone.zone_id);
  const sourcePrefixRegex = new RegExp(`^(${sourceZoneIds.map(escapeRegex).join('|')})DN\\d+$`);

  const targetCompanies = await Company.find({
    zone_id: targetZone.zone_id,
    company_id: { $regex: sourcePrefixRegex },
  })
    .sort({ company_id: 1 })
    .lean();

  if (targetCompanies.length === 0) {
    console.log('No companies under the target zone need company_id rekey.');
    return;
  }

  const existingTargetCompanies = await Company.find({
    zone_id: targetZone.zone_id,
    company_id: { $regex: new RegExp(`^${escapeRegex(targetZone.zone_id)}DN\\d+$`) },
  })
    .select({ company_id: 1, _id: 0 })
    .lean();

  const existingTargetSequences = existingTargetCompanies
    .map((company) => extractCompanySequence(company.company_id))
    .filter(Boolean);

  const maxExistingSequence = existingTargetSequences.reduce(
    (max, item) => Math.max(max, item.sequence),
    0,
  );
  const targetDigits = Math.max(
    5,
    existingTargetSequences.reduce((max, item) => Math.max(max, item.digits), 0),
  );

  let nextSequence = maxExistingSequence + 1;
  const mappings = targetCompanies.map((company) => {
    const nextCompanyId = `${targetZone.zone_id}DN${String(nextSequence).padStart(targetDigits, '0')}`;
    nextSequence += 1;
    return {
      companyName: company.company_name,
      oldCompanyId: company.company_id,
      newCompanyId: nextCompanyId,
    };
  });

  const referenceSummary = {};
  for (const mapping of mappings) {
    referenceSummary[mapping.oldCompanyId] = {
      companyName: mapping.companyName,
      scalarRefs: {},
      arrayRefs: {},
    };

    for (const config of SCALAR_COLLECTIONS) {
      referenceSummary[mapping.oldCompanyId].scalarRefs[config.label] = await config.collection.countDocuments({
        company_id: mapping.oldCompanyId,
      });
    }

    for (const config of ARRAY_COLLECTIONS) {
      referenceSummary[mapping.oldCompanyId].arrayRefs[config.label] = await countArrayReferences(
        config.collection,
        config.fieldPath,
        mapping.oldCompanyId,
      );
    }
  }

  const targetCounterId = `company_${targetZone.zone_id}`;
  const targetCounter = await Counter.findById(targetCounterId).lean();

  const report = {
    targetZone: {
      zone_id: targetZone.zone_id,
      zone_name: targetZone.zone_name,
    },
    sourceZones: sourceZones.map((zone) => ({
      zone_id: zone.zone_id,
      zone_name: zone.zone_name,
      deleted_at: zone.deleted_at || null,
    })),
    targetCounter: {
      counter_id: targetCounterId,
      sequence_value: targetCounter?.sequence_value ?? 0,
      digits: targetCounter?.digits ?? targetDigits,
    },
    companiesToRekey: mappings,
    referencesByOldCompanyId: referenceSummary,
  };

  console.log('=== REKEY VSIP COMPANY IDS PLAN ===');
  console.log(JSON.stringify(report, null, 2));

  if (!SHOULD_APPLY) {
    console.log('Dry-run complete. Re-run with --apply to update company_id references.');
    console.log('After apply, affected company users should log in again to refresh auth payloads.');
    return;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const mapping of mappings) {
        await Company.collection.updateOne(
          { company_id: mapping.oldCompanyId },
          { $set: { company_id: mapping.newCompanyId } },
          { session },
        );

        for (const config of SCALAR_COLLECTIONS) {
          await config.collection.updateMany(
            { company_id: mapping.oldCompanyId },
            { $set: { company_id: mapping.newCompanyId } },
            { session },
          );
        }

        for (const config of ARRAY_COLLECTIONS) {
          await config.collection.updateMany(
            { [config.fieldPath]: mapping.oldCompanyId },
            buildArrayReplacementPipeline(config.fieldPath, mapping.oldCompanyId, mapping.newCompanyId),
            { session },
          );
        }
      }

      await Counter.updateOne(
        { _id: targetCounterId },
        {
          $max: {
            sequence_value: nextSequence - 1,
            digits: targetDigits,
          },
          $setOnInsert: {
            available_seqs: [],
          },
        },
        {
          upsert: true,
          session,
        },
      );
    });

    console.log('Rekey complete.');
    console.log('Please ask affected company users to log in again so their session company_id refreshes.');
  } finally {
    await session.endSession();
  }
}

main()
  .catch((error) => {
    console.error('Cannot rekey merged VSIP company IDs:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
