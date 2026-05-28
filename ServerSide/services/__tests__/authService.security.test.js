const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../../dataAccess/userRepository');
const cacheManager = require('../../lib/cacheManager');
const { getIo } = require('../../config/socket');
const { sendMail } = require('../../config/email');
const { generateOtp } = require('../../utils/random');
const { generateCsrfToken } = require('../../middleware/csrf');
const { hashPassword, verifyPassword, needsRehash } = require('../../utils/passwordHasher');
const { JWT_VERIFY_OPTIONS } = require('../../utils/jwtOptions');

const mockRandomBytes = jest.fn();

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: (...args) => mockRandomBytes(...args),
}));

jest.mock('../../dataAccess/userRepository', () => ({
  findByEmail: jest.fn(),
  updateUserPassword: jest.fn(),
  updateUserResetToken: jest.fn(),
  findByResetToken: jest.fn(),
  findByUserId: jest.fn(),
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  hkeys: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  multi: jest.fn(),
}));

jest.mock('../../config/socket', () => ({
  getIo: jest.fn(),
}));

jest.mock('../../config/email', () => ({
  sendMail: jest.fn(),
}));

jest.mock('../../utils/random', () => ({
  generateOtp: jest.fn(),
}));

jest.mock('../../middleware/csrf', () => ({
  generateCsrfToken: jest.fn(),
}));

jest.mock('../../utils/sessionManager', () => ({
  clearSession: jest.fn(),
  invalidateAllUserSessions: jest.fn(),
}));

