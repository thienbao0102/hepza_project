function normalizeCloudinarySegment(value = 'general') {
  const normalized = String(value || 'general')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'general';
}

const CLOUDINARY_BLOB_ROOT = 'hepza/blobs';

const CLOUDINARY_FOLDERS = Object.freeze({
  symbiosisBuyDemand: 'hepza/symbiosis/buy-demands',
  symbiosisSellSupply: 'hepza/symbiosis/sell-supplies',
  notifications: 'hepza/notifications/attachments',
  companyLicenses: 'hepza/companies/licenses',
  environmentalReports: 'hepza/companies/environmental-reports',
  industrialZones: 'hepza/zones/images',
  errorLogScreenshots: 'hepza/error-logs/screenshots',
});

const LEGACY_CLOUDINARY_PREFIX_MIGRATIONS = Object.freeze([
  { from: 'symbiosis/buy-demand', to: CLOUDINARY_FOLDERS.symbiosisBuyDemand },
  { from: 'symbiosis/sell-supply', to: CLOUDINARY_FOLDERS.symbiosisSellSupply },
  { from: 'notifications', to: CLOUDINARY_FOLDERS.notifications },
  { from: 'company/licenses', to: CLOUDINARY_FOLDERS.companyLicenses },
  { from: 'environmental-reports', to: CLOUDINARY_FOLDERS.environmentalReports },
  { from: 'industrial_zones', to: CLOUDINARY_FOLDERS.industrialZones },
  { from: 'error_logs', to: CLOUDINARY_FOLDERS.errorLogScreenshots },
  { from: 'hepza/bills', to: 'hepza/resources/fuel-bills' },
  { from: 'hepza/waste', to: 'hepza/resources/waste-attachments' },
]);

function getFuelBillFolder(mainGroup) {
  return `hepza/resources/fuel-bills/${normalizeCloudinarySegment(mainGroup)}`;
}

function getWasteAttachmentFolder(mainGroup) {
  return `hepza/resources/waste-attachments/${normalizeCloudinarySegment(mainGroup)}`;
}

function getManagedCloudinaryPrefixes() {
  const nextPrefixes = [
    { prefix: CLOUDINARY_BLOB_ROOT, resourceTypes: ['image', 'raw', 'video'] },
    { prefix: CLOUDINARY_FOLDERS.symbiosisBuyDemand, resourceTypes: ['image', 'raw'] },
    { prefix: CLOUDINARY_FOLDERS.symbiosisSellSupply, resourceTypes: ['image', 'raw'] },
    { prefix: CLOUDINARY_FOLDERS.notifications, resourceTypes: ['image', 'raw'] },
    { prefix: CLOUDINARY_FOLDERS.companyLicenses, resourceTypes: ['image', 'raw'] },
    { prefix: CLOUDINARY_FOLDERS.environmentalReports, resourceTypes: ['raw'] },
    { prefix: CLOUDINARY_FOLDERS.industrialZones, resourceTypes: ['image'] },
    { prefix: CLOUDINARY_FOLDERS.errorLogScreenshots, resourceTypes: ['image'] },
    { prefix: 'hepza/resources/fuel-bills', resourceTypes: ['image'] },
    { prefix: 'hepza/resources/waste-attachments', resourceTypes: ['image', 'raw'] },
  ];

  const legacyPrefixes = LEGACY_CLOUDINARY_PREFIX_MIGRATIONS.map(({ from }) => ({
    prefix: from,
    resourceTypes: from === 'environmental-reports'
      ? ['raw']
      : from === 'industrial_zones' || from === 'error_logs'
        ? ['image']
        : from === 'hepza/bills'
          ? ['image']
          : ['image', 'raw'],
  }));

  const uniquePrefixes = new Map();
  for (const item of [...nextPrefixes, ...legacyPrefixes]) {
    const key = `${item.prefix}:${item.resourceTypes.join(',')}`;
    uniquePrefixes.set(key, item);
  }

  return Array.from(uniquePrefixes.values());
}

function rewriteCloudinaryPublicId(publicId = '') {
  const normalizedPublicId = String(publicId || '').replace(/^\/+/, '');
  if (!normalizedPublicId) return normalizedPublicId;

  for (const { from, to } of LEGACY_CLOUDINARY_PREFIX_MIGRATIONS) {
    if (normalizedPublicId === from) {
      return to;
    }

    if (normalizedPublicId.startsWith(`${from}/`)) {
      return `${to}${normalizedPublicId.slice(from.length)}`;
    }
  }

  return normalizedPublicId;
}

module.exports = {
  CLOUDINARY_FOLDERS,
  CLOUDINARY_BLOB_ROOT,
  LEGACY_CLOUDINARY_PREFIX_MIGRATIONS,
  normalizeCloudinarySegment,
  getFuelBillFolder,
  getWasteAttachmentFolder,
  getManagedCloudinaryPrefixes,
  rewriteCloudinaryPublicId,
};
