const versionPlugin = require('../versionPlugin');

jest.mock('../../services/versionManagerService', () => ({
  commitChange: jest.fn().mockResolvedValue(),
  createTransactionId: jest.fn().mockReturnValue('tx-123'),
}));

const VersionManager = require('../../services/versionManagerService');

describe('versionPlugin', () => {
  let schema;
  let preSaveHook;
  let postSaveHook;
  let postRemoveHook;

  beforeEach(() => {
    jest.clearAllMocks();
    schema = {
      add: jest.fn(),
      pre: jest.fn((event, fn) => { if (event === 'save') preSaveHook = fn; }),
      post: jest.fn((event, fn) => {
        if (event === 'save') postSaveHook = fn;
        if (event === 'remove') postRemoveHook = fn;
      }),
    };
    versionPlugin(schema);
  });

  test('adds tracking fields to schema', () => {
    expect(schema.add).toHaveBeenCalledWith(expect.objectContaining({
      _modifiedBy: expect.any(Object),
      _commitMessage: expect.any(Object),
      _txId: expect.any(Object),
    }));
  });

  test('pre-save stores isNew state in _wasNew', () => {
    const doc = { isNew: true };
    const next = jest.fn();
    preSaveHook.call(doc, next);
    expect(doc._wasNew).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test('post-save commits init action when isInitialImport is true', async () => {
    const doc = {
      constructor: { modelName: 'TestModel', findById: jest.fn() },
      _id: 'id1',
      _modifiedBy: 'user1',
      _txId: 'tx-1',
      isInitialImport: true,
      toObject: jest.fn().mockReturnValue({
        _id: 'id1',
        company_id: 'C001',
        zone_id: 'Z001',
        periodKey: 202401,
        isInitialImport: true,
      }),
    };

    await postSaveHook.call(doc, doc);

    expect(VersionManager.commitChange).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'TestModel',
      resourceId: 'id1',
      actionType: 'init',
      modifiedBy: 'user1',
      transactionId: 'tx-1',
    }));
  });

  test('post-save commits create action for new documents', async () => {
    const doc = {
      constructor: { modelName: 'TestModel', findById: jest.fn().mockResolvedValue(null) },
      _id: 'id2',
      _wasNew: true,
      toObject: jest.fn().mockReturnValue({
        _id: 'id2',
        company_id: 'C002',
        zone_id: 'Z002',
        periodKey: 202402,
      }),
    };

    await postSaveHook.call(doc, doc);

    expect(VersionManager.commitChange).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'TestModel',
      resourceId: 'id2',
      actionType: 'create',
      oldObj: null,
    }));
  });

  test('post-save commits update action for existing documents', async () => {
    const oldState = { _id: 'id3', name: 'old' };
    const doc = {
      constructor: { modelName: 'TestModel', findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(oldState) }) },
      _id: 'id3',
      _wasNew: false,
      _modifiedBy: 'admin',
      toObject: jest.fn().mockReturnValue({
        _id: 'id3',
        name: 'new',
        company_id: 'C003',
      }),
    };

    await postSaveHook.call(doc, doc);

    expect(VersionManager.commitChange).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'TestModel',
      resourceId: 'id3',
      actionType: 'update',
      oldObj: oldState,
      modifiedBy: 'admin',
    }));
  });

  test('post-remove commits delete action', async () => {
    const doc = {
      constructor: { modelName: 'TestModel' },
      _id: 'id4',
      company_id: 'C004',
      zone_id: 'Z004',
      periodKey: 202404,
      toObject: jest.fn().mockReturnValue({ _id: 'id4', name: 'deleted' }),
    };

    await postRemoveHook.call(doc, doc);

    expect(VersionManager.commitChange).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'TestModel',
      resourceId: 'id4',
      actionType: 'delete',
      oldObj: { _id: 'id4', name: 'deleted' },
      newObj: null,
    }));
  });
});
