jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn((size) => Buffer.alloc(size, 0xAB)),
    createCipheriv: jest.fn(() => ({
      update: jest.fn(() => Buffer.from('encdata')),
      final: jest.fn(() => Buffer.from('')),
    })),
    createDecipheriv: jest.fn(() => ({
      update: jest.fn(() => Buffer.from('oldpassword')),
      final: jest.fn(() => Buffer.from('')),
    })),
  };
});

jest.mock('../../dataAccess/userRepository', () => ({
  findByEmail: jest.fn(),
  findByUserId: jest.fn(),
  updateUserPassword: jest.fn(),
  updateUserResetToken: jest.fn(),
  findByResetToken: jest.fn(),
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hkeys: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  multi: jest.fn(),
}));

jest.mock('../../config/socket', () => ({
  getIo: jest.fn(),
}));

jest.mock('../../config/email', () => ({
  sendMail: jest.fn(),
}));

jest.mock('../../utils/emailTemplates', () => ({
  getLoginOtpTemplate: jest.fn(() => '<html>otp</html>'),
  getSessionTerminatedTemplate: jest.fn(() => '<html>session</html>'),
  getPasswordResetTemplate: jest.fn(() => '<html>reset</html>'),
}));

jest.mock('../../utils/random', () => ({
  generateOtp: jest.fn(() => '123456'),
}));

jest.mock('../../middleware/csrf', () => ({
  generateCsrfToken: jest.fn(() => 'csrf-token-123'),
}));

jest.mock('../../utils/sessionManager', () => ({
  clearSession: jest.fn().mockResolvedValue({ message: 'Logout successful' }),
  invalidateAllUserSessions: jest.fn().mockResolvedValue(),
}));

jest.mock('../../utils/passwordHasher', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn(),
  needsRehash: jest.fn(),
}));

jest.mock('../../utils/jwtOptions', () => ({
  JWT_VERIFY_OPTIONS: { algorithms: ['HS256'] },
  buildJwtSignOptions: jest.fn((opts) => ({ ...opts, algorithm: 'HS256' })),
}));

const jwt = require('jsonwebtoken');
const userRepository = require('../../dataAccess/userRepository');
const cacheManager = require('../../lib/cacheManager');
const { getIo } = require('../../config/socket');
const { sendMail } = require('../../config/email');
const { verifyPassword, hashPassword, needsRehash } = require('../../utils/passwordHasher');
const { invalidateAllUserSessions, clearSession } = require('../../utils/sessionManager');

const {
  loginUser,
  verifyLoginOtp,
  resendLoginOtp,
  changePassword,
  requestPasswordReset,
  resetPassword,
  logoutUser,
  initiateResetPassword,
  refreshTokenFunc,
} = require('../authService');

