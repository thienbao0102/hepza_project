jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    url: jest.fn((id, opts) => `https://mock.cloudinary.com/${opts.resource_type || 'image'}/upload/${id}`),
    api: {
      resource: jest.fn(),
    },
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: 'https://mock.cloudinary.com/uploaded.jpg', bytes: 1024 }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

jest.mock('../../models/cloudinaryAssetModel', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../utils/cloudinaryFolders', () => ({
  CLOUDINARY_BLOB_ROOT: 'hepza/blobs',
  normalizeCloudinarySegment: (s) => String(s || '').replace(/[^a-z0-9_-]/gi, '_').toLowerCase(),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('file-content')),
    stat: jest.fn().mockResolvedValue({ size: 2048 }),
    unlink: jest.fn().mockResolvedValue(),
  },
}));

const cloudinary = require('cloudinary').v2;
const CloudinaryAsset = require('../../models/cloudinaryAssetModel');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const {
  getBufferHash,
  getFileHash,
  resolveFileExtension,
  normalizeLogicalScope,
  buildBlobPublicId,
  resolveResourceType,
  findRegisteredAsset,
  getExistingCloudinaryUrl,
  upsertRegisteredAsset,
  removeRegisteredAsset,
  buildUploadOptions,
  uploadOrReuseAttachment,
  uploadDataUriOrReuseAttachment,
  extractPublicId,
  destroyByUrl,
} = require('../cloudinary');

