jest.mock('../../services/exportService', () => ({
  checkExportPermission: jest.fn().mockResolvedValue(['C01']),
  saveExportHistory: jest.fn().mockResolvedValue({ export_id: 'E1' }),
}));
jest.mock('../../services/exportHistoryService', () => ({
  getExportHistoriesByUserId: jest.fn().mockResolvedValue([{ id: 'H1' }]),
  deleteExportHistory: jest.fn().mockResolvedValue(),
  updateExportHistoryStatus: jest.fn().mockResolvedValue(),
}));

jest.mock('../../services/companyService', () => ({
  getAllCompanies: jest.fn().mockResolvedValue({ companies: [], pagination: {} }),
  getCompanyById: jest.fn().mockResolvedValue({ company_id: 'C01' }),
  addCompany: jest.fn().mockResolvedValue({ company_id: 'C02' }),
  updateCompany: jest.fn().mockResolvedValue({ company_id: 'C01' }),
  deleteCompanyById: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  deleteCompaniesByIds: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  restoreCompany: jest.fn().mockResolvedValue({ message: 'Restored' }),
  restoreCompanies: jest.fn().mockResolvedValue({ message: 'Restored' }),
  getDeletedCompanies: jest.fn().mockResolvedValue({ companies: [] }),
  hardDeleteCompany: jest.fn().mockResolvedValue({ message: 'Hard deleted' }),
  hardDeleteCompanies: jest.fn().mockResolvedValue({ message: 'Hard deleted' }),
  previewSoftDeleteCompanies: jest.fn().mockResolvedValue({ preview: [] }),
  previewHardDeleteCompanies: jest.fn().mockResolvedValue({ preview: [] }),
  addLicense: jest.fn().mockResolvedValue({ license_id: 'L1' }),
  updateLicense: jest.fn().mockResolvedValue({ license_id: 'L1' }),
  deleteLicense: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  getLicense: jest.fn().mockResolvedValue({ license_id: 'L1' }),
  deleteMultipleLicenses: jest.fn().mockResolvedValue({ message: 'Deleted' }),
}));

jest.mock('../../services/summaryRecordService', () => ({
  checkAccessPermission: jest.fn().mockResolvedValue({ company_id: 'C01', zone_id: 'Z01' }),
  getSummaryRecord: jest.fn().mockResolvedValue({ data: [] }),
  getSummaryRecordByPeriodKey: jest.fn().mockResolvedValue({ data: [] }),
}));

jest.mock('../../services/solutionService', () => ({
  getSolution: jest.fn().mockResolvedValue({ solutions: [], pagination: {} }),
  getSolutionDetail: jest.fn().mockResolvedValue({ solution_id: 'S1' }),
  createSolution: jest.fn().mockResolvedValue({ solution_id: 'S1' }),
  updateSolution: jest.fn().mockResolvedValue({ solution_id: 'S1' }),
  deleteSolution: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  deleteMultipleSolutions: jest.fn().mockResolvedValue({ message: 'Deleted' }),
}));
jest.mock('../../dataAccess/hashtagRepository', () => ({
  findByNames: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/userService', () => ({
  createUser: jest.fn().mockResolvedValue({ user_id: 'U1' }),
  updateUser: jest.fn().mockResolvedValue({ user_id: 'U1' }),
  softDeleteUser: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  softDeleteUsers: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  getUsersByRole: jest.fn().mockResolvedValue({ users: [] }),
  getUserById: jest.fn().mockResolvedValue({ user_id: 'U1' }),
  restoreUser: jest.fn().mockResolvedValue({ message: 'Restored' }),
  restoreUsers: jest.fn().mockResolvedValue({ message: 'Restored' }),
  updateMyProfile: jest.fn().mockResolvedValue({ user_id: 'U1' }),
  verifyEmailOtp: jest.fn().mockResolvedValue({ verified: true }),
  getSoftDeletedUsers: jest.fn().mockResolvedValue({ users: [] }),
  hardDeleteUser: jest.fn().mockResolvedValue({ message: 'Hard deleted' }),
  hardDeleteUsers: jest.fn().mockResolvedValue({ message: 'Hard deleted' }),
  previewSoftDeleteUsers: jest.fn().mockResolvedValue({ preview: [] }),
  previewHardDeleteUsers: jest.fn().mockResolvedValue({ preview: [] }),
}));

jest.mock('../../models/errorLog', () => {
  const mockDoc = { save: jest.fn().mockResolvedValue({ _id: 'EL1' }) };
  const Model = jest.fn(() => mockDoc);
  Model.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([{ _id: 'EL1' }]),
  });
  Model.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: 'EL1' });
  Model.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'EL1', attachments: [] });
  return Model;
});
jest.mock('../../utils/errorLogAssetUtils', () => ({
  prepareErrorLogPayload: jest.fn().mockResolvedValue({ errorData: { title: 'test' }, uploadedUrls: [] }),
  rollbackUploadedErrorLogAssets: jest.fn().mockResolvedValue(),
  collectErrorLogAssetUrls: jest.fn().mockReturnValue([]),
}));