describe('authService', () => {
  const mockUser = {
    user_id: 'U001',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    zone_id: 'Z01',
    company_id: 'C01',
    phone_number: '0900000000',
    firstLogin: false,
    password: 'hashed-old',
  };

  const mockIo = () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const fetchSockets = jest.fn().mockResolvedValue([]);
    const inFn = jest.fn(() => ({ fetchSockets }));
    return { to, emit, in: inFn, fetchSockets };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyPassword.mockImplementation((plain) => plain === 'oldpass' || plain === 'oldpassword');
    process.env.JWT_SECRET = 'test-secret-key-12345678901234567890';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.CLIENT_URL = 'http://localhost:5173';
  });

  describe('loginUser', () => {
    test('rejects missing email or password', async () => {
      await expect(loginUser({ email: '', password: '' }, { ip: '1.1.1.1' }))
        .rejects.toThrow('Email và mật khẩu là bắt buộc');
    });

    test('rejects invalid email format', async () => {
      await expect(loginUser({ email: 'bad', password: 'pass' }, { ip: '1.1.1.1' }))
        .rejects.toThrow('Email không hợp lệ');
    });

    test('rejects when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' }))
        .rejects.toThrow('Thông tin đăng nhập không chính xác');
    });

    test('rejects when user email is invalid', async () => {
      userRepository.findByEmail.mockResolvedValue({ ...mockUser, email: null });
      await expect(loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' }))
        .rejects.toThrow('User email is invalid');
    });

    test('requires OTP when failCount >= 5 and no OTP', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '5';
        if (key.startsWith('otp:login:')) return null;
        return null;
      });
      sendMail.mockResolvedValue();

      const error = await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' }).catch(e => e);
      expect(error.otpRequired).toBe(true);
      expect(sendMail).toHaveBeenCalled();
    });

    test('uses existing OTP if already sent when failCount >= 5', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '5';
        if (key.startsWith('otp:login:')) return '123456';
        return null;
      });

      const error = await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' }).catch(e => e);
      expect(error.otpRequired).toBe(true);
      expect(sendMail).not.toHaveBeenCalled();
    });

    test('sends OTP on exactly 5th failed attempt', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '4';
        return null;
      });
      sendMail.mockResolvedValue();

      const error = await loginUser({ email: 'test@example.com', password: 'wrong' }, { ip: '1.1.1.1' }).catch(e => e);
      expect(error.otpRequired).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringContaining('login:fail:'), 5, 3600);
      expect(sendMail).toHaveBeenCalled();
    });

    test('shows remaining attempts when >5 fails', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '6';
        if (key.startsWith('otp:login:')) return '123456';
        return null;
      });

      const error = await loginUser({ email: 'test@example.com', password: 'wrong', otp: '123456' }, { ip: '1.1.1.1' }).catch(e => e);
      expect(error.otpRequired).toBe(true);
      expect(error.message).toContain('còn');
    });

    test('rejects wrong password with generic message when <5 fails', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);
      cacheManager.get.mockResolvedValue(null);

      await expect(loginUser({ email: 'test@example.com', password: 'wrong' }, { ip: '1.1.1.1' }))
        .rejects.toThrow('Thông tin đăng nhập không chính xác');
    });

    test('successful login returns tokens and user', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(false);
      cacheManager.get.mockResolvedValue(null);
      cacheManager.hkeys.mockResolvedValue([]);
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      const io = mockIo();
      getIo.mockReturnValue(io);

      const result = await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.csrfToken).toBe('csrf-token-123');
      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining('login:fail:'));
    });

    test('rehashes password if needed on login', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(true);
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.get.mockResolvedValue(null);
      cacheManager.hkeys.mockResolvedValue([]);
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(userRepository.updateUserPassword).toHaveBeenCalledWith('U001', expect.objectContaining({ password: 'new-hashed' }));
    });

    test('handles firstLogin encryption', async () => {
      const firstLoginUser = { ...mockUser, firstLogin: true };
      userRepository.findByEmail.mockResolvedValue(firstLoginUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(false);
      cacheManager.get.mockResolvedValue(null);
      cacheManager.hkeys.mockResolvedValue([]);
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      const result = await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(result.user.firstLogin).toBe(true);
      expect(cacheManager.hset).toHaveBeenCalled();
      const sessionArg = cacheManager.hset.mock.calls[0][2];
      expect(sessionArg.currentPassword).toBeDefined();
      expect(sessionArg.iv).toBeDefined();
    });

    test('invalidates old sessions and sends email on concurrent login', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(false);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('email:notify:')) return null;
        return null;
      });
      cacheManager.hkeys.mockResolvedValue(['old-refresh-token']);
      cacheManager.hget.mockResolvedValue({ authToken: 'old-auth-token' });
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      const io = mockIo();
      getIo.mockReturnValue(io);
      sendMail.mockResolvedValue();

      await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(cacheManager.set).toHaveBeenCalledWith('blacklist:old-auth-token', true, 15 * 60);
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringContaining('Cảnh báo') }));
    });

    test('skips notify email if already sent within hour', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(false);
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('email:notify:')) return true;
        return null;
      });
      cacheManager.hkeys.mockResolvedValue(['old-token']);
      cacheManager.hget.mockResolvedValue({ authToken: 'old-token' });
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(sendMail).not.toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringContaining('Cảnh báo') }));
    });

    test('survives getIo failure', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      needsRehash.mockReturnValue(false);
      cacheManager.get.mockResolvedValue(null);
      cacheManager.hkeys.mockResolvedValue([]);
      cacheManager.hset.mockResolvedValue();
      cacheManager.set.mockResolvedValue();
      getIo.mockImplementation(() => { throw new Error('no io'); });

      const result = await loginUser({ email: 'test@example.com', password: 'pass' }, { ip: '1.1.1.1' });
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('refreshTokenFunc', () => {
    test('returns new tokens for valid refresh token', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('refresh:')) return 'U001';
        return null;
      });
      cacheManager.hget.mockResolvedValue({
        user_id: 'U001',
        role: 'admin',
        email: 'test@example.com',
        phone_number: '0900000000',
        full_name: 'Test',
        zone_id: 'Z01',
        company_id: 'C01',
        firstLogin: false,
        expiresAt: Date.now() + 100000,
      });
      const mockMulti = {
        hdel: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        setex: jest.fn().mockReturnThis(),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      cacheManager.multi.mockReturnValue(mockMulti);
      getIo.mockReturnValue(mockIo());

      const result = await refreshTokenFunc('valid-refresh', { ip: '1.1.1.1' });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockMulti.exec).toHaveBeenCalled();
    });

    test('rejects expired session data', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('refresh:')) return 'U001';
        return null;
      });
      cacheManager.hget.mockResolvedValue({
        expiresAt: Date.now() - 1000,
        authToken: 'old-auth',
      });
      const io = mockIo();
      getIo.mockReturnValue(io);
      cacheManager.hdel.mockResolvedValue();
      cacheManager.del.mockResolvedValue();

      await expect(refreshTokenFunc('expired-refresh', { ip: '1.1.1.1' }))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    test('returns raceCondition for used token', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('refresh:')) return null;
        if (key.startsWith('used:')) return 'U001';
        return null;
      });

      const result = await refreshTokenFunc('used-refresh', { ip: '1.1.1.1' });
      expect(result.raceCondition).toBe(true);
    });

    test('rejects completely invalid token', async () => {
      cacheManager.get.mockResolvedValue(null);
      await expect(refreshTokenFunc('invalid', { ip: '1.1.1.1' }))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    test('survives getIo failure during refresh', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('refresh:')) return 'U001';
        return null;
      });
      cacheManager.hget.mockResolvedValue({
        user_id: 'U001',
        role: 'admin',
        email: 'test@example.com',
        phone_number: '0900000000',
        full_name: 'Test',
        zone_id: 'Z01',
        company_id: 'C01',
        firstLogin: false,
        expiresAt: Date.now() + 100000,
      });
      const mockMulti = {
        hdel: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        setex: jest.fn().mockReturnThis(),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      cacheManager.multi.mockReturnValue(mockMulti);
      getIo.mockImplementation(() => { throw new Error('no io'); });

      const result = await refreshTokenFunc('valid-refresh', { ip: '1.1.1.1' });
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('changePassword', () => {
    test('successfully changes password', async () => {
      userRepository.findByUserId.mockResolvedValue(mockUser);
      verifyPassword.mockImplementation((pwd) => Promise.resolve(pwd === 'oldpass'));
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      const result = await changePassword('U001', {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      });
      expect(result.message).toBe('Password changed successfully');
      expect(invalidateAllUserSessions).toHaveBeenCalled();
    });

    test('rejects user not found', async () => {
      userRepository.findByUserId.mockResolvedValue(null);
      await expect(changePassword('U001', { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' }))
        .rejects.toThrow('User not found');
    });

    test('rejects new password same as old', async () => {
      userRepository.findByUserId.mockResolvedValue(mockUser);
      await expect(changePassword('U001', {
        currentPassword: 'oldpass',
        newPassword: 'oldpass',
        confirmPassword: 'oldpass',
      })).rejects.toThrow('Mật khẩu mới không được trùng với mật khẩu cũ');
    });

    test('rejects mismatched new passwords', async () => {
      userRepository.findByUserId.mockResolvedValue(mockUser);
      await expect(changePassword('U001', {
        currentPassword: 'oldpass',
        newPassword: 'new1',
        confirmPassword: 'new2',
      })).rejects.toThrow('New passwords do not match or are missing');
    });

    test('rejects invalid current password', async () => {
      userRepository.findByUserId.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);
      await expect(changePassword('U001', {
        currentPassword: 'wrong',
        newPassword: 'new',
        confirmPassword: 'new',
      })).rejects.toThrow('Sai mật khẩu cũ');
    });

    test('handles firstLogin without current password', async () => {
      const firstUser = { ...mockUser, firstLogin: true };
      userRepository.findByUserId.mockResolvedValue(firstUser);
      cacheManager.hgetall.mockResolvedValue({
        'refresh-1': { currentPassword: 'encdata', iv: 'ivhex' },
      });
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      const result = await changePassword('U001', {
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      });
      expect(result.firstLogin).toBe(false);
      expect(invalidateAllUserSessions).not.toHaveBeenCalled();
    });

    test('rejects firstLogin when session missing encrypted password', async () => {
      const firstUser = { ...mockUser, firstLogin: true };
      userRepository.findByUserId.mockResolvedValue(firstUser);
      cacheManager.hgetall.mockResolvedValue({});
      await expect(changePassword('U001', {
        newPassword: 'new',
        confirmPassword: 'new',
      })).rejects.toThrow('Current password or IV not found in session');
    });

    test('handles resetToken path', async () => {
      userRepository.findByUserId.mockResolvedValue({ ...mockUser, resetToken: 'rtok', resetTokenExpires: Date.now() + 10000 });
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      const result = await changePassword('U001', {
        resetToken: 'rtok',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      });
      expect(result.message).toBe('Password changed successfully');
    });

    test('rejects invalid resetToken', async () => {
      userRepository.findByUserId.mockResolvedValue({ ...mockUser, resetToken: 'rtok', resetTokenExpires: Date.now() - 10000 });
      await expect(changePassword('U001', {
        resetToken: 'wrong',
        newPassword: 'new',
        confirmPassword: 'new',
      })).rejects.toThrow('Invalid or expired reset token');
    });

    test('survives getIo failure', async () => {
      userRepository.findByUserId.mockResolvedValue(mockUser);
      verifyPassword.mockImplementation((pwd) => Promise.resolve(pwd === 'oldpass'));
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockImplementation(() => { throw new Error('no io'); });

      const result = await changePassword('U001', {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      });
      expect(result.message).toBe('Password changed successfully');
    });
  });

  describe('requestPasswordReset', () => {
    test('sends reset link for valid email', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.updateUserResetToken.mockResolvedValue();
      sendMail.mockResolvedValue();

      const result = await requestPasswordReset('test@example.com');
      expect(result.message).toBe('Password reset link sent to email');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('khôi phục mật khẩu'),
      }));
    });

    test('rejects nonexistent email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(requestPasswordReset('none@example.com'))
        .rejects.toThrow('Email không tồn tại');
    });

    test('throws when email fails to send', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.updateUserResetToken.mockResolvedValue();
      sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(requestPasswordReset('test@example.com'))
        .rejects.toThrow('Failed to send password reset email');
    });
  });

  describe('initiateResetPassword', () => {
    test('returns resetToken for valid JWT', async () => {
      const token = jwt.sign({ token: 'my-reset-token' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const result = await initiateResetPassword(token);
      expect(result.resetToken).toBe('my-reset-token');
    });

    test('rejects invalid JWT', async () => {
      await expect(initiateResetPassword('bad-token'))
        .rejects.toThrow('Invalid or expired reset link');
    });
  });

  describe('resetPassword', () => {
    test('resets password with valid token', async () => {
      const resetUser = { ...mockUser, resetToken: 'rtok', resetTokenExpires: Date.now() + 10000 };
      userRepository.findByResetToken.mockResolvedValue(resetUser);
      userRepository.findByUserId.mockResolvedValue(resetUser);
      hashPassword.mockResolvedValue('new-hashed');
      userRepository.updateUserPassword.mockResolvedValue();
      cacheManager.del.mockResolvedValue();
      getIo.mockReturnValue(mockIo());

      const result = await resetPassword('rtok', 'newpass', 'newpass');
      expect(result.message).toBe('Password changed successfully');
    });

    test('rejects mismatched passwords', async () => {
      userRepository.findByResetToken.mockResolvedValue(mockUser);
      await expect(resetPassword('rtok', 'new1', 'new2'))
        .rejects.toThrow('New password and confirm password do not match');
    });

    test('rejects invalid reset token', async () => {
      userRepository.findByResetToken.mockResolvedValue(null);
      await expect(resetPassword('rtok', 'new', 'new'))
        .rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('logoutUser', () => {
    test('clears session and fail keys', async () => {
      cacheManager.del.mockResolvedValue();
      const result = await logoutUser('U001', 'rtok', 'auth', 'test@example.com', '1.1.1.1');
      expect(result.message).toBe('Logout successful');
      expect(clearSession).toHaveBeenCalledWith('U001', 'rtok', 'auth');
      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining('login:fail:'));
    });

    test('works without email/ip', async () => {
      const result = await logoutUser('U001', 'rtok', 'auth');
      expect(result.message).toBe('Logout successful');
    });
  });

  describe('verifyLoginOtp', () => {
    test('unlocks account with valid OTP', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('otp:login:')) return '123456';
        if (key.startsWith('login:fail:')) return '5';
        return null;
      });
      cacheManager.del.mockResolvedValue();

      const result = await verifyLoginOtp('test@example.com', '123456', '1.1.1.1');
      expect(result.message).toContain('mở khóa');
    });

    test('rejects invalid OTP', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('otp:login:')) return '123456';
        if (key.startsWith('login:fail:')) return '5';
        return null;
      });
      cacheManager.set.mockResolvedValue();

      const error = await verifyLoginOtp('test@example.com', '999999', '1.1.1.1').catch(e => e);
      expect(error.otpRequired).toBe(true);
    });

    test('locks permanently after 10 failed OTP attempts', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('otp:login:')) return '123456';
        if (key.startsWith('login:fail:')) return '9';
        return null;
      });
      cacheManager.set.mockResolvedValue();

      await expect(verifyLoginOtp('test@example.com', 'bad', '1.1.1.1'))
        .rejects.toThrow('khóa tạm thời 1 giờ');
    });

    test('rejects missing email or otp', async () => {
      await expect(verifyLoginOtp('', '123', '1.1.1.1'))
        .rejects.toThrow('Email và OTP là bắt buộc');
    });
  });

  describe('resendLoginOtp', () => {
    test('resends OTP when failCount >= 5', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '5';
        return null;
      });
      userRepository.findByEmail.mockResolvedValue(mockUser);
      sendMail.mockResolvedValue();

      const result = await resendLoginOtp('test@example.com', '1.1.1.1');
      expect(result.message).toContain('OTP mới');
    });

    test('rejects when failCount < 5', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '3';
        return null;
      });
      await expect(resendLoginOtp('test@example.com', '1.1.1.1'))
        .rejects.toThrow('Tài khoản chưa ở trạng thái yêu cầu OTP đăng nhập');
    });

    test('rejects missing email', async () => {
      await expect(resendLoginOtp('', '1.1.1.1'))
        .rejects.toThrow('Email là bắt buộc');
    });

    test('rejects when user not found', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '5';
        return null;
      });
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(resendLoginOtp('test@example.com', '1.1.1.1'))
        .rejects.toThrow('Thông tin đăng nhập không chính xác');
    });

    test('throws on email send failure', async () => {
      cacheManager.get.mockImplementation((key) => {
        if (key.startsWith('login:fail:')) return '5';
        return null;
      });
      userRepository.findByEmail.mockResolvedValue(mockUser);
      sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(resendLoginOtp('test@example.com', '1.1.1.1'))
        .rejects.toThrow('Không thể gửi lại mã OTP đăng nhập');
    });
  });
});