jest.mock('../../utils/passwordHasher', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  needsRehash: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'https://client.hepza.test';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

const {
  loginUser,
  refreshTokenFunc,
  requestPasswordReset,
  initiateResetPassword,
} = require('../authService');

describe('authService security flows', () => {
  let mockMulti;

  beforeEach(() => {
    jest.resetAllMocks();

    mockMulti = {
      hdel: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      hset: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    cacheManager.multi.mockReturnValue(mockMulti);
    cacheManager.set.mockResolvedValue();
    cacheManager.del.mockResolvedValue();
    cacheManager.hset.mockResolvedValue();
    cacheManager.hkeys.mockResolvedValue([]);
    getIo.mockReturnValue({
      to: jest.fn(() => ({ emit: jest.fn() })),
    });
    generateCsrfToken.mockReturnValue('csrf-token');
    generateOtp.mockReturnValue('123456');
    verifyPassword.mockResolvedValue(true);
    needsRehash.mockReturnValue(false);
    hashPassword.mockResolvedValue('hashed-password');
    sendMail.mockResolvedValue();
    jwt.sign.mockReturnValue('signed-jwt');
    jwt.verify.mockReturnValue({ token: 'reset-token' });
    mockRandomBytes.mockImplementation((size) => Buffer.alloc(size, 97));
  });

  test('loginUser signs HS256 access tokens and persists the session', async () => {
    userRepository.findByEmail.mockResolvedValue({
      user_id: 'U001',
      zone_id: 'Z001',
      company_id: 'C001',
      full_name: 'Test User',
      role: 'company',
      email: 'user@hepza.test',
      phone_number: '0900000000',
      firstLogin: false,
      password: 'hashed-password',
    });
    cacheManager.get.mockResolvedValueOnce(null);

    const result = await loginUser(
      { email: 'USER@HEPZA.TEST', password: 'Password123!' },
      { ip: '127.0.0.1' }
    );

    expect(userRepository.findByEmail).toHaveBeenCalledWith('user@hepza.test');
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'U001',
        role: 'company',
        email: 'user@hepza.test',
      }),
      'test-secret',
      expect.objectContaining({
        expiresIn: '15m',
        algorithm: 'HS256',
      })
    );
    expect(cacheManager.hset).toHaveBeenCalledWith(
      'session:U001',
      expect.any(String),
      expect.objectContaining({
        authToken: 'signed-jwt',
        user_id: 'U001',
        email: 'user@hepza.test',
      }),
      4 * 60 * 60
    );
    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:/),
      'U001',
      4 * 60 * 60
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'signed-jwt',
        csrfToken: 'csrf-token',
        user: expect.objectContaining({ user_id: 'U001' }),
      })
    );
  });

  test('loginUser requires OTP after repeated failed attempts and sends one when missing', async () => {
    userRepository.findByEmail.mockResolvedValue({
      user_id: 'U001',
      full_name: 'Test User',
      email: 'user@hepza.test',
      password: 'hashed-password',
    });
    cacheManager.get
      .mockResolvedValueOnce('5')
      .mockResolvedValueOnce(null);

    await expect(
      loginUser(
        { email: 'user@hepza.test', password: 'Password123!' },
        { ip: '127.0.0.1' }
      )
    ).rejects.toMatchObject({
      message:
        'Tài khoản bị hạn chế do nhập sai nhiều lần. Vui lòng nhập mã OTP đã gửi đến email để tiếp tục.',
      otpRequired: true,
    });

    expect(generateOtp).toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledWith('otp:login:user@hepza.test', '123456', 600);
    expect(sendMail).toHaveBeenCalled();
  });

  test('refreshTokenFunc rotates refresh tokens with HS256 signing', async () => {
    cacheManager.get.mockResolvedValueOnce('U001');
    cacheManager.hget.mockResolvedValue({
      role: 'company',
      email: 'user@hepza.test',
      phone_number: '0900000000',
      full_name: 'Test User',
      zone_id: 'Z001',
      company_id: 'C001',
      firstLogin: false,
      expiresAt: Date.now() + 60_000,
    });

    const result = await refreshTokenFunc('old-refresh-token', { headers: {} });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'U001',
        role: 'company',
        email: 'user@hepza.test',
      }),
      'test-secret',
      expect.objectContaining({
        expiresIn: '15m',
        algorithm: 'HS256',
      })
    );
    expect(mockMulti.hdel).toHaveBeenCalledWith('session:U001', 'old-refresh-token');
    expect(mockMulti.del).toHaveBeenCalledWith('refresh:old-refresh-token');
    expect(mockMulti.hset).toHaveBeenCalledWith(
      'session:U001',
      expect.any(String),
      expect.any(String)
    );

    const persistedSession = JSON.parse(mockMulti.hset.mock.calls[0][2]);
    expect(persistedSession.authToken).toBe('signed-jwt');
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'signed-jwt',
        newCsrfToken: 'csrf-token',
      })
    );
  });

  test('refreshTokenFunc returns raceCondition for recently reused refresh tokens', async () => {
    cacheManager.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('U001');

    await expect(refreshTokenFunc('used-refresh-token', { headers: {} })).resolves.toEqual({
      raceCondition: true,
    });
  });

  test('requestPasswordReset signs the reset token with HS256 and sends email', async () => {
    userRepository.findByEmail.mockResolvedValue({
      user_id: 'U001',
      full_name: 'Test User',
      email: 'user@hepza.test',
    });
    userRepository.updateUserResetToken.mockResolvedValue();

    const result = await requestPasswordReset(' USER@HEPZA.TEST ');

    expect(userRepository.updateUserResetToken).toHaveBeenCalledWith(
      'user@hepza.test',
      expect.objectContaining({
        resetToken: expect.any(String),
        updated_by: 'U001',
      })
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
      }),
      'test-secret',
      expect.objectContaining({
        expiresIn: '1h',
        algorithm: 'HS256',
      })
    );
    expect(sendMail).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Password reset link sent to email' });
  });

  test('initiateResetPassword verifies JWTs with the allowlist', async () => {
    const result = await initiateResetPassword('reset-jwt');

    expect(jwt.verify).toHaveBeenCalledWith('reset-jwt', 'test-secret', JWT_VERIFY_OPTIONS);
    expect(result).toEqual({ resetToken: 'reset-token' });
  });
});
