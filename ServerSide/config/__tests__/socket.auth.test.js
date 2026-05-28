const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const cacheManager = require('../../lib/cacheManager');
const { JWT_VERIFY_OPTIONS } = require('../../utils/jwtOptions');
const {
  markSocketAuthFailure,
} = require('../../monitoring/metrics');

const mockIo = {
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  in: jest.fn(() => ({ fetchSockets: jest.fn().mockResolvedValue([]) })),
};

const mockServer = jest.fn(() => mockIo);
const mockPubClient = {
  removeAllListeners: jest.fn(),
  on: jest.fn(),
  subscribe: jest.fn().mockResolvedValue(),
};

jest.mock('socket.io', () => ({
  Server: function (...args) {
    return mockServer(...args);
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../models/userModel', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../config/redis', () => ({
  pubClient: mockPubClient,
}));

jest.mock('../../socketHandlers/symbiosisSocketHandler', () => ({
  registerSymbiosisHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/companySocketHandler', () => ({
  registerCompanyHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/userSocketHandler', () => ({
  registerUserHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/zoneSocketHandler', () => ({
  registerZoneHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/industrySocketHandler', () => ({
  registerIndustryHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/resourceWasteSocketHandler', () => ({
  registerResourceWasteHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/notificationSocketHandler', () => ({
  registerNotificationHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/regulationSocketHandler', () => ({
  registerRegulationHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/solutionSocketHandler', () => ({
  registerSolutionHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/summarySocketHandler', () => ({
  registerSummaryHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/emissionSocketHandler', () => ({
  registerEmissionHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/exportSocketHandler', () => ({
  registerExportHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/hashtagSocketHandler', () => ({
  registerHashtagHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/errorLogSocketHandler', () => ({
  registerErrorLogHandlers: jest.fn(),
}));
jest.mock('../../socketHandlers/enterpriseListSocketHandler', () => ({
  registerEnterpriseListHandlers: jest.fn(),
}));

jest.mock('../../utils/onlineTracker', () => ({
  addOnlineUser: jest.fn(),
  removeOnlineUser: jest.fn(),
  broadcastCounts: jest.fn(),
}));

jest.mock('../../monitoring/metrics', () => ({
  markSocketAuthFailure: jest.fn(),
  trackSocketConnection: jest.fn(),
  trackSocketDisconnection: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.ORIGIN = 'http://localhost:3000';

const { initSocket, getIo } = require('../socket');

describe('socket auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPubClient.subscribe.mockResolvedValue();
  });

  test('rejects socket connections without auth cookies', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: {} },
      emit: jest.fn(),
    };
    const next = jest.fn();

    await authMiddleware(socket, next);

    expect(markSocketAuthFailure).toHaveBeenCalledWith('missing_token');
    expect(socket.emit).toHaveBeenCalledWith('error', 'Bạn chưa đăng nhập');
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('rejects socket connections with blacklisted tokens', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'authToken=blocked-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(true);

    await authMiddleware(socket, next);

    expect(markSocketAuthFailure).toHaveBeenCalledWith('blacklisted_token');
    expect(socket.emit).toHaveBeenCalledWith('error', 'Phiên đăng nhập đã bị thu hồi');
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('accepts valid auth cookies and verifies JWTs with the allowlist', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'authToken=valid-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();
    const user = {
      user_id: 'U001',
      role: 'company',
      email: 'company@hepza.test',
      company_id: 'C001',
    };

    cacheManager.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    cacheManager.set.mockResolvedValue();
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    });
    jwt.verify.mockReturnValue({
      user_id: 'U001',
      role: 'company',
      email: 'company@hepza.test',
    });

    await authMiddleware(socket, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret', JWT_VERIFY_OPTIONS);
    expect(User.findOne).toHaveBeenCalledWith({ user_id: 'U001', deleted_at: null });
    expect(cacheManager.set).toHaveBeenCalledWith('user:U001', user, 15 * 60);
    expect(socket.user).toEqual(expect.objectContaining({ user_id: 'U001', role: 'company' }));
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects expired JWT tokens', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'authToken=expired-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null);
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => { throw err; });

    await authMiddleware(socket, next);

    expect(markSocketAuthFailure).toHaveBeenCalledWith('token_expired');
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('rejects invalid JWT tokens', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'authToken=bad-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null);
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });

    await authMiddleware(socket, next);

    expect(markSocketAuthFailure).toHaveBeenCalledWith('invalid_token');
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('rejects when user not found in database', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'authToken=valid-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    jwt.verify.mockReturnValue({ user_id: 'U999' });

    await authMiddleware(socket, next);

    expect(markSocketAuthFailure).toHaveBeenCalledWith('user_not_found');
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('uses cached user when available', async () => {
    initSocket({});
    const authMiddleware = mockIo.use.mock.calls[0][0];
    const user = { user_id: 'U001', role: 'admin' };
    const socket = {
      handshake: { headers: { cookie: 'authToken=valid-token' } },
      emit: jest.fn(),
    };
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    jwt.verify.mockReturnValue({ user_id: 'U001' });

    await authMiddleware(socket, next);

    expect(User.findOne).not.toHaveBeenCalled();
    expect(socket.userDetails).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });

  test('CORS allows configured origin', () => {
    initSocket({});
    const corsConfig = mockServer.mock.calls[0][1].cors;
    const cb = jest.fn();
    corsConfig.origin('http://localhost:3000', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('CORS denies unknown origin', () => {
    initSocket({});
    const corsConfig = mockServer.mock.calls[0][1].cors;
    const cb = jest.fn();
    corsConfig.origin('http://evil.com', cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test('CORS allows null origin', () => {
    initSocket({});
    const corsConfig = mockServer.mock.calls[0][1].cors;
    const cb = jest.fn();
    corsConfig.origin(null, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('connection handler joins admin room', async () => {
    initSocket({});
    const connectionHandler = mockIo.on.mock.calls[0][1];
    const socket = {
      id: 'S1',
      user: { user_id: 'U001', role: 'admin' },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    await connectionHandler(socket);
    expect(socket.join).toHaveBeenCalledWith('role:admin');
  });

  test('connection handler joins manager zone room', async () => {
    initSocket({});
    const connectionHandler = mockIo.on.mock.calls[0][1];
    const socket = {
      id: 'S1',
      user: { user_id: 'U001', role: 'manager', zone_id: 'Z01' },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    await connectionHandler(socket);
    expect(socket.join).toHaveBeenCalledWith('zone:Z01:managers');
  });

  test('connection handler joins company room', async () => {
    initSocket({});
    const connectionHandler = mockIo.on.mock.calls[0][1];
    const socket = {
      id: 'S1',
      user: { user_id: 'U001', role: 'company', company_id: 'C01' },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    await connectionHandler(socket);
    expect(socket.join).toHaveBeenCalledWith('company:C01:users');
  });

  test('connection handler handles join event', async () => {
    initSocket({});
    const connectionHandler = mockIo.on.mock.calls[0][1];
    const socket = {
      id: 'S1',
      user: { user_id: 'U001' },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    await connectionHandler(socket);

    const joinHandler = socket.on.mock.calls.find(c => c[0] === 'join')[1];
    joinHandler('U001');
    expect(socket.join).toHaveBeenCalledWith('user:U001');
  });

  test('connection handler rejects invalid join', async () => {
    initSocket({});
    const connectionHandler = mockIo.on.mock.calls[0][1];
    const socket = {
      id: 'S1',
      user: { user_id: 'U001' },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    await connectionHandler(socket);

    const joinHandler = socket.on.mock.calls.find(c => c[0] === 'join')[1];
    joinHandler('U999');
    expect(socket.emit).toHaveBeenCalledWith('error', 'Invalid user_id');
  });

  test('getIo returns io instance', () => {
    initSocket({});
    expect(getIo()).toBeDefined();
  });
});
