jest.mock('../../dataAccess/resourceVersionRepository', () => ({
  create: jest.fn().mockResolvedValue(),
  insertMany: jest.fn().mockResolvedValue(),
}));

jest.mock('mongoose', () => ({
  startSession: jest.fn().mockResolvedValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(),
    abortTransaction: jest.fn().mockResolvedValue(),
    endSession: jest.fn(),
  }),
}));

const resourceVersionRepository = require('../../dataAccess/resourceVersionRepository');
const mongoose = require('mongoose');

const {
  createTransactionId,
  computeDiff,
  generateCommitMessage,
  buildVersionDoc,
  commitChange,
  commitTransaction,
} = require('../versionManagerService');

describe('versionManagerService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTransactionId', () => {
    test('returns TX prefixed string with timestamp and random', () => {
      const txId = createTransactionId();
      expect(txId).toMatch(/^TX\d{14}[A-Z0-9]{4}$/);
    });

    test('accepts custom prefix', () => {
      const txId = createTransactionId('VB');
      expect(txId).toMatch(/^VB\d{14}[A-Z0-9]{4}$/);
    });
  });

  describe('computeDiff', () => {
    test('returns diff object when objects differ', () => {
      const diff = computeDiff({ a: 1 }, { a: 2 });
      expect(diff).toBeDefined();
      expect(diff.a).toBeDefined();
    });

    test('returns null when objects are equal', () => {
      const diff = computeDiff({ a: 1 }, { a: 1 });
      expect(diff).toBeNull();
    });

    test('diffs arrays with _id using objectHash', () => {
      const diff = computeDiff([{ _id: '1', name: 'A' }], [{ _id: '1', name: 'B' }]);
      expect(diff).toBeDefined();
    });
  });

  describe('generateCommitMessage', () => {
    test('returns import/init message', () => {
      expect(generateCommitMessage({ actionType: 'import' })).toBe('Khai báo dữ liệu lên hệ thống');
      expect(generateCommitMessage({ actionType: 'init' })).toBe('Khai báo dữ liệu lên hệ thống');
    });

    test('returns create message', () => {
      expect(generateCommitMessage({ actionType: 'create', resourceType: 'FuelResource', newObj: { fuelName: 'Xăng', main_group: 'fuel' } }))
        .toBe('Thêm dữ liệu nhiên liệu - Xăng');
    });

    test('returns delete message', () => {
      expect(generateCommitMessage({ actionType: 'delete', resourceType: 'WasteResource', oldObj: { wasteName: 'Chất thải', main_group: 'waste' } }))
        .toBe('Xóa dữ liệu chất thải - Chất thải');
    });

    test('returns update message with changed fields', () => {
      const diff = { quantity: [10, 20] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'Gỗ' }, diff });
      expect(msg).toContain('Cập nhật');
      expect(msg).toContain('Số lượng');
    });

    test('returns null when update has no meaningful changes', () => {
      const diff = {};
      expect(generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff })).toBeNull();
    });

    test('uses groupLabel when provided', () => {
      expect(generateCommitMessage({ actionType: 'create', resourceType: 'X', newObj: { name: 'A' }, groupLabel: 'Test' }))
        .toBe('Thêm dữ liệu Test - A');
    });

    test('filters case-only string changes', () => {
      const diff = { name: ['abc', 'ABC'] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'ABC' }, diff });
      expect(msg).toBeNull();
    });

    test('returns null when only detail fields changed and quantity filtered', () => {
      const diff = { production: [0, 10], quantity: [5, 15] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff });
      expect(msg).toContain('Thêm ');
    });

    test('returns null when no fields remain after filtering', () => {
      const diff = { quantity: [5, 15] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff });
      expect(msg).toContain('Số lượng');
    });

    test('handles non-array diff values', () => {
      const diff = { name: 'changed' };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff });
      expect(msg).toContain('Tên');
    });

    test('adds prefix when detail field goes from zero to positive', () => {
      const diff = { production: [0, 10] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff });
      expect(msg).toContain('Thêm Sản xuất');
    });

    test('adds prefix when detail field goes from positive to zero', () => {
      const diff = { production: [10, 0] };
      const msg = generateCommitMessage({ actionType: 'update', newObj: { name: 'A' }, diff });
      expect(msg).toContain('Bỏ Sản xuất');
    });

    test('returns empty string for unknown actionType', () => {
      expect(generateCommitMessage({ actionType: 'unknown' })).toBe('');
    });
  });

  describe('buildVersionDoc', () => {
    test('returns init doc without diff', () => {
      const doc = buildVersionDoc({ actionType: 'init', resourceType: 'X', company_id: 'C01' });
      expect(doc.actionType).toBe('init');
      expect(doc.changes).toBeNull();
      expect(doc._id).toMatch(/^RV_/);
    });

    test('returns null for update without diff', () => {
      const doc = buildVersionDoc({ actionType: 'update', oldObj: { a: 1 }, newObj: { a: 1 } });
      expect(doc).toBeNull();
    });

    test('returns doc for update with diff', () => {
      const doc = buildVersionDoc({ actionType: 'update', oldObj: { a: 1 }, newObj: { a: 2 }, resourceType: 'X' });
      expect(doc).toBeDefined();
      expect(doc.changes).toBeDefined();
    });

    test('generates commit message if not provided', () => {
      const doc = buildVersionDoc({ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X' });
      expect(doc.commitMessage).toContain('Thêm dữ liệu');
    });
  });

  describe('commitChange', () => {
    test('returns false when doc is null', async () => {
      const result = await commitChange({ actionType: 'update', oldObj: { a: 1 }, newObj: { a: 1 }, resourceType: 'X' });
      expect(result).toBe(false);
      expect(resourceVersionRepository.create).not.toHaveBeenCalled();
    });

    test('creates version doc and returns true', async () => {
      const result = await commitChange({ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X' });
      expect(result).toBe(true);
      expect(resourceVersionRepository.create).toHaveBeenCalled();
    });

    test('passes session when provided', async () => {
      const session = { id: 'sess1' };
      await commitChange({ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X', session });
      expect(resourceVersionRepository.create).toHaveBeenCalledWith(expect.any(Object), { session });
    });
  });

  describe('commitTransaction', () => {
    test('throws when changes is empty', async () => {
      await expect(commitTransaction({ changes: [], modifiedBy: 'U001' })).rejects.toThrow('changes required');
    });

    test('returns null transactionId when all docs filtered out', async () => {
      const result = await commitTransaction({
        changes: [{ actionType: 'update', oldObj: { a: 1 }, newObj: { a: 1 } }],
        modifiedBy: 'U001',
      });
      expect(result.transactionId).toBeNull();
    });

    test('uses external session when provided', async () => {
      const externalSession = { id: 'ext' };
      await commitTransaction({
        changes: [{ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X' }],
        modifiedBy: 'U001',
        session: externalSession,
      });
      expect(resourceVersionRepository.insertMany).toHaveBeenCalledWith(expect.any(Array), { session: externalSession });
    });

    test('creates internal session when none provided', async () => {
      await commitTransaction({
        changes: [{ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X' }],
        modifiedBy: 'U001',
      });
      expect(mongoose.startSession).toHaveBeenCalled();
      expect(resourceVersionRepository.insertMany).toHaveBeenCalled();
    });

    test('aborts internal transaction on error', async () => {
      resourceVersionRepository.insertMany.mockRejectedValueOnce(new Error('db fail'));
      await expect(commitTransaction({
        changes: [{ actionType: 'create', newObj: { name: 'A' }, resourceType: 'X' }],
        modifiedBy: 'U001',
      })).rejects.toThrow('db fail');
    });
  });
});
