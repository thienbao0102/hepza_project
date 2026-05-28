const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../dataAccess/userRepository');
const cacheManager = require('../lib/cacheManager');
const { getIo } = require('../config/socket');
const { sendMail } = require('../config/email');
const { getSessionTerminatedTemplate, getPasswordResetTemplate, getLoginOtpTemplate } = require('../utils/emailTemplates');
const { generateOtp } = require('../utils/random');
const { generateCsrfToken } = require('../middleware/csrf');
const { clearSession, invalidateAllUserSessions } = require('../utils/sessionManager');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/passwordHasher');
const { JWT_VERIFY_OPTIONS, buildJwtSignOptions } = require('../utils/jwtOptions');

const REFRESH_SESSION_TTL_SECONDS = 4 * 60 * 60;
const REFRESH_SESSION_TTL_MS = REFRESH_SESSION_TTL_SECONDS * 1000;

const getEncryptionKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  // 64 hex chars = 32 bytes (production), 32 ASCII chars = 32 bytes (local)
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw.length === 32) {
    return Buffer.from(raw);
  }
  throw new Error(`Invalid ENCRYPTION_KEY length: ${raw.length}. Expected 32 ASCII chars or 64 hex chars.`);
};

const getLoginFailKey = (email, ip) => `login:fail:${email}-${ip}`;
const getLoginOtpKey = (email) => `otp:login:${email}`;

const issueLoginOtp = async (user, email) => {
  const otp = generateOtp();
  await cacheManager.set(getLoginOtpKey(email), otp, 600);
  await sendMail({
    to: email,
    subject: 'Mã xác nhận bảo mật - HEPZA',
    html: getLoginOtpTemplate(user.full_name, otp)
  });
  return otp;
};

