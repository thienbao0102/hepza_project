const {
  isCloudinaryUrl,
  inferCloudinaryResourceType,
  toCloudinaryAssetInfo,
  destroyCloudinaryUrls,
  MANAGED_CLOUDINARY_PREFIXES,
} = require('../cloudinaryAssetUtils');

jest.mock('../../config/cloudinary', () => ({
  extractPublicId: jest.fn((url) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('.')[0];
  }),
  destroyByUrl: jest.fn().mockResolvedValue(),
}));

const { extractPublicId, destroyByUrl } = require('../../config/cloudinary');

describe('cloudinaryAssetUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('isCloudinaryUrl returns true for cloudinary URLs', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v123/sample.jpg')).toBe(true);
  });

  test('isCloudinaryUrl returns false for non-cloudinary URLs', () => {
    expect(isCloudinaryUrl('https://example.com/image.jpg')).toBe(false);
    expect(isCloudinaryUrl(null)).toBe(false);
    expect(isCloudinaryUrl(123)).toBe(false);
  });

  test('inferCloudinaryResourceType detects raw', () => {
    expect(inferCloudinaryResourceType('https://res.cloudinary.com/demo/raw/upload/v123/doc.pdf')).toBe('raw');
  });

  test('inferCloudinaryResourceType detects video', () => {
    expect(inferCloudinaryResourceType('https://res.cloudinary.com/demo/video/upload/v123/movie.mp4')).toBe('video');
  });

  test('inferCloudinaryResourceType defaults to image', () => {
    expect(inferCloudinaryResourceType('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg')).toBe('image');
  });

  test('inferCloudinaryResourceType defaults to image for non-string', () => {
    expect(inferCloudinaryResourceType(null)).toBe('image');
  });

  test('toCloudinaryAssetInfo returns null for non-cloudinary URL', () => {
    expect(toCloudinaryAssetInfo('https://example.com')).toBeNull();
  });

  test('toCloudinaryAssetInfo returns null when publicId extraction fails', () => {
    extractPublicId.mockReturnValue(null);
    expect(toCloudinaryAssetInfo('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg')).toBeNull();
  });

  test('toCloudinaryAssetInfo builds correct asset info', () => {
    extractPublicId.mockReturnValue('my/public/id');
    const result = toCloudinaryAssetInfo('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg');
    expect(result).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v123/photo.jpg',
      publicId: 'my/public/id',
      resourceType: 'image',
      key: 'image:my/public/id',
    });
  });

  test('destroyCloudinaryUrls destroys unique assets only', async () => {
    extractPublicId.mockReturnValue('id1');
    const urls = [
      'https://res.cloudinary.com/demo/image/upload/v123/photo.jpg',
      'https://res.cloudinary.com/demo/image/upload/v123/photo.jpg',
    ];
    const result = await destroyCloudinaryUrls(urls);
    expect(destroyByUrl).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  test('destroyCloudinaryUrls skips non-cloudinary URLs', async () => {
    const urls = ['https://example.com', 'not-a-url'];
    const result = await destroyCloudinaryUrls(urls);
    expect(destroyByUrl).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('MANAGED_CLOUDINARY_PREFIXES is exported', () => {
    expect(Array.isArray(MANAGED_CLOUDINARY_PREFIXES)).toBe(true);
  });
});
