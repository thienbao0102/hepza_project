jest.mock('../../services/authService', () => ({
  loginUser: jest.fn(),
  verifyLoginOtp: jest.fn(),
  resendLoginOtp: jest.fn(),
  refreshTokenFunc: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  logoutUser: jest.fn(),
  initiateResetPassword: jest.fn(),
}));

jest.mock('../../middleware/rateLimiter', () => ({
  loginPasswordLimiter: { resetKey: jest.fn() },
  loginOtpVerifyLimiter: { resetKey: jest.fn() },
  refreshLimiter: { resetKey: jest.fn() },
}));

jest.mock('../../lib/cacheManager', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
}));

const authService = require('../../services/authService');
const { loginPasswordLimiter, loginOtpVerifyLimiter, refreshLimiter } = require('../../middleware/rateLimiter');

const {
  login,
  verifyLoginOtp,
  resendLoginOtp,
  refresh,
  changePassword,
  requestPasswordReset,
  initiateResetPassword,
  resetPassword,
  logout,
  getAuthenticatedUser,
} = require('../authController');

describe('authController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      query: {},
      cookies: {},
      user: { user_id: 'U001' },
      userDetails: { user_id: 'U001', email: 'test@example.com', firstLogin: false },
      ip: '1.1.1.1',
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    process.env.NODE_ENV = 'test';
  });

  describe('login', () => {
    test('returns 200 with user on success', async () => {
      authService.loginUser.mockResolvedValue({
        accessToken: 'atok',
        refreshToken: 'rtok',
        csrfToken: 'csrf',
        user: { user_id: 'U001' },
      });
      await login(req, res);
      expect(res.cookie).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 403 when otp required', async () => {
      const err = new Error('OTP required');
      err.otpRequired = true;
      authService.loginUser.mockRejectedValue(err);
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 400 on error', async () => {
      authService.loginUser.mockRejectedValue(new Error('Bad creds'));
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('verifyLoginOtp', () => {
    test('returns 200 on success', async () => {
      req.body = { email: 'test@example.com', otp: '123456' };
      authService.verifyLoginOtp.mockResolvedValue({ message: 'OK' });
      await verifyLoginOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 on error', async () => {
      req.body = { email: 'test@example.com', otp: '123456' };
      authService.verifyLoginOtp.mockRejectedValue(new Error('Invalid'));
      await verifyLoginOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resendLoginOtp', () => {
    test('returns 200 on success', async () => {
      req.body = { email: 'test@example.com' };
      authService.resendLoginOtp.mockResolvedValue({ message: 'Sent' });
      await resendLoginOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 on error', async () => {
      req.body = { email: 'test@example.com' };
      authService.resendLoginOtp.mockRejectedValue(new Error('Fail'));
      await resendLoginOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refresh', () => {
    test('returns 200 and sets cookies on success', async () => {
      req.cookies = { refreshToken: 'rtok' };
      authService.refreshTokenFunc.mockResolvedValue({ accessToken: 'atok', refreshToken: 'rtok2', newCsrfToken: 'csrf2' });
      await refresh(req, res);
      expect(res.cookie).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 202 on race condition', async () => {
      req.cookies = { refreshToken: 'rtok' };
      authService.refreshTokenFunc.mockResolvedValue({ raceCondition: true });
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(202);
    });

    test('returns 401 when refresh token missing', async () => {
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 on error', async () => {
      req.cookies = { refreshToken: 'rtok' };
      authService.refreshTokenFunc.mockRejectedValue(new Error('Expired'));
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('changePassword', () => {
    test('returns 200 on success', async () => {
      req.body = { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' };
      authService.changePassword.mockResolvedValue({ message: 'OK' });
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('handles firstLogin without currentPassword', async () => {
      req.userDetails.firstLogin = true;
      req.body = { newPassword: 'new', confirmPassword: 'new' };
      authService.changePassword.mockResolvedValue({ message: 'OK', firstLogin: false });
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when firstLogin missing passwords', async () => {
      req.userDetails.firstLogin = true;
      req.body = {};
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 when currentPassword missing for normal user', async () => {
      req.body = { newPassword: 'new', confirmPassword: 'new' };
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('clears cookies on normal password change', async () => {
      req.body = { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' };
      authService.changePassword.mockResolvedValue({ message: 'OK' });
      await changePassword(req, res);
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
    });

    test('returns 400 on error', async () => {
      req.body = { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' };
      authService.changePassword.mockRejectedValue(new Error('Wrong'));
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('requestPasswordReset', () => {
    test('returns 200 on success', async () => {
      req.body = { email: 'test@example.com' };
      authService.requestPasswordReset.mockResolvedValue({ message: 'Sent' });
      await requestPasswordReset(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 on error', async () => {
      req.body = { email: 'test@example.com' };
      authService.requestPasswordReset.mockRejectedValue(new Error('Not found'));
      await requestPasswordReset(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('initiateResetPassword', () => {
    test('returns 200 and sets cookie', async () => {
      req.query = { token: 'tok' };
      authService.initiateResetPassword.mockResolvedValue({ resetToken: 'rtok' });
      await initiateResetPassword(req, res);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 on error', async () => {
      req.query = { token: 'tok' };
      authService.initiateResetPassword.mockRejectedValue(new Error('Invalid'));
      await initiateResetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resetPassword', () => {
    test('returns 200 on success', async () => {
      req.body = { newPassword: 'new', confirmPassword: 'new' };
      req.cookies = { resetToken: 'rtok' };
      authService.resetPassword.mockResolvedValue({ message: 'OK' });
      await resetPassword(req, res);
      expect(res.clearCookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when reset token missing', async () => {
      req.body = { newPassword: 'new', confirmPassword: 'new' };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 when passwords missing', async () => {
      req.cookies = { resetToken: 'rtok' };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 on error', async () => {
      req.body = { newPassword: 'new', confirmPassword: 'new' };
      req.cookies = { resetToken: 'rtok' };
      authService.resetPassword.mockRejectedValue(new Error('Fail'));
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('logout', () => {
    test('returns 200 and clears cookies', async () => {
      req.cookies = { authToken: 'atok', refreshToken: 'rtok' };
      authService.logoutUser.mockResolvedValue({ message: 'OK' });
      await logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 200 even on error', async () => {
      authService.logoutUser.mockRejectedValue(new Error('Fail'));
      await logout(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('resets rate limiters when email available', async () => {
      req.cookies = { authToken: 'atok', refreshToken: 'rtok' };
      authService.logoutUser.mockResolvedValue({ message: 'OK' });
      await logout(req, res);
      expect(loginPasswordLimiter.resetKey).toHaveBeenCalled();
      expect(loginOtpVerifyLimiter.resetKey).toHaveBeenCalled();
      expect(refreshLimiter.resetKey).toHaveBeenCalled();
    });
  });

  describe('getAuthenticatedUser', () => {
    test('returns 200 with user', async () => {
      await getAuthenticatedUser(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    test('returns 404 when user missing', async () => {
      req.userDetails = null;
      await getAuthenticatedUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
