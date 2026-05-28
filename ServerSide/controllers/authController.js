const authService = require('../services/authService');
const cacheManager = require('../lib/cacheManager');
const {
  loginPasswordLimiter,
  loginOtpVerifyLimiter,
  refreshLimiter,
} = require('../middleware/rateLimiter');

const authTokenName = process.env.NODE_ENV === 'production' ? '__Secure-authToken' : 'authToken';
const refreshTokenName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
const resetTokenName = process.env.NODE_ENV === 'production' ? '__Secure-resetToken' : 'resetToken';
const csrfTokenName = process.env.NODE_ENV === 'production' ? '__Secure-csrfToken' : 'csrfToken';

const baseCookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  path: '/', // Quan trọng: Luôn chỉ định path để đảm bảo tính nhất quán
  ...(process.env.NODE_ENV === 'production' && process.env.DOMAIN && {
    domain: process.env.DOMAIN.replace(/^https?:\/\//, '')
  })
};

const authTokenCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: 15 * 60 * 1000 // 15 phút
};

const refreshTokenCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: 4 * 60 * 60 * 1000 // 4 giờ
};

const csrfTokenCookieOptions = {
  ...baseCookieOptions,
  httpOnly: false, // CSRF token KHÔNG được httpOnly
  maxAge: 15 * 60 * 1000 // 15 phút
};

const resetTokenCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: 3600000
};

const login = async (req, res) => {
  try {
    const userData = await authService.loginUser(req.body, req);

    // Set JWT vào cookie httpOnly
    res.cookie(authTokenName, userData.accessToken, authTokenCookieOptions);
    res.cookie(refreshTokenName, userData.refreshToken, refreshTokenCookieOptions);
    res.cookie(csrfTokenName, userData.csrfToken, csrfTokenCookieOptions);

    res.status(200).json({ message: 'Login successful', user: userData.user });
  } catch (error) {
    if (error.otpRequired) {
      return res.status(403).json({ error: error.message, otpRequired: true });
    }
    res.status(400).json({ error: error.message });
  }
};

const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyLoginOtp(email, otp, req.ip);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.resendLoginOtp(email, req.ip);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies[refreshTokenName];;
    if (!currentRefreshToken) throw new Error('Refresh token not found');
    const result = await authService.refreshTokenFunc(currentRefreshToken, req);

    if (result.raceCondition) {
      // Bỏ qua tạo token mới vì đây là request thừa do nhiều tab cùng gọi ở cùng một thời điểm.
      return res.status(202).json({ message: 'Token already refreshed by another concurrent request' });
    }

    res.cookie(authTokenName, result.accessToken, authTokenCookieOptions);
    res.cookie(refreshTokenName, result.refreshToken, refreshTokenCookieOptions);
    res.cookie(csrfTokenName, result.newCsrfToken, csrfTokenCookieOptions);

    res.status(200).json({ message: 'Token refreshed', csrfToken: result.newCsrfToken });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword, resetToken, currentPassword } = req.body;
    const userDetails = req.userDetails;

    if (userDetails.firstLogin && !resetToken) {
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password are required' });
      }
      const result = await authService.changePassword(req.user.user_id, { newPassword, confirmPassword });
      return res.status(200).json(result); // { message: 'Password changed successfully', firstLogin: false }
    }

    if (!currentPassword && !resetToken) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    const result = await authService.changePassword(req.user.user_id, { currentPassword, newPassword, confirmPassword, resetToken });

    // Chỉ xóa cookies khi firstLogin: false và không có resetToken
    if (!userDetails.firstLogin && !resetToken) {
      res.clearCookie(authTokenName, authTokenCookieOptions);
      res.clearCookie(refreshTokenName, refreshTokenCookieOptions);
      res.clearCookie(csrfTokenName, csrfTokenCookieOptions);
    }

    return res.status(200).json(result); // { message: 'Password changed successfully', firstLogin: false }
  } catch (error) {
    console.error('Change password controller error:', error);
    res.status(400).json({ error: error.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.status(200).json({ message: 'Password reset link sent to email' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const initiateResetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { resetToken } = await authService.initiateResetPassword(token);
    // Lưu token tạm thời vào cookie httpOnly
    res.cookie(resetTokenName, resetToken, resetTokenCookieOptions);
    res.status(200).json({ message: 'Reset initiated, please proceed to reset password', redirect: '/reset-password' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const resetToken = req.cookies[resetTokenName];
    if (!resetToken) throw new Error('Reset token not found');
    if (!newPassword || !confirmPassword) throw new Error('New password and confirm password are required');
    await authService.resetPassword(resetToken, newPassword, confirmPassword);
    res.clearCookie(resetTokenName, resetTokenCookieOptions);
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const ip = req.ip;
    const email = req.userDetails?.email;

    if (email) {
      loginPasswordLimiter.resetKey(`${email}-${ip}`);
      loginOtpVerifyLimiter.resetKey(`${email}-${ip}`);
    }

    const userAgent = req.headers['user-agent'] || 'unknown-agent';
    refreshLimiter.resetKey(`${userAgent}-${ip}`);

    await authService.logoutUser(req.userDetails?.user_id, req.cookies[refreshTokenName], req.cookies[authTokenName], email, ip); // Chuyển email và ip xuống cache clear // Không cần req.user.user_id gốc
    res.clearCookie(authTokenName, authTokenCookieOptions);
    res.clearCookie(refreshTokenName, refreshTokenCookieOptions);
    res.clearCookie(csrfTokenName, csrfTokenCookieOptions);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(200).json({ message: 'Logout successful' }); // Vẫn trả 200 để FE hoàn tất logout
  }
};

const getAuthenticatedUser = async (req, res) => {
  try {
    const user = req.userDetails;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = {
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        phone_number: user.phone_number,
        firstLogin: user.firstLogin,
        company_id: user.company_id,
        zone_id: user.zone_id,
        managed_company_ids: user.managed_company_ids
      }
    };

    try {
      const cacheKey = `auth:me:${user.user_id}`;
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
      await cacheManager.set(cacheKey, payload, 300);
    } catch (cacheErr) {
      // Cache failure is non-critical; continue with normal response
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  login,
  changePassword,
  requestPasswordReset,
  resetPassword,
  logout,
  getAuthenticatedUser,
  initiateResetPassword,
  refresh,
  verifyLoginOtp,
  resendLoginOtp,
  authTokenCookieOptions,
};