describe('cloudinary helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getBufferHash returns consistent md5 hex', () => {
    const hash1 = getBufferHash(Buffer.from('hello'));
    const hash2 = getBufferHash(Buffer.from('hello'));
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{32}$/);
  });

  test('resolveFileExtension returns empty for non-raw resourceType', () => {
    expect(resolveFileExtension({ fileName: 'doc.pdf', mimeType: 'application/pdf', resourceType: 'image' })).toBe('');
  });

  test('resolveFileExtension uses path extname for raw type', () => {
    expect(resolveFileExtension({ fileName: 'doc.pdf', mimeType: '', resourceType: 'raw' })).toBe('.pdf');
  });

  test('resolveFileExtension falls back to MIME map for raw type', () => {
    expect(resolveFileExtension({ fileName: '', mimeType: 'application/pdf', resourceType: 'raw' })).toBe('.pdf');
    expect(resolveFileExtension({ fileName: '', mimeType: 'application/zip', resourceType: 'raw' })).toBe('.zip');
  });

  test('resolveFileExtension returns empty for unknown mime', () => {
    expect(resolveFileExtension({ fileName: '', mimeType: 'unknown/type', resourceType: 'raw' })).toBe('');
  });

  test('normalizeLogicalScope normalizes segments', () => {
    expect(normalizeLogicalScope('Zone A/Company B')).toBe('zone_a/company_b');
  });

  test('normalizeLogicalScope returns unspecified for empty input', () => {
    expect(normalizeLogicalScope('')).toBe('unspecified');
    expect(normalizeLogicalScope(null)).toBe('unspecified');
  });

  test('buildBlobPublicId builds correct path', () => {
    expect(buildBlobPublicId('abc123', 'image')).toBe('hepza/blobs/image/abc123');
    expect(buildBlobPublicId('abc123', 'raw', '.pdf')).toBe('hepza/blobs/raw/abc123.pdf');
  });

  test('resolveResourceType validates known types', () => {
    expect(resolveResourceType('image')).toBe('image');
    expect(resolveResourceType('raw')).toBe('raw');
    expect(resolveResourceType('video')).toBe('video');
    expect(resolveResourceType('unknown')).toBe('image');
  });

  test('findRegisteredAsset queries by hash and type', async () => {
    CloudinaryAsset.findOne.mockResolvedValue({ asset_hash: 'h1' });
    const result = await findRegisteredAsset('h1', 'image');
    expect(CloudinaryAsset.findOne).toHaveBeenCalledWith({ asset_hash: 'h1', resource_type: 'image' });
    expect(result.asset_hash).toBe('h1');
  });

  test('findRegisteredAsset returns null for empty hash', async () => {
    expect(await findRegisteredAsset('', 'image')).toBeNull();
    expect(CloudinaryAsset.findOne).not.toHaveBeenCalled();
  });

  test('getExistingCloudinaryUrl returns secure url when resource exists', async () => {
    cloudinary.api.resource.mockResolvedValue({});
    const url = await getExistingCloudinaryUrl('pub-id', 'image');
    expect(url).toContain('pub-id');
  });

  test('getExistingCloudinaryUrl returns null on 404', async () => {
    cloudinary.api.resource.mockRejectedValue({ error: { http_code: 404 } });
    const url = await getExistingCloudinaryUrl('pub-id', 'image');
    expect(url).toBeNull();
  });

  test('getExistingCloudinaryUrl throws on non-404 errors', async () => {
    cloudinary.api.resource.mockRejectedValue(new Error('network'));
    await expect(getExistingCloudinaryUrl('pub-id', 'image')).rejects.toThrow('Failed to check resource');
  });

  test('upsertRegisteredAsset builds correct update ops', async () => {
    CloudinaryAsset.findOneAndUpdate.mockResolvedValue({ asset_hash: 'h2' });
    const result = await upsertRegisteredAsset({
      assetHash: 'h2',
      publicId: 'pid',
      secureUrl: 'https://example.com',
      resourceType: 'raw',
      logicalScope: 'scope',
      bytes: 1024,
    });
    expect(CloudinaryAsset.findOneAndUpdate).toHaveBeenCalledWith(
      { asset_hash: 'h2', resource_type: 'raw' },
      expect.objectContaining({
        $set: expect.objectContaining({ public_id: 'pid', bytes: 1024 }),
        $setOnInsert: { asset_hash: 'h2', resource_type: 'raw' },
        $addToSet: { logical_scopes: 'scope' },
      }),
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    expect(result.asset_hash).toBe('h2');
  });

  test('removeRegisteredAsset deletes by publicId', async () => {
    await removeRegisteredAsset('pid', 'image');
    expect(CloudinaryAsset.deleteMany).toHaveBeenCalledWith({ public_id: 'pid', resource_type: 'image' });
  });

  test('removeRegisteredAsset does nothing without publicId', async () => {
    await removeRegisteredAsset(null, 'image');
    expect(CloudinaryAsset.deleteMany).not.toHaveBeenCalled();
  });

  test('buildUploadOptions includes allowed_formats for images', () => {
    const opts = buildUploadOptions('pid', 'image', 'scope', 'hash123');
    expect(opts.resource_type).toBe('image');
    expect(opts.allowed_formats).toContain('jpg');
    expect(opts.transformation).toBeDefined();
    expect(opts.tags).toContain('hepza-managed');
  });

  test('buildUploadOptions omits allowed_formats for raw', () => {
    const opts = buildUploadOptions('pid', 'raw', 'scope', 'hash123');
    expect(opts.allowed_formats).toBeUndefined();
    expect(opts.transformation).toBeUndefined();
  });

  test('getFileHash reads file and returns md5', async () => {
    const hash = await getFileHash('/tmp/test.jpg');
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/test.jpg');
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  test('extractPublicId returns null for empty url', () => {
    expect(extractPublicId('')).toBeNull();
    expect(extractPublicId(null)).toBeNull();
  });

  test('extractPublicId returns null for invalid url', () => {
    expect(extractPublicId('https://example.com')).toBeNull();
  });

  test('extractPublicId extracts image public id', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1234/hepza/blobs/image/hash123.jpg';
    expect(extractPublicId(url)).toBe('hepza/blobs/image/hash123');
  });

  test('extractPublicId extracts raw public id keeping extension', () => {
    const url = 'https://res.cloudinary.com/demo/raw/upload/v1234/hepza/blobs/raw/hash123.pdf';
    expect(extractPublicId(url)).toBe('hepza/blobs/raw/hash123.pdf');
  });

  test('extractPublicId handles transformation segments', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/w_100,c_scale/hepza/blobs/image/hash123.jpg';
    expect(extractPublicId(url)).toBe('hepza/blobs/image/hash123');
  });

  test('extractPublicId handles version segments', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/hepza/blobs/image/hash123.jpg';
    expect(extractPublicId(url)).toBe('hepza/blobs/image/hash123');
  });

  test('destroyByUrl does nothing for invalid url', async () => {
    await destroyByUrl('');
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  test('destroyByUrl destroys extracted public id', async () => {
    await destroyByUrl('https://res.cloudinary.com/demo/image/upload/v1234/pid1.jpg');
    expect(cloudinary.uploader.destroy).toHaveBeenCalled();
    expect(CloudinaryAsset.deleteMany).toHaveBeenCalled();
  });

  test('destroyByUrl logs warning on error', async () => {
    cloudinary.uploader.destroy.mockRejectedValueOnce(new Error('fail'));
    await destroyByUrl('https://res.cloudinary.com/demo/image/upload/v1234/pid1.jpg');
    expect(logger.warn).toHaveBeenCalled();
  });

  describe('uploadOrReuseAttachment', () => {
    test('throws for invalid file path', async () => {
      fs.stat.mockRejectedValueOnce(new Error('ENOENT'));
      await expect(uploadOrReuseAttachment('/missing')).rejects.toThrow('Invalid file path');
    });

    test('uploads new file when no registered asset exists', async () => {
      cloudinary.api.resource.mockRejectedValueOnce({ error: { http_code: 404 } });
      CloudinaryAsset.findOne.mockResolvedValueOnce(null);

      const result = await uploadOrReuseAttachment('/tmp/test.jpg', { mime_type: 'image/jpeg', original_filename: 'test.jpg' });
      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(result).toBe('https://mock.cloudinary.com/uploaded.jpg');
    });

    test('reuses registered asset url when cloudinary resource exists', async () => {
      CloudinaryAsset.findOne.mockResolvedValueOnce({ secure_url: 'https://existing.com/img.jpg', public_id: 'pid1', mime_type: 'image/jpeg', extension: '.jpg', bytes: 512 });
      cloudinary.api.resource.mockResolvedValueOnce({});

      const result = await uploadOrReuseAttachment('/tmp/test.jpg');
      expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
      expect(result).toContain('mock.cloudinary.com');
    });

    test('throws on file size too large', async () => {
      cloudinary.api.resource.mockRejectedValueOnce({ error: { http_code: 404 } });
      CloudinaryAsset.findOne.mockResolvedValueOnce(null);
      cloudinary.uploader.upload.mockRejectedValueOnce(new Error('File size too large'));

      await expect(uploadOrReuseAttachment('/tmp/test.jpg')).rejects.toThrow('File size exceeds limit');
    });

    test('throws on pixel error', async () => {
      cloudinary.api.resource.mockRejectedValueOnce({ error: { http_code: 404 } });
      CloudinaryAsset.findOne.mockResolvedValueOnce(null);
      cloudinary.uploader.upload.mockRejectedValueOnce(new Error('too many pixels'));

      await expect(uploadOrReuseAttachment('/tmp/test.jpg')).rejects.toThrow('Image too large in pixels');
    });

    test('unlinks file in finally', async () => {
      cloudinary.api.resource.mockRejectedValueOnce({ error: { http_code: 404 } });
      CloudinaryAsset.findOne.mockResolvedValueOnce(null);

      await uploadOrReuseAttachment('/tmp/test.jpg');
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.jpg');
    });
  });

  describe('uploadDataUriOrReuseAttachment', () => {
    test('throws for invalid data URI', async () => {
      await expect(uploadDataUriOrReuseAttachment('not-data')).rejects.toThrow('Invalid data URI');
    });

    test('throws for unsupported data URI format', async () => {
      await expect(uploadDataUriOrReuseAttachment('data:text/plain,hello')).rejects.toThrow('Unsupported data URI');
    });

    test('uploads base64 data URI', async () => {
      const dataUri = 'data:image/png;base64,' + Buffer.from('hello').toString('base64');
      cloudinary.api.resource.mockRejectedValueOnce({ error: { http_code: 404 } });
      CloudinaryAsset.findOne.mockResolvedValueOnce(null);

      const result = await uploadDataUriOrReuseAttachment(dataUri, { resource_type: 'image' });
      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(result).toBe('https://mock.cloudinary.com/uploaded.jpg');
    });

    test('reuses existing asset by hash', async () => {
      const dataUri = 'data:image/png;base64,' + Buffer.from('hello').toString('base64');
      CloudinaryAsset.findOne.mockResolvedValueOnce({ secure_url: 'https://existing.com/img.jpg', public_id: 'pid1' });
      cloudinary.api.resource.mockResolvedValueOnce({});

      const result = await uploadDataUriOrReuseAttachment(dataUri);
      expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
    });
  });
});
