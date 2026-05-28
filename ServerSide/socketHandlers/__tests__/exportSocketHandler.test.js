jest.mock('../../services/exportService', () => ({
  checkExportPermission: jest.fn(),
  saveExportHistory: jest.fn(),
}));

jest.mock('../../services/exportHistoryService', () => ({
  getExportHistoriesByUserId: jest.fn(),
  getExportHistoryByExportIdForUser: jest.fn(),
  deleteExportHistory: jest.fn(),
  updateExportHistoryStatus: jest.fn(),
}));

jest.mock('../../services/exportJobService', () => ({
  enqueueExportJob: jest.fn(),
}));

const events = require('../eventCatalog');
const exportService = require('../../services/exportService');
const historyService = require('../../services/exportHistoryService');
const jobService = require('../../services/exportJobService');
const { registerExportHandlers } = require('../exportSocketHandler');

const makeSocket = () => {
  const handlers = {};
  return {
    socket: {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      emit: jest.fn(),
      userDetails: { user_id: 'USR001', zone_id: 'Z001', role: 'admin', full_name: 'Admin' },
    },
    handlers,
  };
};

describe('exportSocketHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerExportHandlers(socket);

    events.export.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });

  test('export:init creates queued history and enqueues background job', async () => {
    const { socket, handlers } = makeSocket();
    const cb = jest.fn();
    exportService.checkExportPermission.mockResolvedValue(['C001']);
    exportService.saveExportHistory.mockResolvedValue({ export_id: 'EX001', name: 'file.xlsx' });
    registerExportHandlers(socket);

    await handlers['export:init']({ company_ids: ['C001'], periodKeyStart: 202501, periodKeyEnd: 202512, include: [2], option: 1 }, cb);

    expect(exportService.saveExportHistory).toHaveBeenCalledWith(expect.objectContaining({
      status: 'queued',
      processed_records: 0,
      total_records: 0,
      progress: 0,
    }));
    expect(jobService.enqueueExportJob).toHaveBeenCalledWith(expect.objectContaining({ export_id: 'EX001' }));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      isSuccess: true,
      data: expect.objectContaining({ export_id: 'EX001', status: 'queued', name: 'file.xlsx' }),
    }));
  });

  test('export:getStatus returns current user export history', async () => {
    const { socket, handlers } = makeSocket();
    const cb = jest.fn();
    historyService.getExportHistoryByExportIdForUser.mockResolvedValue({ export_id: 'EX001', status: 'processing' });
    registerExportHandlers(socket);

    await handlers['export:getStatus']({ export_id: 'EX001' }, cb);

    expect(historyService.getExportHistoryByExportIdForUser).toHaveBeenCalledWith('EX001', 'USR001');
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      isSuccess: true,
      data: expect.objectContaining({ export_id: 'EX001', status: 'processing' }),
    }));
  });

  test('export:getStatus returns 404 error ack when history is missing', async () => {
    const { socket, handlers } = makeSocket();
    const cb = jest.fn();
    historyService.getExportHistoryByExportIdForUser.mockResolvedValue(null);
    registerExportHandlers(socket);

    await handlers['export:getStatus']({ export_id: 'EX404' }, cb);

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      isSuccess: false,
      error: 'Không tìm thấy lịch sử xuất dữ liệu.',
      meta: expect.objectContaining({ statusCode: 404 }),
    }));
  });
});