jest.mock('../../services/regulationService', () => ({
  getRegulations: jest.fn().mockResolvedValue([{ id: 'R1' }]),
  getRegulationDetail: jest.fn().mockResolvedValue({ regulation_id: 'R1' }),
  createRegulation: jest.fn().mockResolvedValue({ regulation_id: 'R1' }),
  updateRegulation: jest.fn().mockResolvedValue({ regulation_id: 'R1' }),
  deleteRegulation: jest.fn().mockResolvedValue({ message: 'Deleted' }),
  deleteMultipleRegulations: jest.fn().mockResolvedValue({ message: 'Deleted' }),
}));

jest.mock('../../services/emissionService', () => ({
  getEmissionByPeriod: jest.fn().mockResolvedValue({ emissions: [] }),
}));

jest.mock('../../services/hashtagService', () => ({
  getAllHashtags: jest.fn().mockResolvedValue([{ id: 'H1' }]),
  createHashtag: jest.fn().mockResolvedValue({ id: 'H1' }),
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(),
}));

const cacheManager = require('../../lib/cacheManager');

const { registerExportHandlers } = require('../exportSocketHandler');
const { registerCompanyHandlers } = require('../companySocketHandler');
const { registerSummaryHandlers } = require('../summarySocketHandler');
const { registerSolutionHandlers } = require('../solutionSocketHandler');
const { registerUserHandlers } = require('../userSocketHandler');
const { registerErrorLogHandlers } = require('../errorLogSocketHandler');
const { registerRegulationHandlers } = require('../regulationSocketHandler');
const { registerEmissionHandlers } = require('../emissionSocketHandler');
const { registerHashtagHandlers } = require('../hashtagSocketHandler');

const createMockSocket = (user = {}) => ({
  userDetails: user,
  user,
  on: jest.fn(),
  emit: jest.fn(),
});

const invokeHandler = async (socket, event, payload, cb) => {
  const call = socket.on.mock.calls.find((c) => c[0] === event);
  if (!call) throw new Error(`Event ${event} not registered`);
  await call[1](payload, cb);
};

