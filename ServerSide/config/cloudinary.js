const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const CloudinaryAsset = require('../models/cloudinaryAssetModel');
const logger = require('../utils/logger');
const {
  CLOUDINARY_BLOB_ROOT,
  normalizeCloudinarySegment,
} = require('../utils/cloudinaryFolders');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

function getBufferHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

const MIME_EXTENSION_MAP = Object.freeze({
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
});

function resolveFileExtension({ fileName = '', mimeType = '', resourceType = 'image' }) {
  if (resourceType !== 'raw') {
    return '';
  }

  const directExtension = path.extname(String(fileName || '')).toLowerCase();
  if (directExtension) {
    return directExtension;
  }

  return MIME_EXTENSION_MAP[mimeType] || '';
}

function normalizeLogicalScope(scope = '') {
  const normalized = String(scope || '')
    .split('/')
    .map((segment) => normalizeCloudinarySegment(segment))
    .filter(Boolean)
    .join('/');

  return normalized || 'unspecified';
}

function buildBlobPublicId(assetHash, resourceType, extension = '') {
  const normalizedExtension = resourceType === 'raw' ? extension : '';
  return `${CLOUDINARY_BLOB_ROOT}/${resourceType}/${assetHash}${normalizedExtension}`;
}

function resolveResourceType(resourceType) {
  return ['image', 'raw', 'video'].includes(resourceType) ? resourceType : 'image';
}

async function findRegisteredAsset(assetHash, resourceType) {
  if (!assetHash) return null;

  return CloudinaryAsset.findOne({
    asset_hash: assetHash,
    resource_type: resourceType,
  });
}

async function getExistingCloudinaryUrl(publicId, resourceType) {
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return resource.secure_url;
  } catch (err) {
    if (err.error?.http_code !== 404) {
      logger.error('Cloudinary resource check error:', err);
      throw new Error(`Failed to check resource: ${err.error?.message || err.message || 'Unknown error'}`);
    }

    return null;
  }
}

