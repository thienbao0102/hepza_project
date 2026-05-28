const { uploadDataUriOrReuseAttachment } = require('../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('./cloudinaryReferenceTracker');
const { CLOUDINARY_FOLDERS } = require('./cloudinaryFolders');

const ERROR_LOG_SCREENSHOT_FOLDER = CLOUDINARY_FOLDERS.errorLogScreenshots;

function normalizeScreenshotList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isDataUriImage(value) {
  return typeof value === 'string' && value.startsWith('data:image');
}

async function uploadErrorLogAsset(value, uploadedUrls) {
  if (!isDataUriImage(value)) {
    return value;
  }

  const url = await uploadDataUriOrReuseAttachment(value, {
    folder: ERROR_LOG_SCREENSHOT_FOLDER,
    resource_type: 'image',
  });

  if (uploadedUrls) {
    uploadedUrls.push(url);
  }

  return url;
}

async function prepareErrorLogPayload(payload = {}) {
  const errorData = { ...payload };
  const uploadedUrls = [];

  if (errorData.screenshot) {
    errorData.screenshot = await uploadErrorLogAsset(errorData.screenshot, uploadedUrls);
  }

  if (Array.isArray(errorData.screenshots)) {
    errorData.screenshots = await Promise.all(
      normalizeScreenshotList(errorData.screenshots).map((item) => uploadErrorLogAsset(item, uploadedUrls))
    );
  }

  return { errorData, uploadedUrls };
}

async function rollbackUploadedErrorLogAssets(urls = []) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return;
  }

  await destroyUnusedCloudinaryUrls(urls);
}

function collectErrorLogAssetUrls(errorLog) {
  if (!errorLog) return [];

  return [
    errorLog.screenshot,
    ...normalizeScreenshotList(errorLog.screenshots),
  ].filter(Boolean);
}

module.exports = {
  prepareErrorLogPayload,
  rollbackUploadedErrorLogAssets,
  collectErrorLogAssetUrls,
};
