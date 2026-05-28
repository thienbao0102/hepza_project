const {
  prepareErrorLogPayload,
  rollbackUploadedErrorLogAssets,
  collectErrorLogAssetUrls,
} = require('../errorLogAssetUtils');

jest.mock('../../config/cloudinary', () => ({
  uploadDataUriOrReuseAttachment: jest.fn().mockResolvedValue('https://res.cloudinary.com/demo/image/upload/v123/screenshot.png'),
}));

jest.mock('../cloudinaryReferenceTracker', () => ({
  destroyUnusedCloudinaryUrls: jest.fn().mockResolvedValue(),
}));

const { uploadDataUriOrReuseAttachment } = require('../../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('../cloudinaryReferenceTracker');

describe('errorLogAssetUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('prepareErrorLogPayload passes through non-data-uri screenshot', async () => {
    const payload = { screenshot: 'https://example.com/img.png' };
    const { errorData, uploadedUrls } = await prepareErrorLogPayload(payload);
    expect(errorData.screenshot).toBe('https://example.com/img.png');
    expect(uploadedUrls).toEqual([]);
    expect(uploadDataUriOrReuseAttachment).not.toHaveBeenCalled();
  });

  test('prepareErrorLogPayload uploads data-uri screenshot', async () => {
    const payload = { screenshot: 'data:image/png;base64,abc123' };
    const { errorData, uploadedUrls } = await prepareErrorLogPayload(payload);
    expect(errorData.screenshot).toBe('https://res.cloudinary.com/demo/image/upload/v123/screenshot.png');
    expect(uploadedUrls).toEqual(['https://res.cloudinary.com/demo/image/upload/v123/screenshot.png']);
    expect(uploadDataUriOrReuseAttachment).toHaveBeenCalledWith(
      'data:image/png;base64,abc123',
      expect.objectContaining({ folder: expect.any(String), resource_type: 'image' })
    );
  });

  test('prepareErrorLogPayload processes screenshots array', async () => {
    const payload = {
      screenshots: [
        'data:image/png;base64,abc',
        null,
        'data:image/png;base64,def',
        'https://example.com/img.png',
      ],
    };
    const { errorData, uploadedUrls } = await prepareErrorLogPayload(payload);
    expect(errorData.screenshots).toHaveLength(3);
    expect(uploadedUrls).toHaveLength(2);
  });

  test('prepareErrorLogPayload handles empty payload', async () => {
    const { errorData, uploadedUrls } = await prepareErrorLogPayload();
    expect(errorData).toEqual({});
    expect(uploadedUrls).toEqual([]);
  });

  test('rollbackUploadedErrorLogAssets destroys urls', async () => {
    const urls = ['https://example.com/1.png'];
    await rollbackUploadedErrorLogAssets(urls);
    expect(destroyUnusedCloudinaryUrls).toHaveBeenCalledWith(urls);
  });

  test('rollbackUploadedErrorLogAssets does nothing for empty array', async () => {
    await rollbackUploadedErrorLogAssets([]);
    expect(destroyUnusedCloudinaryUrls).not.toHaveBeenCalled();
  });

  test('rollbackUploadedErrorLogAssets does nothing for non-array', async () => {
    await rollbackUploadedErrorLogAssets(null);
    expect(destroyUnusedCloudinaryUrls).not.toHaveBeenCalled();
  });

  test('collectErrorLogAssetUrls collects screenshot and screenshots', () => {
    const errorLog = {
      screenshot: 'https://example.com/a.png',
      screenshots: ['https://example.com/b.png', null, 'https://example.com/c.png'],
    };
    const urls = collectErrorLogAssetUrls(errorLog);
    expect(urls).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.png',
      'https://example.com/c.png',
    ]);
  });

  test('collectErrorLogAssetUrls returns empty for null input', () => {
    expect(collectErrorLogAssetUrls(null)).toEqual([]);
  });
});
