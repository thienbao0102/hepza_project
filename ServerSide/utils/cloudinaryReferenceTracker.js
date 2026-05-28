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
const { destroyCloudinaryUrls } = require('./cloudinaryAssetUtils');

async function countCloudinaryUrlReferences(url) {
  if (!url) return 0;

  const [
    buyDemandCount,
    sellOfferCount,
    wasteResourceCount,
    fuelResourceCount,
    zoneCount,
    errorLogCount,
    companyLicenseCount,
    environmentalReportCount,
    notificationTemplateCount,
    notificationLogCount,
    notificationInstanceCount,
  ] = await Promise.all([
    WasteBuyDemand.countDocuments({ 'attachments.url': url }),
    WasteSellOffer.countDocuments({ 'attachments.url': url }),
    WasteResource.countDocuments({ 'attachments.url': url }),
    FuelResource.countDocuments({ billImage: url }),
    IndustrialZone.countDocuments({ image_url: url }),
    ErrorLog.countDocuments({ $or: [{ screenshot: url }, { screenshots: url }] }),
    Company.countDocuments({ 'licenses.file_url': url }),
    EnvironmentalReport.countDocuments({ file_url: url }),
    NotificationTemplate.countDocuments({ 'attachments.url': url }),
    NotificationSendLog.countDocuments({ 'attachments.url': url }),
    NotificationInstance.countDocuments({ 'attachments.url': url }),
  ]);

  return (
    buyDemandCount +
    sellOfferCount +
    wasteResourceCount +
    fuelResourceCount +
    zoneCount +
    errorLogCount +
    companyLicenseCount +
    environmentalReportCount +
    notificationTemplateCount +
    notificationLogCount +
    notificationInstanceCount
  );
}

async function destroyUnusedCloudinaryUrls(urls = []) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const safeToDelete = [];

  for (const url of uniqueUrls) {
    const referenceCount = await countCloudinaryUrlReferences(url);
    if (referenceCount === 0) {
      safeToDelete.push(url);
    }
  }

  await destroyCloudinaryUrls(safeToDelete);
  return safeToDelete;
}

module.exports = {
  countCloudinaryUrlReferences,
  destroyUnusedCloudinaryUrls,
};