const loginUser = async ({ email, password, otp }, req) => {
  let io;
  try {
    io = getIo();
  } catch (error) {
    console.error('Failed to get Socket.io in loginUser:', error.message);
  }

  // Validate input
  if (!email || !password) {
    throw new Error('Email và mật khẩu là bắt buộc');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email không hợp lệ');
  }

  // Normalize email — case-insensitive per RFC 5321
  email = email.trim().toLowerCase();

  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error('Thông tin đăng nhập không chính xác');

  if (!user.email) {
    throw new Error('User email is invalid');
  }

  // --- Progressive Login Security ---
  const failKey = getLoginFailKey(email, req.ip);

  const failCountRaw = await cacheManager.get(failKey);
  const failCount = parseInt(failCountRaw) || 0;

  if (failCount >= 5) {
    if (!otp) {
      // Check if OTP was already sent, if not send one
      const existingOtp = await cacheManager.get(getLoginOtpKey(email));
      if (!existingOtp) {
        try {
          await issueLoginOtp(user, email);
        } catch (mailError) {
          console.error('Error sending login OTP email:', mailError);
        }
      }

      const error = new Error('Tài khoản bị hạn chế do nhập sai nhiều lần. Vui lòng nhập mã OTP đã gửi đến email để tiếp tục.');
      error.otpRequired = true;
      throw error;
    }

    // Verify OTP is STILL required for login to succeed if OTP gate is required by business logic. 
    // However, the `verifyLoginOtp` endpoint will handle the explicit unlock.
    // The previous inline verification here is removed since the user will unlock prior to password entry via the new endpoint.
  }

  const isMatch = await verifyPassword(password, user.password);

  if (!isMatch) {
    // Increment fail counter
    const newFailCount = failCount + 1;
    await cacheManager.set(failKey, newFailCount, 3600); // TTL 1h

    if (newFailCount === 5) {
      // At exactly 5th fail, generate OTP and send to email
      try {
        await issueLoginOtp(user, email);
      } catch (mailError) {
        console.error('Error sending login OTP email:', mailError);
      }
      const error = new Error('Bạn đã nhập sai quá 5 lần. Mã OTP bảo mật đã được gửi đến email của bạn.');
      error.otpRequired = true;
      throw error;
    }

    if (newFailCount > 5) {
      const error = new Error(`Sai mật khẩu. Bạn còn ${10 - newFailCount} lần thử trước khi bị khóa tạm thời 1 giờ.`);
      error.otpRequired = true; // Keep OTP form visible
      throw error;
    }

    throw new Error('Thông tin đăng nhập không chính xác');
  }

  if (needsRehash(user.password)) {
    const rehashedPassword = await hashPassword(password);
    await userRepository.updateUserPassword(user.user_id, {
      password: rehashedPassword,
      updated_by: user.user_id,
    });
  }

  // Login successful - reset fail counter and clean up OTP
  await cacheManager.del(failKey);
  try { await cacheManager.del(getLoginOtpKey(email)); } catch (e) { }

  const accessToken = jwt.sign(
    {
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      phone_number: user.phone_number,
      zone_id: user.zone_id,
      company_id: user.company_id,
      firstLogin: user.firstLogin,
    },
    process.env.JWT_SECRET,
    buildJwtSignOptions({ expiresIn: '15m' })
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = generateCsrfToken();

  let encryptedPassword, iv;
  if (user.firstLogin) {
    iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("AES-256-GCM", getEncryptionKey(), iv);
    encryptedPassword = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final(),
    ]).toString('hex');
  }

  const sessionData = {
    refreshToken,
    authToken: accessToken,
    user_id: user.user_id,
    zone_id: user.zone_id,
    company_id: user.company_id,
    full_name: user.full_name,
    phone_number: user.phone_number,
    role: user.role,
    email: user.email,
    firstLogin: user.firstLogin,
    expiresAt: Date.now() + REFRESH_SESSION_TTL_MS,
    currentPassword: user.firstLogin ? encryptedPassword : undefined,
    iv: user.firstLogin ? iv.toString('hex') : undefined,
  };

  const oldRefreshTokens = await cacheManager.hkeys(`session:${user.user_id}`);
  if (oldRefreshTokens.length > 0) {
    const lastEmailSent = await cacheManager.get(`email:notify:${user.user_id}`);
    if (!lastEmailSent) {
      try {
        await sendMail({
          to: user.email,
          subject: 'Cảnh báo: Phát hiện đăng nhập mới trên tài khoản HEPZA',
          html: getSessionTerminatedTemplate()
        });
        await cacheManager.set(`email:notify:${user.user_id}`, true, 3600);
      } catch (error) {
        console.error('Error sending session termination email:', error);
      }
    }

    for (const oldToken of oldRefreshTokens) {
      const oldData = await cacheManager.hget(`session:${user.user_id}`, oldToken);
      if (oldData?.authToken && io) {
        await cacheManager.set(`blacklist:${oldData.authToken}`, true, 15 * 60);
        io.to(`user:${user.user_id}`).emit('token_invalidated', {
          message: 'Tài khoản của bạn vừa đăng nhập trên thiết bị khác, phiên hiện tại bị hủy',
        });
      }
      await cacheManager.del(`refresh:${oldToken}`);
    }
    await cacheManager.del(`session:${user.user_id}`);
  }

  await cacheManager.hset(`session:${user.user_id}`, refreshToken, sessionData, REFRESH_SESSION_TTL_SECONDS);
  await cacheManager.set(`refresh:${refreshToken}`, user.user_id, REFRESH_SESSION_TTL_SECONDS);
  await cacheManager.set(`csrf:${user.user_id}`, csrfToken, 900); // Lưu CSRF token vào Redis

  await cacheManager.set(
    `user:${user.user_id}`,
    {
      user_id: user.user_id,
      zone_id: user.zone_id,
      company_id: user.company_id,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      phone_number: user.phone_number,
      firstLogin: user.firstLogin,
    },
    15 * 60
  );

  return {
    user: {
      user_id: user.user_id,
      zone_id: user.zone_id,
      company_id: user.company_id,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      phone_number: user.phone_number,
      firstLogin: user.firstLogin,
    },
    accessToken,
    refreshToken,
    csrfToken,
  };
};

