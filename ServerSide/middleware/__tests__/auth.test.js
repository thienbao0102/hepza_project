const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const Company = require('../../models/companyModel');
const cacheManager = require('../../lib/cacheManager');
const { JWT_VERIFY_OPTIONS } = require('../../utils/jwtOptions');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../models/userModel', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/companyModel', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const {
  authenticate,
  authorize,
  checkFirstLogin,
  checkAccessByRole,
} = require('../auth');

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createResponse = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('authenticate rejects when auth cookie is missing', async () => {
    const req = { cookies: {} };
    const res = createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bạn chưa đăng nhập' });
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate rejects blacklisted tokens', async () => {
    const req = { cookies: { authToken: 'blacklisted-token' } };
    const res = createResponse();
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(true);

    await authenticate(req, res, next);

    expect(cacheManager.get).toHaveBeenCalledWith('blacklist:blacklisted-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Phiên đăng nhập đã bị thu hồi' });
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate verifies JWT with allowlist and loads user into cache on cache miss', async () => {
    const req = { cookies: { authToken: 'valid-token' } };
    const res = createResponse();
    const next = jest.fn();
    const user = {
      user_id: 'U001',
      role: 'company',
      email: 'company@hepza.test',
      firstLogin: false,
      company_id: 'C001',
    };

    cacheManager.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    cacheManager.set.mockResolvedValue();
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    });
    jwt.verify.mockImplementation((token, secret, options, callback) => {
      callback(null, { user_id: 'U001', role: 'company', email: 'company@hepza.test' });
    });

    await authenticate(req, res, next);
    await flushPromises();

    expect(jwt.verify).toHaveBeenCalledWith(
      'valid-token',
      'test-secret',
      JWT_VERIFY_OPTIONS,
      expect.any(Function)
    );
    expect(User.findOne).toHaveBeenCalledWith({ user_id: 'U001', deleted_at: null });
    expect(cacheManager.set).toHaveBeenCalledWith('user:U001', user, 15 * 60);
    expect(req.user).toEqual(expect.objectContaining({ user_id: 'U001', role: 'company' }));
    expect(req.userDetails).toEqual(user);
    expect(next).toHaveBeenCalled();
  });

  test('authenticate returns EXPIRED code for expired JWTs', async () => {
    const req = { cookies: { authToken: 'expired-token' } };
    const res = createResponse();
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null);
    jwt.verify.mockImplementation((token, secret, options, callback) => {
      callback({ name: 'TokenExpiredError' });
    });

    await authenticate(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'EXPIRED',
      message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
    });
  });

  test('authorize rejects users outside the allowed role list', () => {
    const middleware = authorize(['admin']);
    const req = { user: { role: 'company' } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('checkFirstLogin blocks access until password change', () => {
    const req = {
      path: '/dashboard',
      userDetails: { firstLogin: true },
    };
    const res = createResponse();
    const next = jest.fn();

    checkFirstLogin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Vui lòng đổi mật khẩu trước khi tiếp tục',
      firstLogin: true,
    });
  });

  test('checkAccessByRole allows GET requests without company scoping', async () => {
    const req = {
      method: 'GET',
      params: {},
      body: {},
      query: {},
      userDetails: { role: 'manager', zone_id: 'Z001' },
    };
    const res = createResponse();
    const next = jest.fn();

    await checkAccessByRole(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(Company.findOne).not.toHaveBeenCalled();
  });

  test('checkAccessByRole rejects company users accessing other companies', async () => {
    const req = {
      method: 'POST',
      params: { company_id: 'C999' },
      body: {},
      query: {},
      userDetails: { role: 'company', company_id: 'C001' },
    };
    const res = createResponse();
    const next = jest.fn();

    await checkAccessByRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bạn không được phép truy cập doanh nghiệp khác',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('authorize allows access when user role is in the allowed list', () => {
    const middleware = authorize(['admin', 'manager']);
    const req = { user: { role: 'manager' } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('authorize allows access for multiple valid roles', () => {
    const middleware = authorize(['company']);
    const req = { user: { role: 'company' } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('checkFirstLogin allows access when firstLogin is false', () => {
    const req = {
      path: '/dashboard',
      userDetails: { firstLogin: false },
    };
    const res = createResponse();
    const next = jest.fn();

    checkFirstLogin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('checkFirstLogin allows access to /change-password even when firstLogin is true', () => {
    const req = {
      path: '/change-password',
      userDetails: { firstLogin: true },
    };
    const res = createResponse();
    const next = jest.fn();

    checkFirstLogin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('checkAccessByRole allows manager when company is in their zone', async () => {
    const req = {
      method: 'POST',
      params: { company_id: 'C001' },
      body: {},
      query: {},
      userDetails: { role: 'manager', zone_id: 'Z001' },
    };
    const res = createResponse();
    const next = jest.fn();

    Company.findOne.mockResolvedValue({ company_id: 'C001', zone_id: 'Z001' });

    await checkAccessByRole(req, res, next);

    expect(Company.findOne).toHaveBeenCalledWith({ company_id: 'C001', deleted_at: null });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('checkAccessByRole rejects manager when company is in a different zone', async () => {
    const req = {
      method: 'POST',
      params: { company_id: 'C002' },
      body: {},
      query: {},
      userDetails: { role: 'manager', zone_id: 'Z001' },
    };
    const res = createResponse();
    const next = jest.fn();

    Company.findOne.mockResolvedValue({ company_id: 'C002', zone_id: 'Z002' });

    await checkAccessByRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Doanh nghiệp này không thuộc khu vực bạn quản lý',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate rejects with INVALID for generic JWT verification error', async () => {
    const req = { cookies: { authToken: 'invalid-token' } };
    const res = createResponse();
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null);
    jwt.verify.mockImplementation((token, secret, options, callback) => {
      callback(new Error('invalid signature'));
    });

    await authenticate(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID',
      message: 'Phiên đăng nhập không hợp lệ',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate loads user from cache hit without querying the database', async () => {
    const req = { cookies: { authToken: 'valid-token' } };
    const res = createResponse();
    const next = jest.fn();
    const cachedUser = {
      user_id: 'U002',
      role: 'admin',
      email: 'admin@hepza.test',
      firstLogin: false,
    };

    cacheManager.get.mockResolvedValueOnce(null).mockResolvedValueOnce(cachedUser);
    jwt.verify.mockImplementation((token, secret, options, callback) => {
      callback(null, { user_id: 'U002', role: 'admin', email: 'admin@hepza.test' });
    });

    await authenticate(req, res, next);
    await flushPromises();

    expect(cacheManager.get).toHaveBeenCalledWith('user:U002');
    expect(User.findOne).not.toHaveBeenCalled();
    expect(req.userDetails).toEqual(cachedUser);
    expect(next).toHaveBeenCalled();
  });

  test('authenticate rejects when user is not found in the database', async () => {
    const req = { cookies: { authToken: 'orphan-token' } };
    const res = createResponse();
    const next = jest.fn();

    cacheManager.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    jwt.verify.mockImplementation((token, secret, options, callback) => {
      callback(null, { user_id: 'U999', role: 'company', email: 'orphan@hepza.test' });
    });

    await authenticate(req, res, next);
    await flushPromises();

    expect(User.findOne).toHaveBeenCalledWith({ user_id: 'U999', deleted_at: null });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Tài khoản không tồn tại' });
    expect(next).not.toHaveBeenCalled();
  });
});
