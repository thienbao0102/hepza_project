const { extractPublicId, destroyByUrl } = require('../config/cloudinary');
const { getManagedCloudinaryPrefixes } = require('./cloudinaryFolders');

const MANAGED_CLOUDINARY_PREFIXES = getManagedCloudinaryPrefixes();

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

function inferCloudinaryResourceType(url) {
  if (typeof url !== 'string') return 'image';
  if (url.includes('/raw/upload/')) return 'raw';
  if (url.includes('/video/upload/')) return 'video';
  return 'image';
}

function toCloudinaryAssetInfo(url) {
  if (!isCloudinaryUrl(url)) return null;

  const publicId = extractPublicId(url);
  if (!publicId) return null;

  const resourceType = inferCloudinaryResourceType(url);
  return {
    url,
    publicId,
    resourceType,
    key: `${resourceType}:${publicId}`,
  };
}

async function destroyCloudinaryUrls(urls = []) {
  const uniqueAssets = new Map();

  for (const url of urls) {
    const asset = toCloudinaryAssetInfo(url);
    if (asset) {
      uniqueAssets.set(asset.key, asset);
    }
  }

  for (const asset of uniqueAssets.values()) {
    await destroyByUrl(asset.url, asset.resourceType);
  }

  return Array.from(uniqueAssets.values());
}

module.exports = {
  MANAGED_CLOUDINARY_PREFIXES,
  isCloudinaryUrl,
  inferCloudinaryResourceType,
  toCloudinaryAssetInfo,
  destroyCloudinaryUrls,
};
