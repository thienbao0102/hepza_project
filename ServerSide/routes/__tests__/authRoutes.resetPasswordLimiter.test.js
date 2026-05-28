const express = require('express');
const request = require('supertest');

const mockLogin = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockVerifyLoginOtp = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockResendLoginOtp = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockChangePassword = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockRequestPasswordReset = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockInitiateResetPassword = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockResetPassword = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockLogout = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockGetAuthenticatedUser = jest.fn((req, res) => res.status(200).json({ ok: true }));
const mockRefresh = jest.fn((req, res) => res.status(200).json({ ok: true }));

jest.mock('../../controllers/authController', () => ({
  login: (...args) => mockLogin(...args),
  verifyLoginOtp: (...args) => mockVerifyLoginOtp(...args),
  resendLoginOtp: (...args) => mockResendLoginOtp(...args),
  changePassword: (...args) => mockChangePassword(...args),
  requestPasswordReset: (...args) => mockRequestPasswordReset(...args),
  initiateResetPassword: (...args) => mockInitiateResetPassword(...args),
  resetPassword: (...args) => mockResetPassword(...args),
  logout: (...args) => mockLogout(...args),
  getAuthenticatedUser: (...args) => mockGetAuthenticatedUser(...args),
  refresh: (...args) => mockRefresh(...args),
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => next(),
}));

jest.mock('../../middleware/csrf', () => ({
  verifyCsrfToken: (req, res, next) => next(),
}));

process.env.RATELIMIT_MULTIPLIER = '1';

const authRoutes = require('../authRoutes');

describe('authRoutes reset password limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/reset-password returns 429 after the fifth allowed request', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'Password123!', confirmPassword: 'Password123!' });

      expect(response.status).toBe(200);
    }

    const blockedResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'Password123!', confirmPassword: 'Password123!' });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      error: 'Quá nhiều yêu cầu reset mật khẩu, thử lại sau 1 giờ',
    });
    expect(mockResetPassword).toHaveBeenCalledTimes(5);
  });
});