const refreshTokenFunc = async (refreshToken, req) => {
  let io;
  try {
    io = getIo();
  } catch (error) {
    console.error('Failed to get Socket.io in refreshTokenFunc:', error.message);
  }

  const GRACE_PERIOD_SECONDS = 30;

  // 1. Kiểm tra xem token có hợp lệ không
  const user_id = await cacheManager.get(`refresh:${refreshToken}`);

  // Kịch bản 1: Token hợp lệ, được sử dụng lần đầu
  if (user_id) {
    const sessionData = await cacheManager.hget(`session:${user_id}`, refreshToken);

    if (!sessionData || sessionData.expiresAt < Date.now()) {
      if (sessionData && io) {
        await cacheManager.hdel(`session:${user_id}`, refreshToken);
        await cacheManager.del(`refresh:${refreshToken}`);
        io.to(`user:${user_id}`).emit('token_invalidated', {
          message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
        });
      }
      throw new Error('Invalid or expired refresh token');
    }

    // 2. Tạo cặp token mới (logic xoay vòng)
    const newAccessToken = jwt.sign(
      {
        user_id: user_id,
        role: sessionData.role,
        email: sessionData.email,
        phone_number: sessionData.phone_number,
        full_name: sessionData.full_name,
        zone_id: sessionData.zone_id,
        company_id: sessionData.company_id,
        firstLogin: sessionData.firstLogin,
      },
      process.env.JWT_SECRET,
      buildJwtSignOptions({ expiresIn: '15m' })
    );

    const newCsrfToken = generateCsrfToken();
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newSessionData = {
      ...sessionData,
      refreshToken: newRefreshToken,
      authToken: newAccessToken,
      expiresAt: Date.now() + REFRESH_SESSION_TTL_MS,
    };

    // 3. Thực hiện xoay vòng và thiết lập thời gian ân hạn bằng transaction
    const multi = cacheManager.multi();

    // Xóa session và refresh token cũ
    multi.hdel(`session:${user_id}`, refreshToken);
    multi.del(`refresh:${refreshToken}`);

    // Thêm token cũ vào danh sách "đã sử dụng" (used) để phát hiện tấn công
    // và cũng là danh sách "ân hạn" (grace) để xử lý race condition.
    multi.setex(`used:${refreshToken}`, GRACE_PERIOD_SECONDS, user_id);

    // Lưu session và refresh token mới
    multi.hset(`session:${user_id}`, newRefreshToken, JSON.stringify(newSessionData));
    multi.expire(`session:${user_id}`, REFRESH_SESSION_TTL_SECONDS);
    multi.setex(`refresh:${newRefreshToken}`, REFRESH_SESSION_TTL_SECONDS, user_id);
    multi.setex(`csrf:${user_id}`, 900, newCsrfToken);

    await multi.exec();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, newCsrfToken };
  }

  // Kịch bản 2: Token không hợp lệ, kiểm tra xem có phải là race condition hoặc tấn công không
  const user_id_from_used = await cacheManager.get(`used:${refreshToken}`);

  // Nếu token được tìm thấy trong danh sách "đã sử dụng/ân hạn"
  if (user_id_from_used) {
    // Trả về cờ raceCondition để bỏ qua thay vì xem là tấn công
    return { raceCondition: true };
  }

  // Nếu không tìm thấy ở đâu cả, đây là một token hoàn toàn không hợp lệ
  throw new Error('Invalid or expired refresh token');
};