describe('exportSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('export:resourceWaste throws', async () => {
    const socket = createMockSocket();
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:resourceWaste', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: false }));
  });

  test('export:init creates request', async () => {
    const socket = createMockSocket({ user_id: 'U1', full_name: 'Test' });
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:init', { payload: { company_ids: ['C01'], periodKeyStart: 202401, periodKeyEnd: 202412, include: [2], option: 1 } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true, data: expect.objectContaining({ export_id: 'E1' }) }));
  });

  test('export:init with option 3', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:init', { payload: { periodKeyStart: 202401, periodKeyEnd: 202412, include: [0], option: 3 } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('export:init with isZoneScope', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:init', { payload: { periodKeyStart: 202401, periodKeyEnd: 202412, include: [2, 3], isZoneScope: true } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('export:getHistory', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:getHistory', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('export:deleteHistoryItem', async () => {
    const socket = createMockSocket();
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:deleteHistoryItem', { payload: { id: 'H1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('export:pinHistoryItem', async () => {
    const socket = createMockSocket();
    registerExportHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'export:pinHistoryItem', { payload: { exportId: 'E1', status: 'done', total_records: 10 } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('companySocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('company:getAll', async () => {
    const socket = createMockSocket({ role: 'admin' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:getAll', { payload: { page: 1, limit: 10 } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:getById', async () => {
    const socket = createMockSocket({ role: 'admin', zone_id: 'Z01' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:getById', { payload: { company_id: 'C01' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:create', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:create', { payload: { companyData: { name: 'Test' }, zone_id: 'Z01' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:createBatch throws', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:createBatch', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: false }));
  });

  test('company:update', async () => {
    const socket = createMockSocket({ role: 'admin' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:update', { payload: { company_id: 'C01', updateData: { name: 'New' } } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:deleteOne', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:deleteOne', { payload: { company_id: 'C01' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:deleteMany', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:deleteMany', { payload: { company_ids: ['C01'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:restoreOne', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:restoreOne', { payload: { company_id: 'C01' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:restoreMany', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:restoreMany', { payload: { company_ids: ['C01'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:getDeleted', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:getDeleted', { payload: {} }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:hardDeleteOne', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:hardDeleteOne', { payload: { company_id: 'C01' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:hardDeleteMany', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:hardDeleteMany', { payload: { company_ids: ['C01'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:previewSoftDelete', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:previewSoftDelete', { payload: { company_ids: ['C01'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:previewHardDelete', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:previewHardDelete', { payload: { company_ids: ['C01'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:previewImport throws', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:previewImport', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: false }));
  });

  test('company:license:add', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:license:add', { payload: { company_id: 'C01', licenseData: { type: 'A' } } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:license:update', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:license:update', { payload: { company_id: 'C01', license_id: 'L1', updateData: {} } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:license:deleteOne', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:license:deleteOne', { payload: { company_id: 'C01', license_id: 'L1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:license:get', async () => {
    const socket = createMockSocket();
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:license:get', { payload: { company_id: 'C01', license_id: 'L1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('company:license:deleteMany', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerCompanyHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'company:license:deleteMany', { payload: { company_id: 'C01', license_ids: ['L1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('summarySocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('summary:getRecord returns cached data', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    cacheManager.get.mockResolvedValueOnce({ cached: true });
    registerSummaryHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'summary:getRecord', { periodKeyStart: 202401, periodKeyEnd: 202412 }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true, data: { cached: true } }));
  });

  test('summary:getRecord fetches and caches', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSummaryHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'summary:getRecord', { periodKeyStart: 202401, periodKeyEnd: 202412, include: [1, 2] }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
    expect(cacheManager.set).toHaveBeenCalled();
  });

  test('summary:getRecord validation error', async () => {
    const socket = createMockSocket();
    registerSummaryHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'summary:getRecord', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: false }));
  });

  test('summary:getByPeriodKey', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSummaryHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'summary:getByPeriodKey', { periodKeyStart: 202401, periodKeyEnd: 202412 }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('solutionSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('solution:getAll', async () => {
    const socket = createMockSocket();
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:getAll', { payload: { group_solution: 'A', search: 'test', tags: ['t1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:getAll without tags', async () => {
    const socket = createMockSocket();
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:getAll', { payload: {} }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:getById', async () => {
    const socket = createMockSocket();
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:getById', { payload: { solutionId: 'S1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:create', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:create', { payload: { name: 'Test' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:update', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:update', { payload: { solutionId: 'S1', name: 'New' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:deleteOne', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:deleteOne', { payload: { solutionId: 'S1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('solution:deleteMany', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerSolutionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'solution:deleteMany', { payload: { solutionIds: ['S1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('userSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('user:create', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:create', { payload: { userData: { email: 'test@test.com' } } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:update', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:update', { payload: { user_id: 'U1', updateData: {} } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:deleteOne', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:deleteOne', { payload: { user_id: 'U1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:deleteMany', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:deleteMany', { payload: { user_ids: ['U1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:getByRole', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:getByRole', { payload: { role: 'company' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:getById', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:getById', { payload: { user_id: 'U1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:restoreOne', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:restoreOne', { payload: { user_id: 'U1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:restoreMany', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:restoreMany', { payload: { user_ids: ['U1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:profile:update', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:profile:update', { payload: { updateData: {} } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:profile:verifyEmailOtp', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:profile:verifyEmailOtp', { payload: { otp: '123456' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:getDeletedByRole', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:getDeletedByRole', { payload: { role: 'company' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:hardDeleteOne', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:hardDeleteOne', { payload: { user_id: 'U1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:hardDeleteMany', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:hardDeleteMany', { payload: { user_ids: ['U1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:previewSoftDelete', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:previewSoftDelete', { payload: { user_ids: ['U1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('user:previewHardDelete', async () => {
    const socket = createMockSocket();
    registerUserHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'user:previewHardDelete', { payload: { user_ids: ['U1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('errorLogSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('errorLog:getAll', async () => {
    const socket = createMockSocket();
    registerErrorLogHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'errorLog:getAll', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('errorLog:create', async () => {
    const socket = createMockSocket();
    registerErrorLogHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'errorLog:create', { payload: { title: 'Bug' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('errorLog:updateStatus', async () => {
    const socket = createMockSocket();
    registerErrorLogHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'errorLog:updateStatus', { payload: { id: 'EL1', status: 'fixed' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('errorLog:delete', async () => {
    const socket = createMockSocket();
    registerErrorLogHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'errorLog:delete', { payload: { id: 'EL1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('regulationSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('regulation:getAll', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:getAll', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('regulation:getById', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:getById', { payload: { regulationId: 'R1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('regulation:create', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:create', { payload: { name: 'Rule' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('regulation:update', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:update', { payload: { regulationId: 'R1', name: 'New' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('regulation:deleteOne', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:deleteOne', { payload: { regulationId: 'R1' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('regulation:deleteMany', async () => {
    const socket = createMockSocket();
    registerRegulationHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'regulation:deleteMany', { payload: { regulationIds: ['R1'] } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});

describe('emissionSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('emission:getData returns cached', async () => {
    const socket = createMockSocket();
    cacheManager.get.mockResolvedValueOnce({ cached: true });
    registerEmissionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'emission:getData', { periodKeyStart: 202401, periodKeyEnd: 202412 }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true, data: { cached: true } }));
  });

  test('emission:getData fetches and caches', async () => {
    const socket = createMockSocket();
    registerEmissionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'emission:getData', { periodKeyStart: 202401, periodKeyEnd: 202412, company_id: 'C01', zone_id: 'Z01' }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
    expect(cacheManager.set).toHaveBeenCalled();
  });

  test('emission:getData validation error', async () => {
    const socket = createMockSocket();
    registerEmissionHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'emission:getData', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: false }));
  });
});

describe('hashtagSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hashtag:getAll', async () => {
    const socket = createMockSocket();
    registerHashtagHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'hashtag:getAll', {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });

  test('hashtag:create', async () => {
    const socket = createMockSocket({ user_id: 'U1' });
    registerHashtagHandlers(socket);
    const cb = jest.fn();
    await invokeHandler(socket, 'hashtag:create', { payload: { name: 'tag' } }, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true }));
  });
});