async function upsertRegisteredAsset({
  assetHash,
  publicId,
  secureUrl,
  resourceType,
  mimeType = null,
  extension = '',
  logicalScope = '',
  bytes = 0,
}) {
  const update = {
    public_id: publicId,
    secure_url: secureUrl,
    mime_type: mimeType || null,
    extension: extension || '',
    bytes: Number(bytes || 0),
    last_seen_at: new Date(),
  };

  const updateOps = {
    $set: update,
    $setOnInsert: {
      asset_hash: assetHash,
      resource_type: resourceType,
    },
  };

  if (logicalScope) {
    updateOps.$addToSet = { logical_scopes: logicalScope };
  }

  return CloudinaryAsset.findOneAndUpdate(
    { asset_hash: assetHash, resource_type: resourceType },
    updateOps,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function removeRegisteredAsset(publicId, resourceType) {
  if (!publicId) return;

  await CloudinaryAsset.deleteMany({
    public_id: publicId,
    resource_type: resourceType,
  });
}

function buildUploadOptions(publicId, resourceType, logicalScope, assetHash) {
  const uploadOptions = {
    resource_type: resourceType,
    type: 'upload',
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    tags: [
      'hepza-managed',
      'hepza-blob-store',
      `resource-${resourceType}`,
      `scope-${normalizeCloudinarySegment(logicalScope)}`,
      `hash-${String(assetHash).slice(0, 16)}`,
    ],
  };

  if (resourceType === 'image') {
    uploadOptions.allowed_formats = ['jpg', 'png', 'jpeg', 'webp'];
    uploadOptions.transformation = [{ width: 800, crop: 'scale' }];
  }

  return uploadOptions;
}

async function ensureBlobAsset({
  assetHash,
  source,
  resourceType,
  mimeType = '',
  originalFileName = '',
  logicalScope = '',
}) {
  const normalizedScope = normalizeLogicalScope(logicalScope);
  const extension = resolveFileExtension({
    fileName: originalFileName || source?.filePath || '',
    mimeType,
    resourceType,
  });
  const publicId = buildBlobPublicId(assetHash, resourceType, extension);

  const registeredAsset = await findRegisteredAsset(assetHash, resourceType);
  if (registeredAsset?.secure_url) {
    const existingUrl = await getExistingCloudinaryUrl(registeredAsset.public_id, resourceType);
    if (existingUrl) {
      await upsertRegisteredAsset({
        assetHash,
        publicId: registeredAsset.public_id,
        secureUrl: existingUrl,
        resourceType,
        mimeType: registeredAsset.mime_type || mimeType,
        extension: registeredAsset.extension || extension,
        logicalScope: normalizedScope,
        bytes: registeredAsset.bytes || 0,
      });
      return existingUrl;
    }

    await removeRegisteredAsset(registeredAsset.public_id, resourceType);
  }

  const existingUrl = await getExistingCloudinaryUrl(publicId, resourceType);
  if (existingUrl) {
    await upsertRegisteredAsset({
      assetHash,
      publicId,
      secureUrl: existingUrl,
      resourceType,
      mimeType,
      extension,
      logicalScope: normalizedScope,
      bytes: source?.bytes || 0,
    });
    return existingUrl;
  }

  const uploadInput = source?.dataUri || source?.filePath;
  const result = await cloudinary.uploader.upload(
    uploadInput,
    buildUploadOptions(publicId, resourceType, normalizedScope, assetHash)
  );

  await upsertRegisteredAsset({
    assetHash,
    publicId,
    secureUrl: result.secure_url,
    resourceType,
    mimeType,
    extension,
    logicalScope: normalizedScope,
    bytes: result.bytes || source?.bytes || 0,
  });

  return result.secure_url;
}

async function uploadOrReuseAttachment(filePath, options = {}) {
  if (!filePath || !(await fs.stat(filePath).catch(() => false))) {
    throw new Error('Invalid file path');
  }

  try {
    const fileHash = await getFileHash(filePath);
    const resourceType = resolveResourceType(options.resource_type);
    const fileStats = await fs.stat(filePath);

    return await ensureBlobAsset({
      assetHash: fileHash,
      source: {
        filePath,
        bytes: fileStats.size,
      },
      resourceType,
      mimeType: options.mime_type || '',
      originalFileName: options.original_filename || filePath,
      logicalScope: options.folder || options.logical_scope || '',
    });
  } catch (error) {
    logger.error('Upload error details:', error);
    const msg = error.message || 'Unknown error';
    if (msg.includes('File size too large')) throw new Error('File size exceeds limit');
    if (msg.includes('pixels')) throw new Error('Image too large in pixels');
    throw new Error(`Upload failed: ${msg}`);
  } finally {
    await fs.unlink(filePath).catch((err) => logger.error(`Failed to delete file ${filePath}:`, err));
  }
}

async function uploadDataUriOrReuseAttachment(dataUri, options = {}) {
  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
    throw new Error('Invalid data URI');
  }

  try {
    const base64Marker = 'base64,';
    const markerIndex = dataUri.indexOf(base64Marker);
    if (markerIndex === -1) {
      throw new Error('Unsupported data URI');
    }

    const mimeType = dataUri.slice(5, markerIndex - 1).split(';')[0] || '';
    const base64Payload = dataUri.slice(markerIndex + base64Marker.length);
    const buffer = Buffer.from(base64Payload, 'base64');
    const assetHash = options.public_id || getBufferHash(buffer);
    const resourceType = resolveResourceType(options.resource_type);

    return await ensureBlobAsset({
      assetHash,
      source: {
        dataUri,
        bytes: buffer.length,
      },
      resourceType,
      mimeType: options.mime_type || mimeType,
      originalFileName: options.original_filename || '',
      logicalScope: options.folder || options.logical_scope || '',
    });
  } catch (error) {
    logger.error('Upload data URI error details:', error);
    const msg = error.message || 'Unknown error';
    throw new Error(`Upload failed: ${msg}`);
  }
}

function extractPublicId(url) {
  if (!url) return null;

  try {
    const isRawResource = url.includes('/raw/upload/');
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    const segments = parts[1].split('/');
    let startIndex = 0;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];

      if (/^[a-z]{1,2}_[^/]+$/.test(segment) || segment.includes(',')) {
        startIndex = i + 1;
        continue;
      }

      if (/^v\d+$/.test(segment)) {
        startIndex = i + 1;
        continue;
      }

      break;
    }

    const afterUpload = segments.slice(startIndex).join('/');
    return isRawResource ? afterUpload : afterUpload.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

async function destroyByUrl(url, resourceType = 'image') {
  const publicId = extractPublicId(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    await removeRegisteredAsset(publicId, resourceType);
  } catch (err) {
    logger.warn(`Cloudinary rollback failed for ${publicId}:`, err.message);
  }
}

module.exports = {
  cloudinary,
  uploadOrReuseAttachment,
  uploadDataUriOrReuseAttachment,
  extractPublicId,
  destroyByUrl,
  getFileHash,
  getBufferHash,
  resolveFileExtension,
  normalizeLogicalScope,
  buildBlobPublicId,
  resolveResourceType,
  findRegisteredAsset,
  getExistingCloudinaryUrl,
  upsertRegisteredAsset,
  removeRegisteredAsset,
  buildUploadOptions,
};