const changePassword = async (user_id, { currentPassword, newPassword, confirmPassword, resetToken }) => {
  let io;
  try {
    io = getIo();
  } catch (error) {
    console.error('Failed to get Socket.io in changePassword:', error.message);
  }

  try {
    const user = await userRepository.findByUserId(user_id);
    if (!user) throw new Error('User not found');

    let validatedCurrentPassword = currentPassword;

    if (user.firstLogin && !currentPassword && !resetToken) {
      let sessionData = await cacheManager.hgetall(`session:${user_id}`);
      const sessionValues = Object.values(sessionData);
      if (sessionValues.length === 0 || !sessionValues[0].currentPassword || !sessionValues[0].iv) {
        throw new Error('Current password or IV not found in session');
      }

      const keyBuffer = getEncryptionKey();

      const decipher = crypto.createDecipheriv(
        'AES-256-GCM',
        keyBuffer,
        Buffer.from(sessionValues[0].iv, 'hex')
      );
      const decryptedPassword = Buffer.concat([
        decipher.update(Buffer.from(sessionValues[0].currentPassword, 'hex')),
        decipher.final(),
      ]).toString('utf8');
      validatedCurrentPassword = decryptedPassword;
    }

    if (newPassword) {
      const isSameAsOld = await verifyPassword(newPassword, user.password);
      if (isSameAsOld) {
        throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ.');
      }
    }

    if (resetToken) {
      if (user.resetToken !== resetToken || user.resetTokenExpires < Date.now()) {
        throw new Error('Invalid or expired reset token');
      }
    } else {
      const isMatch = await verifyPassword(validatedCurrentPassword, user.password);
      if (!isMatch) throw new Error('Sai mật khẩu cũ');
    }

    if (!newPassword || !confirmPassword || newPassword !== confirmPassword) {
      throw new Error('New passwords do not match or are missing');
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.updateUserPassword(user_id, {
      password: hashedPassword,
      firstLogin: false,
      resetToken: null,
      resetTokenExpires: null,
      updated_by: user_id,
    });

    await cacheManager.del(`user:${user_id}`);
    await cacheManager.del(`session:${user_id}`);

    // Chỉ vô hiệu hóa session khi người dùng tự đổi mật khẩu, không phải lần đầu đăng nhập.
    if (!user.firstLogin && !resetToken) {
      await invalidateAllUserSessions(user_id, 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.');
    }

    return { message: 'Password changed successfully', firstLogin: false };
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

const requestPasswordReset = async (email) => {
  email = email?.trim().toLowerCase();
  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error('Email không tồn tại');

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 3600000);

  await userRepository.updateUserResetToken(email, {
    resetToken,
    resetTokenExpires,
    updated_by: user.user_id,
  });

  const encryptedToken = jwt.sign(
    { token: resetToken },
    process.env.JWT_SECRET,
    buildJwtSignOptions({ expiresIn: '1h' })
  );
  const rawBaseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
  const resetLink = baseUrl + '/reset-password/init?token=' + encodeURIComponent(encryptedToken);

  try {
    await sendMail({
      to: email,
      subject: 'Yêu cầu khôi phục mật khẩu tài khoản HEPZA',
      html: getPasswordResetTemplate(resetLink)
    });
  } catch (error) {
    throw new Error('Failed to send password reset email');
  }

  return { message: 'Password reset link sent to email' };
};

const resendLoginOtp = async (email, ip) => {
  if (!email) {
    throw new Error('Email là bắt buộc');
  }

  email = email.trim().toLowerCase();
  const failCountRaw = await cacheManager.get(getLoginFailKey(email, ip));
  const failCount = parseInt(failCountRaw, 10) || 0;

  if (failCount < 5) {
    throw new Error('Tài khoản chưa ở trạng thái yêu cầu OTP đăng nhập.');
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Thông tin đăng nhập không chính xác');
  }

  try {
    await issueLoginOtp(user, email);
  } catch (error) {
    console.error('Error resending login OTP email:', error);
    throw new Error('Không thể gửi lại mã OTP đăng nhập');
  }

  return { message: 'Mã OTP mới đã được gửi đến email của bạn.' };
};

const initiateResetPassword = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);
    return { resetToken: decoded.token };
  } catch (error) {
    throw new Error('Invalid or expired reset link');
  }
};

const resetPassword = async (token, newPassword, confirmPassword) => {
  const user = await userRepository.findByResetToken(token);
  if (!user) throw new Error('Invalid or expired reset token');

  if (newPassword !== confirmPassword) {
    throw new Error('New password and confirm password do not match');
  }

  return await changePassword(user.user_id, { resetToken: token, newPassword, confirmPassword });
};

const logoutUser = async (user_id, refreshToken, authToken, email, ip) => {
  if (email && ip) {
    await cacheManager.del(getLoginFailKey(email, ip));
    await cacheManager.del(getLoginOtpKey(email));
  }

  return clearSession(user_id, refreshToken, authToken);
};

const verifyLoginOtp = async (email, otp, ip) => {
  if (!email || !otp) {
    throw new Error('Email và OTP là bắt buộc');
  }

  email = email.trim().toLowerCase();
  const failKey = getLoginFailKey(email, ip);
  const storedOtp = await cacheManager.get(getLoginOtpKey(email));

  if (!storedOtp || storedOtp.toString() !== otp.toString()) {
    const failCountRaw = await cacheManager.get(failKey);
    const failCount = parseInt(failCountRaw, 10) || 5;
    const newFailCount = failCount + 1;
    await cacheManager.set(failKey, newFailCount, 3600);

    if (newFailCount >= 10) {
      throw new Error('Bạn đã nhập sai quá nhiều lần. Tài khoản bị khóa tạm thời 1 giờ.');
    }

    const error = new Error('Mã OTP không hợp lệ. Bạn còn ' + (10 - newFailCount) + ' lần thử trước khi bị khóa.');
    error.otpRequired = true;
    throw error;
  }

  await cacheManager.del(failKey);
  await cacheManager.del(getLoginOtpKey(email));

  return { message: 'Tài khoản đã được mở khóa. Vui lòng nhập lại mật khẩu để đăng nhập.' };
};

module.exports = {
  loginUser,
  verifyLoginOtp,
  resendLoginOtp,
  changePassword,
  requestPasswordReset,
  resetPassword,
  logoutUser,
  initiateResetPassword,
  refreshTokenFunc,
};
