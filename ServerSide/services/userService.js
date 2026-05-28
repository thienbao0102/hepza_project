const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../dataAccess/userRepository');
const companyRepository = require('../dataAccess/companyRepository');
const industrialZoneRepository = require('../dataAccess/industrialZoneRepository');
const businessSymbiosisRepository = require('../dataAccess/businessSymbiosisRepository');
const User = require('../models/userModel');
const { sendMail } = require('../config/email');
const { getWelcomeTemplate, getEmailResetTemplate, getOtpTemplate, getUpdatedCredentialsTemplate } = require('../utils/emailTemplates');
const cacheManager = require('../lib/cacheManager');
const { generateRandomPassword, generateOtp } = require('../utils/random');
const { invalidateAllUserSessions } = require('../utils/sessionManager');
const { VersionConflictError, MissingVersionError, StateConflictError } = require('../utils/conflictError');
const { hashPassword, verifyPassword } = require('../utils/passwordHasher');
const { buildJwtSignOptions } = require('../utils/jwtOptions');

const USER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const USER_PHONE_PATTERN = /^\d{10,11}$/;

const normalizeUserIdentityPayload = (payload = {}) => {
  if (payload.full_name !== undefined) {
    payload.full_name = String(payload.full_name || '').trim().replace(/\s+/g, ' ');
  }

  if (payload.email !== undefined) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }

  if (payload.phone_number !== undefined) {
    payload.phone_number = String(payload.phone_number || '').replace(/\D/g, '');
  }

  return payload;
};

const validateUserIdentityPayload = (payload = {}, { requireAll = false } = {}) => {
  const shouldValidate = (field) => requireAll || payload[field] !== undefined;

  if (shouldValidate('full_name')) {
    if (!payload.full_name) {
      throw new Error('Họ và tên là bắt buộc');
    }
    if (payload.full_name.length < 2) {
      throw new Error('Họ và tên phải có ít nhất 2 ký tự');
    }
  }

  if (shouldValidate('email')) {
    if (!payload.email) {
      throw new Error('Email là bắt buộc');
    }
    if (!USER_EMAIL_PATTERN.test(payload.email)) {
      throw new Error('Định dạng email không hợp lệ');
    }
  }

  if (shouldValidate('phone_number')) {
    if (!payload.phone_number) {
      throw new Error('Số điện thoại là bắt buộc');
    }
    if (!USER_PHONE_PATTERN.test(payload.phone_number)) {
      throw new Error('Số điện thoại phải gồm 10-11 chữ số');
    }
  }

  if (payload.password !== undefined && String(payload.password || '').length < 8) {
    throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
  }
};

const sortUsersByCreatedAt = (users = []) => {
  return [...users].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
};

const mapRepresentativeCandidate = (user) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  email: user.email,
  phone_number: user.phone_number,
});

const emitRepresentativeChanged = (payload) => {
  if (!payload?.company_id) return;

  try {
    const { getIo } = require('../config/socket');
    const io = getIo();
    if (!io) return;

    io.to('role:admin').emit('company:representative_changed', payload);
    io.to(`company:${payload.company_id}:users`).emit('company:representative_changed', payload);

    if (payload.zone_id) {
      io.to(`zone:${payload.zone_id}:managers`).emit('company:representative_changed', payload);
    }
    if (payload.previous_representative_user_id) {
      io.to(`user:${payload.previous_representative_user_id}`).emit('company:representative_changed', payload);
    }
    if (payload.next_representative_user_id) {
      io.to(`user:${payload.next_representative_user_id}`).emit('company:representative_changed', payload);
    }
  } catch (_) { /* Socket emit is best-effort, never block the response */ }
};

const resolveCompanyRepresentativeState = async (company_id, session = null) => {
  const company = await companyRepository.findOne({ company_id }, session);
  if (!company) {
    return null;
  }

  const companyUsers = sortUsersByCreatedAt(
    await userRepository.find({ company_id, role: 'company' }, session)
  );
  const activeUsers = companyUsers.filter((user) => !user.deleted_at);

  const persistedRepresentative = company.representative_user_id
    ? companyUsers.find(
      (user) => user.user_id === company.representative_user_id && !user.deleted_at
    )
    : null;

  const fallbackRepresentative = activeUsers[0] || companyUsers[0] || null;
  const representativeUser = persistedRepresentative || fallbackRepresentative || null;
  const representativeUserId = representativeUser?.user_id || null;

  if (company.representative_user_id !== representativeUserId) {
    if (representativeUserId) {
      await companyRepository.setRepresentativeUser(company_id, representativeUserId, session);
      company.representative_user_id = representativeUserId;
    } else if (company.representative_user_id) {
      await companyRepository.unsetRepresentativeUserIfMatches(
        company_id,
        company.representative_user_id,
        session
      );
      company.representative_user_id = null;
    }
  }

  return {
    company: {
      ...company,
      representative_user_id: company.representative_user_id || representativeUserId || null,
    },
    representativeUser,
    representativeUserId,
    activeUsers,
    companyUsers,
  };
};

const getRepresentativeReplacementRequirement = async (users, session = null) => {
  const companyUsers = users.filter((user) => user.role === 'company' && user.company_id);
  if (companyUsers.length === 0) {
    return null;
  }

  const requirements = [];
  for (const user of companyUsers) {
    const companyState = await resolveCompanyRepresentativeState(user.company_id, session);
    if (!companyState) continue;
    if (companyState.representativeUserId !== user.user_id) continue;

    const replacementCandidates = companyState.activeUsers.filter(
      (candidate) => candidate.user_id !== user.user_id
    );

    requirements.push({
      user,
      company: companyState.company,
      representativeUserId: companyState.representativeUserId,
      replacementCandidates,
    });
  }

  if (requirements.length === 0) {
    return null;
  }

  if (users.length > 1 || requirements.length > 1) {
    throw new Error('Không thể xóa hàng loạt khi danh sách có tài khoản đại diện. Vui lòng xử lý từng tài khoản.');
  }

  const requirement = requirements[0];
  if (requirement.replacementCandidates.length === 0) {
    throw new Error('Không thể xóa tài khoản đại diện khi doanh nghiệp chưa có nhân sự thay thế.');
  }

  return requirement;
};

const resolveAutomaticBusinessSymbiosisTransferTarget = async (user, session = null) => {
  if (!user?.company_id || user.role !== 'company') {
    return null;
  }

  const companyState = await resolveCompanyRepresentativeState(user.company_id, session);
  if (!companyState) {
    return null;
  }

  const activeCandidates = companyState.activeUsers.filter(
    (candidate) => candidate.user_id !== user.user_id
  );

  if (activeCandidates.length === 0) {
    return null;
  }

  const preferredRepresentative = activeCandidates.find(
    (candidate) => candidate.user_id === companyState.representativeUserId
  );

  return preferredRepresentative || activeCandidates[0];
};

const transferOwnedBusinessSymbiosisIfNeeded = async (user, session = null) => {
  if (!user?.company_id || user.role !== 'company') {
    return null;
  }

  const activeSymbiosis = await businessSymbiosisRepository.countActiveBusinessSymbiosisByUser(
    user.company_id,
    user.user_id,
    session
  );

  if (!activeSymbiosis.total) {
    return null;
  }

  const targetUser = await resolveAutomaticBusinessSymbiosisTransferTarget(user, session);
  if (!targetUser) {
    throw new Error('Không thể xóa vĩnh viễn tài khoản này vì vẫn còn dữ liệu cộng sinh đang hoạt động và không có nhân sự thay thế để chuyển quyền sở hữu.');
  }

  const reassignmentResult = await businessSymbiosisRepository.reassignBusinessSymbiosisOwner(
    user.company_id,
    user.user_id,
    targetUser.user_id,
    session
  );

  return {
    transferredTo: mapRepresentativeCandidate(targetUser),
    ...activeSymbiosis,
    ...reassignmentResult,
  };
};

const buildStateConflictMessage = (entityLabel, actionLabel) => (
  `${entityLabel} này đã được người khác thay đổi trạng thái trước khi ${actionLabel}. Vui lòng tải lại danh sách rồi thử lại.`
);

const buildManagerLifecycleMessage = (actionLabel = 'thao tác này') => (
  `Tài khoản quản lý KCN đi theo vòng đời của KCN và không thể ${actionLabel} từ màn người dùng. Vui lòng thao tác tại khu công nghiệp tương ứng.`
);

const assertManagerLifecycleManagedByZone = (user, actionLabel = 'thực hiện thao tác này') => {
  if (user?.role === 'manager') {
    throw new Error(buildManagerLifecycleMessage(actionLabel));
  }
};

const countCompanyUserSlots = async (companyId, session = null) => {
  const company = await companyRepository.findOne({ company_id: companyId }, session);
  const linkedUserIds = Array.isArray(company?.user_ids)
    ? company.user_ids.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const companyUsers = await User.find({
    role: 'company',
    $or: [
      { company_id: companyId },
      ...(linkedUserIds.length > 0 ? [{ user_id: { $in: linkedUserIds } }] : []),
    ],
  })
    .select({ user_id: 1, _id: 0 })
    .session(session)
    .lean();

  return new Set(
    companyUsers.map((user) => String(user.user_id || '').trim()).filter(Boolean),
  ).size;
};

const createUser = async (userData, currentUser, session) => {
  normalizeUserIdentityPayload(userData);
  validateUserIdentityPayload(userData, { requireAll: true });

  if (userData.role === 'company' && (!userData.company_id || !userData.zone_id)) {
    throw new Error('Vai trò doanh nghiệp yêu cầu company_id và zone_id');
  }

  if (currentUser?.role === 'company') {
    if (!userData.currentPassword) {
      throw new Error('Vui lòng cung cấp mật khẩu hiện tại để xác thực thao tác');
    }
    const adminUser = await User.findOne({ user_id: currentUser.user_id }).session(session);
    if (!adminUser) throw new Error('Không tìm thấy tài khoản thao tác');
    const isValidPassword = await verifyPassword(userData.currentPassword, adminUser.password);
    if (!isValidPassword) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }
  }

  if (userData.role === 'manager' && !userData.zone_id) {
    throw new Error('Vai trò quản lý yêu cầu zone_id');
  }

  // Thêm kiểm tra cho manager: 1 zone chỉ 1 manager
  if (userData.role === 'manager') {
    const existingManager = await User.findOne({
      role: 'manager',
      zone_id: userData.zone_id
    }).session(session);
    if (existingManager) {
      throw new Error(`Zone ${userData.zone_id} đã có manager quản lý. Mỗi zone chỉ được gán 1 manager.`);
    }
  }

  // Thêm kiểm tra cho company: 1 company chỉ 1 user (role company)
  if (userData.role === 'company') {
    if (!userData.company_id) {
      throw new Error('Vai trò doanh nghiệp yêu cầu company_id');
    }

    const companyUserCount = await countCompanyUserSlots(userData.company_id, session);

    if (companyUserCount >= 3) {
      throw new Error(`Công ty ${userData.company_id} đã đạt giới hạn tối đa 3 tài khoản người dùng.`);
    }

    // Kiểm tra company_id tồn tại
    const company = await companyRepository.findOne({ company_id: userData.company_id, deleted_at: null }, session);
    if (!company) {
      throw new Error(`Công ty với company_id ${userData.company_id} không tồn tại hoặc đã bị xóa`);
    }
  }

  // Kiểm tra phone (cấm trùng hoàn toàn, kể cả soft-delete)
  if (await User.countDocuments({ phone_number: userData.phone_number }).session(session)) {
    throw new Error('Số điện thoại đã tồn tại trong hệ thống');
  }

  // Kiểm tra email (case-insensitive)
  if (userData.email) {
    userData.email = userData.email.trim().toLowerCase();
    if (await User.countDocuments({ email: userData.email }).session(session)) {
      throw new Error('Email đã tồn tại trong hệ thống');
    }
  }

  // Password
  const generatedPassword = userData.password || generateRandomPassword();
  const hashedPassword = await hashPassword(generatedPassword);

  // Create user
  const newUser = await userRepository.createUser({
    ...userData,
    password: hashedPassword,
    firstLogin: true,
    created_by: currentUser?.user_id,
    updated_by: currentUser?.user_id,
  }, session);

  if (userData.role === 'company') {
    const Company = require('../models/companyModel');
    await Company.findOneAndUpdate(
      { company_id: userData.company_id },
      { $addToSet: { user_ids: newUser.user_id } },
      { session }
    );

    const companyState = await resolveCompanyRepresentativeState(userData.company_id, session);
    if (!companyState?.company?.representative_user_id) {
      await companyRepository.setRepresentativeUser(userData.company_id, newUser.user_id, session);
    }
  }

  // Đồng bộ managers_ids vào KCN khi tạo manager
  if (userData.role === 'manager' && userData.zone_id) {
    const IndustrialZone = require('../models/industrialZoneModel');
    await IndustrialZone.findOneAndUpdate(
      { zone_id: userData.zone_id, deleted_at: null },
      { $addToSet: { managers_ids: newUser.user_id } },
      { session }
    );
  }

  // (Mail có thể để ngoài transaction, nếu fail thì ko rollback DB)
  try {
    if (userData.email) {
      await sendMail({
        to: userData.email,
        subject: 'Chào mừng bạn đến với HEPZA - Thông tin tài khoản',
        html: getWelcomeTemplate(userData.full_name, generatedPassword)
      });
    }
  } catch (error) {
    console.error('Error sending password email:', error);
  }

  return {
    user_id: newUser.user_id,
    full_name: newUser.full_name,
    phone_number: newUser.phone_number,
    email: newUser.email,
    role: newUser.role,
    company_id: newUser.company_id,
    zone_id: newUser.zone_id,
    generatedPassword,
  };
};

const updateUser = async (user_id, updateData, currentUser) => {
  normalizeUserIdentityPayload(updateData);
  validateUserIdentityPayload(updateData);

  const user = await userRepository.findByUserId(user_id);
  if (!user) throw new Error('Không tìm thấy người dùng');

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    throw new Error('Bạn không có quyền cập nhật tài khoản này');
  }
  if (currentUser.role === 'manager') {
    // Nếu là manager sửa tài khoản company thì check zone
    if (user.role === 'company' && user.company_id) {
      const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null });
      if (!company || company.zone_id !== currentUser.zone_id) {
        throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
      }
    } else {
      throw new Error('Manager không có quyền cập nhật loại tài khoản này');
    }
  }
  if (user.role === 'admin' && user.user_id !== currentUser.user_id) {
    throw new Error('Admin chỉ có thể cập nhật tài khoản của chính mình');
  }

  if (updateData.role !== undefined && updateData.role !== user.role) {
    throw new Error('Không hỗ trợ chuyển đổi loại tài khoản bằng chức năng cập nhật. Vui lòng tạo tài khoản mới nếu cần thay đổi vai trò.');
  }

  const currentCompany = user.role === 'company' && user.company_id
    ? await companyRepository.findOne({ company_id: user.company_id, deleted_at: null })
    : null;
  const isRepresentativeCompanyAccount = currentCompany?.representative_user_id === user.user_id;

  if (
    isRepresentativeCompanyAccount
    && (
      (updateData.company_id !== undefined && updateData.company_id !== user.company_id)
      || (updateData.zone_id !== undefined && updateData.zone_id !== user.zone_id)
    )
  ) {
    throw new Error('Tài khoản đại diện doanh nghiệp không thể đổi KCN hoặc doanh nghiệp trực thuộc từ màn cập nhật người dùng. Vui lòng đổi người đại diện trước tại màn doanh nghiệp.');
  }

  if (user.role === 'manager') {
    const managerZone = user.zone_id
      ? await industrialZoneRepository.findOne({ zone_id: user.zone_id, deleted_at: null })
      : null;

    if (!managerZone) {
      throw new Error('Chỉ có thể cập nhật tài khoản quản lý khi khu công nghiệp đang hoạt động.');
    }

    if (updateData.company_id !== undefined && updateData.company_id !== user.company_id) {
      throw new Error('Tài khoản quản lý KCN không thể gán sang doanh nghiệp bằng chức năng cập nhật.');
    }
  }

  if (user.role === 'company' && updateData.company_id === undefined) {
    updateData.company_id = user.company_id;
  }

  if (user.role === 'company' && updateData.zone_id === undefined) {
    updateData.zone_id = user.zone_id;
  }

  const allowedFields = {
    full_name: 1,
    phone_number: 1,
    email: 1,
    password: 1,
    firstLogin: 1,
    address: 1,
    dob: 1,
    position: 1,
    department: 1,
    zone_id: 1,
    company_id: 1,
    status: 1
  };

  // Allow admin to reset email in emergency
  if (updateData.email) {
    updateData.email = updateData.email.trim().toLowerCase();
  }
  if (updateData.email && updateData.email !== user.email) {
    allowedFields.email = 1;
    allowedFields.password = 1;
    allowedFields.firstLogin = 1;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updateData.email)) {
      throw new Error('Định dạng email không hợp lệ');
    }

    // KIỂM TRA TRÙNG EMAIL KỂ CẢ VỚI USER ĐÃ SOFT-DELETE (TRỪ CHÍNH USER ĐANG SỬA)
    const emailInUse = await User.countDocuments({
      email: updateData.email,
      user_id: { $ne: user_id }  // bỏ qua chính user đang cập nhật
    });

    if (emailInUse > 0) {
      throw new Error('Email này đã tồn tại trong hệ thống (kể cả tài khoản đã bị vô hiệu hóa)');
    }

    const newPassword = generateRandomPassword();
    updateData.password = await hashPassword(newPassword);
    updateData.firstLogin = true;

    try {
      await sendMail({
        to: updateData.email,
        cc: user.email,
        subject: 'Thông báo: Thay đổi Email tài khoản trên HEPZA',
        html: getEmailResetTemplate(user.full_name, updateData.email, newPassword)
      });

      // Blacklist all access tokens and invalidate sessions
      await invalidateAllUserSessions(user_id, 'Tài khoản của bạn đã được cập nhật bởi admin, vui lòng đăng nhập lại với mật khẩu mới');

      // Log audit trail
      await cacheManager.lpush(`audit:${user_id}`, JSON.stringify({
        action: 'admin_reset_email',
        old_email: user.email,
        new_email: updateData.email,
        reason: updateData.reason,
        updated_by: currentUser.user_id,
        timestamp: new Date().toISOString(),
      }));
      await cacheManager.ltrim(`audit:${user_id}`, 0, 4);
    } catch (error) {
      console.error('Error sending reset email:', error);
      throw new Error('Gửi email đặt lại thất bại');
    }
  }

  // if (updateData.full_name || updateData.phone_number) {
  //   throw new Error('Full name and phone number must be updated via /profile');
  // }

  if (updateData.phone_number && updateData.phone_number !== user.phone_number) {
    const existingPhoneUser = await userRepository.findByPhoneNumber(updateData.phone_number);
    if (existingPhoneUser && existingPhoneUser.user_id !== user_id) {
      throw new Error('Số điện thoại đã được sử dụng bởi người dùng khác');
    }
  }

  // Thêm kiểm tra enforce 1 manager/zone khi update zone_id
  if (user.role === 'manager' && updateData.zone_id && updateData.zone_id !== user.zone_id) {
    // Kiểm tra zone mới chưa có manager
    const existingManagerInNewZone = await User.findOne({
      role: 'manager',
      zone_id: updateData.zone_id,
      user_id: { $ne: user_id },
      deleted_at: null,
    });
    if (existingManagerInNewZone) {
      throw new Error(`Zone ${updateData.zone_id} đã có manager quản lý. Không thể gán manager mới cho zone này.`);
    }

    // Kiểm tra zone tồn tại
    const zone = await industrialZoneRepository.findOne({ zone_id: updateData.zone_id, deleted_at: null });
    if (!zone) throw new Error(`Không tìm thấy khu công nghiệp với zone_id ${updateData.zone_id}`);
  }

  if (updateData.company_id && updateData.company_id !== user.company_id) {
    const company = await companyRepository.findOne({ company_id: updateData.company_id, deleted_at: null });
    if (!company) throw new Error(`Không tìm thấy công ty với company_id ${updateData.company_id}`);

    if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
      throw new Error('Manager chỉ được gán tài khoản doanh nghiệp trong khu công nghiệp đang quản lý.');
    }

    const companyUserCount = await countCompanyUserSlots(updateData.company_id);
    if (companyUserCount >= 3) {
      throw new Error(`Công ty ${updateData.company_id} đã đạt giới hạn tối đa 3 tài khoản người dùng.`);
    }
  }

  if (user.role === 'company' && updateData.company_id) {
    const company = await companyRepository.findOne({ company_id: updateData.company_id, deleted_at: null });
    if (!company) throw new Error(`Không tìm thấy công ty với company_id ${updateData.company_id}`);
    updateData.zone_id = company.zone_id;
  }

  if (updateData.status === 'inactive') {
    return await softDeleteUser(user_id, currentUser);
  }

  const filteredUpdateData = Object.keys(updateData)
    .filter(key => allowedFields[key])
    .reduce((obj, key) => {
      obj[key] = updateData[key];
      return obj;
    }, {});

  if (Object.keys(filteredUpdateData).length === 0) {
    throw new Error('Không có trường hợp lệ để cập nhật');
  }

  filteredUpdateData.updated_by = currentUser.user_id;

  // Handle transferring user_id between companies if the company_id changes
  if (user.role === 'company' && updateData.company_id !== undefined && updateData.company_id !== user.company_id) {
    const Company = require('../models/companyModel');
    if (user.company_id) {
      // Remove user_id from the old company
      await Company.findOneAndUpdate(
        { company_id: user.company_id },
        { $pull: { user_ids: user.user_id } }
      );
    }
    if (updateData.company_id) {
      // Assign user_id to the new company
      await Company.findOneAndUpdate(
        { company_id: updateData.company_id },
        { $addToSet: { user_ids: user.user_id } }
      );
    }
  }

  // Đồng bộ managers_ids khi thay đổi zone_id của manager
  if (user.role === 'manager' && updateData.zone_id !== undefined && updateData.zone_id !== user.zone_id) {
    const IndustrialZone = require('../models/industrialZoneModel');
    // Xóa user_id khỏi KCN cũ
    if (user.zone_id) {
      await IndustrialZone.findOneAndUpdate(
        { zone_id: user.zone_id, deleted_at: null },
        { $pull: { managers_ids: user.user_id } }
      );
    }
    // Thêm user_id vào KCN mới
    if (updateData.zone_id) {
      await IndustrialZone.findOneAndUpdate(
        { zone_id: updateData.zone_id, deleted_at: null },
        { $addToSet: { managers_ids: user.user_id } }
      );
    }
  }

  // ── Optimistic Locking ──────────────────────────────────────────
  const clientVersion = updateData.__v;
  let updatedUser;

  if (clientVersion === undefined || clientVersion === null) {
    throw new MissingVersionError();
  }

  updatedUser = await userRepository.updateUserWithVersion(
    user_id, clientVersion, filteredUpdateData
  );
  if (!updatedUser) {
    throw new VersionConflictError();
  }

  // ── Real-time sync via Socket.IO ────────────────────────────────
  try {
    const { getIo } = require('../config/socket'); // lazy-require
    const io = getIo();
    if (io) {
      io.emit('user:updated', {
        user_id,
        __v: updatedUser.__v,
        updated_by: currentUser.user_id
      });
    }
  } catch (_) { /* Socket emit is best-effort */ }

  // Clear user cache to prevent stale data
  await cacheManager.del(`user:${user_id}`);

  return {
    user: {
      user_id: updatedUser.user_id,
      full_name: updatedUser.full_name,
      phone_number: updatedUser.phone_number,
      email: updatedUser.email,
      role: updatedUser.role,
      firstLogin: updatedUser.firstLogin,
      company_id: updatedUser.company_id,
      zone_id: updatedUser.zone_id,
      __v: updatedUser.__v,
    },
  };
};

const softDeleteUser = async (user_id, currentUser, options = {}) => {
  const user = await userRepository.findByUserId(user_id);
  if (!user) throw new Error('Không tìm thấy người dùng');
  if (user.deleted_at) {
    throw new StateConflictError(buildStateConflictMessage('Tài khoản', 'vô hiệu hóa'));
  }
  assertManagerLifecycleManagedByZone(user, 'bị vô hiệu hóa');
  let representativeChangePayload = null;

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'company') {
    throw new Error('Bạn không có quyền xóa tài khoản');
  }

  if (currentUser.role === 'manager') {
    if (user.role === 'company' && user.company_id) {
      const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null });
      if (!company || company.zone_id !== currentUser.zone_id) {
        throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
      }
    } else {
      throw new Error('Manager không có quyền xóa loại tài khoản này');
    }
  }

  if (currentUser.role === 'company') {
    if (user.company_id !== currentUser.company_id || user.role !== 'company') {
      throw new Error('Bạn chỉ có quyền xóa tài khoản phụ thuộc doanh nghiệp của mình');
    }
    if (user.user_id === currentUser.user_id) {
      throw new Error('Bạn không thể tự xóa tài khoản chính của mình');
    }
  }

  const representativeRequirement = await getRepresentativeReplacementRequirement([user]);
  if (representativeRequirement) {
    const newRepresentativeUserId = options?.new_representative_user_id
      ? String(options.new_representative_user_id).trim()
      : '';

    if (!newRepresentativeUserId) {
      throw new Error('Vui lòng chọn người đại diện mới trước khi xóa tài khoản đại diện hiện tại.');
    }

    const isValidReplacement = representativeRequirement.replacementCandidates.some(
      (candidate) => candidate.user_id === newRepresentativeUserId
    );

    if (!isValidReplacement) {
      throw new Error('Người đại diện mới phải là nhân sự đang hoạt động thuộc cùng doanh nghiệp.');
    }

    await companyRepository.setRepresentativeUser(
      representativeRequirement.company.company_id,
      newRepresentativeUserId
    );

    representativeChangePayload = {
      company_id: representativeRequirement.company.company_id,
      zone_id: representativeRequirement.company.zone_id || null,
      previous_representative_user_id: representativeRequirement.representativeUserId || user.user_id,
      next_representative_user_id: newRepresentativeUserId,
      updated_by: currentUser?.user_id || null,
    };
  }

  const deletedUser = await userRepository.softDeleteUser(user_id, currentUser.user_id);
  if (!deletedUser) throw new Error('Xóa người dùng thất bại');

  await invalidateAllUserSessions(user.user_id, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
  await cacheManager.del(`audit:${user.user_id}`);

  // Xóa user_id khỏi managers_ids của KCN khi soft delete manager
  if (user.role === 'manager' && user.zone_id) {
    const IndustrialZone = require('../models/industrialZoneModel');
    await IndustrialZone.findOneAndUpdate(
      { zone_id: user.zone_id, deleted_at: null },
      { $pull: { managers_ids: user.user_id } }
    );
  }

  emitRepresentativeChanged(representativeChangePayload);

  return { message: 'User deleted successfully' };
};

const softDeleteUsers = async (user_ids, currentUser) => {
  if (!Array.isArray(user_ids) || user_ids.length === 0) throw new Error('Danh sách ID người dùng không được để trống');

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    throw new Error('Chỉ admin mới có quyền xóa tài khoản');
  }

  const users = await userRepository.find({ user_id: { $in: user_ids }, deleted_at: null });
  if (users.length !== user_ids.length) {
    throw new StateConflictError('Một hoặc nhiều tài khoản đã bị thay đổi trạng thái trước khi vô hiệu hóa. Vui lòng tải lại danh sách rồi thử lại.');
  }
  users.forEach((user) => assertManagerLifecycleManagedByZone(user, 'bị vô hiệu hóa'));

  if (currentUser.role === 'manager') {
    for (const currUser of users) {
      if (currUser.role !== 'company' || !currUser.company_id) {
        throw new Error('Manager không có quyền xóa loại tài khoản này');
      }
      const company = await companyRepository.findOne({ company_id: currUser.company_id, deleted_at: null });
      if (!company || company.zone_id !== currentUser.zone_id) {
        throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
      }
    }
  }

  await getRepresentativeReplacementRequirement(users);

  const result = await userRepository.updateMany(
    { user_id: { $in: user_ids }, deleted_at: null },
    { deleted_at: new Date(), deleted_by: currentUser.user_id }
  );

  for (const user of users) {
    await invalidateAllUserSessions(user.user_id, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
    await cacheManager.del(`audit:${user.user_id}`);
  }

  return { message: `${result.modifiedCount} users deleted successfully` };
};

const applyScopedUserFilters = (filters = {}, currentUser = null, role = null) => {
  const scopedFilters = { ...filters };

  if (!currentUser?.role) {
    return scopedFilters;
  }

  if (currentUser.role === 'company') {
    if (role && role !== 'company') {
      throw new Error('Bạn không có quyền truy cập loại tài khoản này');
    }
    scopedFilters.company = currentUser.company_id;
  }

  if (currentUser.role === 'manager') {
    if (role && role !== 'company') {
      throw new Error('Manager chỉ có quyền truy cập tài khoản doanh nghiệp');
    }
    scopedFilters.zone = currentUser.zone_id;
  }

  return scopedFilters;
};

const normalizeUserIds = (user_ids) => {
  if (Array.isArray(user_ids)) {
    return user_ids.map((id) => String(id).trim()).filter(Boolean);
  }

  if (typeof user_ids === 'string') {
    return user_ids.split(',').map((id) => id.trim()).filter(Boolean);
  }

  return [];
};

const assertUserAccess = async (user, currentUser) => {
  if (!currentUser?.role || currentUser.role === 'admin') {
    return;
  }

  if (currentUser.role === 'manager') {
    if (user.role !== 'company' || !user.company_id) {
      throw new Error('Manager không có quyền thao tác loại tài khoản này');
    }

    const targetZoneId = user.zone_id || (await companyRepository.findOne({ company_id: user.company_id }))?.zone_id;
    if (!targetZoneId || targetZoneId !== currentUser.zone_id) {
      throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
    }
    return;
  }

  if (currentUser.role === 'company') {
    if (user.role !== 'company' || user.company_id !== currentUser.company_id || user.user_id === currentUser.user_id) {
      throw new Error('Bạn chỉ có quyền thao tác tài khoản phụ thuộc doanh nghiệp của mình');
    }
    return;
  }

  throw new Error('Bạn không có quyền thực hiện thao tác này');
};

const getUsersByRole = async (role, page, limit, filters = {}, sort = {}, currentUser = null) => {
  const scopedFilters = applyScopedUserFilters(filters, currentUser, role);
  const skip = (page - 1) * limit;

  const totalCount = await userRepository.countUsers(role, scopedFilters);
  const totalPages = Math.ceil(totalCount / limit);

  const users = await userRepository.getUsersByRole(role, skip, limit, scopedFilters, sort);

  return {
    users,
    totalCount,
    totalPages,
    currentPage: page,
    limit
  };
};

const getUserById = async (user_id) => {
  const user = await userRepository.findByUserId(user_id);
  if (!user) throw new Error('Không tìm thấy người dùng');

  let companyRepresentativeMeta = {
    is_company_representative: false,
    representative_user_id: null,
  };

  if (user.role === 'company' && user.company_id) {
    const company = await companyRepository.findOne({ company_id: user.company_id });
    companyRepresentativeMeta = {
      is_company_representative: company?.representative_user_id === user.user_id,
      representative_user_id: company?.representative_user_id || null,
    };
  }

  return {
    user_id: user.user_id,
    full_name: user.full_name,
    phone_number: user.phone_number,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    zone_id: user.zone_id,
    firstLogin: user.firstLogin,
    __v: user.__v,
    ...companyRepresentativeMeta,
  };
};

const restoreUser = async (user_id, currentUser) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const user = await userRepository.findOne({ user_id }, session);
    if (!user) throw new Error('Không tìm thấy người dùng');
    if (!user.deleted_at) throw new StateConflictError(buildStateConflictMessage('Tài khoản', 'khôi phục'));
    assertManagerLifecycleManagedByZone(user, 'được khôi phục');

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      throw new Error('Chỉ admin mới có quyền khôi phục tài khoản');
    }

    if (currentUser.role === 'manager') {
      if (user.role === 'company' && user.company_id) {
        const companyX = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null }, session);
        if (!companyX || companyX.zone_id !== currentUser.zone_id) {
          throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
        }
      } else {
        throw new Error('Manager không có quyền khôi phục loại tài khoản này');
      }
    }

    // Kiểm tra xem công ty liên kết (nếu có) có đang hoạt động không và còn slot user hay không
    if (user.company_id && user.role === 'company') {
      const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null }, session);
      if (!company) {
        throw new Error(`Không thể khôi phục: Công ty ${user.company_id} chưa được khôi phục`);
      }

      const activeCompanyUsers = await User.countDocuments({
        company_id: user.company_id,
        role: 'company',
        deleted_at: null,
      }).session(session);

      if (activeCompanyUsers >= 3) {
        throw new Error(`Không thể khôi phục: Công ty ${user.company_id} đã đạt tối đa 3 tài khoản hoạt động.`);
      }
    }
    else if (user.company_id) {
      const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null }, session);
      if (!company) {
        throw new Error(`Không thể khôi phục: Công ty ${user.company_id} chưa được khôi phục`);
      }
    }

    // Kiểm tra xem zone của manager (nếu có) đã có manager khác chưa
    if (user.role === 'manager' && user.zone_id) {
      const existingManager = await userRepository.findOne({
        zone_id: user.zone_id,
        role: 'manager',
        deleted_at: null
      }, session);
      if (existingManager) {
        throw new Error(`Không thể khôi phục manager: Zone ${user.zone_id} đã có manager đang hoạt động.`);
      }
    }

    const restoredUser = await userRepository.restoreUser(user_id, session);

    if (user.role === 'company' && user.company_id) {
      await resolveCompanyRepresentativeState(user.company_id, session);
    }

    // Thêm lại user_id vào managers_ids của KCN khi restore manager
    if (user.role === 'manager' && user.zone_id) {
      const IndustrialZone = require('../models/industrialZoneModel');
      await IndustrialZone.findOneAndUpdate(
        { zone_id: user.zone_id, deleted_at: null },
        { $addToSet: { managers_ids: user.user_id } },
        { session }
      );
    }

    await session.commitTransaction();
    return { message: 'User restored successfully', user: restoredUser };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateMyProfile = async (userId, updateData, currentPassword) => {
  const user = await userRepository.findByUserId(userId);
  if (!user) throw new Error('Không tìm thấy người dùng');

  const allowedFields = ['full_name', 'phone_number', 'email'];
  const filteredUpdateData = {};

  for (const key of Object.keys(updateData)) {
    if (allowedFields.includes(key)) {
      filteredUpdateData[key] = updateData[key];
    }
  }

  // Normalize email BEFORE comparison with existing email
  if (filteredUpdateData.email) {
    filteredUpdateData.email = filteredUpdateData.email.trim().toLowerCase();
  }
  const emailUpdateRequested = !!(filteredUpdateData.email && filteredUpdateData.email !== user.email);

  if (Object.keys(filteredUpdateData).length === 0) {
    throw new Error('Không có trường hợp lệ để cập nhật');
  }

  // Kiểm tra định dạng và trùng lặp cho full_name
  if (filteredUpdateData.full_name) {
    if (typeof filteredUpdateData.full_name !== 'string' || filteredUpdateData.full_name.length < 2) {
      throw new Error('Họ và tên phải có ít nhất 2 ký tự');
    }
  }

  // Kiểm tra định dạng và trùng lặp cho phone_number
  if (filteredUpdateData.phone_number) {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(filteredUpdateData.phone_number)) {
      throw new Error('Số điện thoại không hợp lệ');
    }
    // Kiểm tra trùng phone_number
    if (filteredUpdateData.phone_number !== user.phone_number) {
      const existingPhoneUser = await userRepository.findByPhoneNumber(filteredUpdateData.phone_number);
      if (existingPhoneUser && existingPhoneUser.user_id !== userId) {
        throw new Error('Số điện thoại đã được sử dụng bởi người dùng khác');
      }
    }
  }

  // Kiểm tra định dạng và trùng lặp cho email
  if (filteredUpdateData.email && filteredUpdateData.email !== user.email) {
    // Normalize email
    filteredUpdateData.email = filteredUpdateData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(filteredUpdateData.email)) {
      throw new Error('Định dạng email không hợp lệ');
    }
    // Kiểm tra trùng email
    const existingEmailUser = await userRepository.findByEmail(filteredUpdateData.email);
    if (existingEmailUser && existingEmailUser.user_id !== userId) {
      throw new Error('Email đã được sử dụng bởi người dùng khác');
    }
  }

  const nonEmailUpdateData = { ...filteredUpdateData };
  delete nonEmailUpdateData.email;
  let updatedUser = user;

  if (Object.keys(nonEmailUpdateData).length > 0) {
    nonEmailUpdateData.updated_by = userId;
    updatedUser = await userRepository.updateUser(userId, nonEmailUpdateData);
  }

  const userResponse = {
    user_id: updatedUser.user_id,
    full_name: updatedUser.full_name,
    phone_number: updatedUser.phone_number,
    email: updatedUser.email,
    role: updatedUser.role,
    firstLogin: updatedUser.firstLogin,
    company_id: updatedUser.company_id,
    zone_id: updatedUser.zone_id,
  };

  if (emailUpdateRequested) {
    if (!currentPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại để thay đổi email');
    }
    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }

    const otp = generateOtp();
    await cacheManager.set(`otp:${userId}`, otp, 10 * 60);
    await cacheManager.set(`pending_email:${userId}`, filteredUpdateData.email, 10 * 60);
    await cacheManager.set(`old_email:${userId}`, user.email, 10 * 60);

    try {
      await sendMail({
        to: filteredUpdateData.email,
        subject: 'Xác thực Email mới cho tài khoản HEPZA',
        html: getOtpTemplate(user.full_name, otp)
      });
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw new Error('Gửi email OTP thất bại, vui lòng thử lại');
    }

    return {
      updatedUser: { ...userResponse, otpRequired: true },
      authToken: null,
    };
  }

  // Khi không update email, tạo authToken mới và cập nhật session
  const payload = {
    user_id: updatedUser.user_id,
    full_name: updatedUser.full_name,
    phone_number: updatedUser.phone_number,
    email: updatedUser.email,
    role: updatedUser.role,
    firstLogin: updatedUser.firstLogin,
    company_id: updatedUser.company_id, // Add this
    zone_id: updatedUser.zone_id,       // Add this
  };
  const authToken = jwt.sign(payload, process.env.JWT_SECRET, buildJwtSignOptions({ expiresIn: '15m' }));

  // Lấy refreshToken hiện tại từ session
  const sessionKeys = await cacheManager.hkeys(`session:${userId}`);
  let currentRefreshToken = sessionKeys[0]; // Lấy refreshToken đầu tiên (giả sử chỉ có 1 session)

  if (currentRefreshToken) {
    // Lấy session data hiện tại
    const sessionData = await cacheManager.hget(`session:${userId}`, currentRefreshToken);
    if (sessionData) {
      // Cập nhật chỉ authToken trong session, giữ nguyên các field khác và TTL
      sessionData.authToken = authToken;
      await cacheManager.hset(`session:${userId}`, currentRefreshToken, sessionData);
    }
  } else {
    // Nếu không có session, tạo mới (hiếm xảy ra, nhưng để an toàn)
    currentRefreshToken = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      refreshToken: currentRefreshToken,
      authToken,
      user_id: userId,
      fingerprint: user.fingerprint || 'unknown', // Lấy từ user hoặc mặc định
      role: user.role,
      email: user.email,
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    };
    await cacheManager.hset(`session:${userId}`, currentRefreshToken, sessionData, 4 * 60 * 60);
    await cacheManager.set(`refresh:${currentRefreshToken}`, userId, 4 * 60 * 60);
  }

  // Fetch full user details with joins (zone_name, company_name)
  const fullUpdatedUser = await userRepository.getUserById(userId);

  // Cập nhật cache user với đầy đủ thông tin
  await cacheManager.set(
    `user:${userId}`,
    fullUpdatedUser,
    15 * 60
  );

  return {
    updatedUser: { ...fullUpdatedUser, otpRequired: false },
    authToken,
  };
};

const verifyEmailOtp = async (userId, otp) => {
  const user = await userRepository.findByUserId(userId);
  if (!user) throw new Error('Không tìm thấy người dùng');

  const storedOtp = await cacheManager.get(`otp:${userId}`);

  const storedOtpStr = storedOtp != null ? String(storedOtp) : null;
  const requestedOtpStr = String(otp);

  if (!storedOtpStr || storedOtpStr !== requestedOtpStr) {
    throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn');
  }

  const newEmail = await cacheManager.get(`pending_email:${userId}`);
  const oldEmail = await cacheManager.get(`old_email:${userId}`);
  if (!newEmail || !oldEmail) {
    throw new Error('Phiên cập nhật email đã hết hạn, vui lòng thử lại');
  }

  const newPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(newPassword);
  const updateData = {
    email: newEmail,
    password: hashedPassword,
    firstLogin: true,
    updated_by: userId,
  };

  try {
    await sendMail({
      to: newEmail,
      subject: 'Cập nhật thông tin tài khoản HEPZA thành công',
      html: getUpdatedCredentialsTemplate(user.full_name, newPassword)
    });

    await invalidateAllUserSessions(userId, 'Email của bạn đã được cập nhật, vui lòng đăng nhập lại với mật khẩu mới');

    // Log audit trail    
    await cacheManager.lpush(`audit:${userId}`, JSON.stringify({
      action: 'update_email',
      old_email: oldEmail,
      new_email: newEmail,
      updated_by: userId,
      timestamp: new Date().toISOString(),
    }));
    await cacheManager.ltrim(`audit:${userId}`, 0, 4);

    await cacheManager.del(`otp:${userId}`);
    await cacheManager.del(`pending_email:${userId}`);
    await cacheManager.del(`old_email:${userId}`);
  } catch (error) {
    console.error('Error sending new password email:', error);
    throw new Error('Gửi email mật khẩu mới thất bại');
  }

  const updatedUser = await userRepository.updateUser(userId, updateData);
  return {
    user: {
      user_id: updatedUser.user_id,
      full_name: updatedUser.full_name,
      phone_number: updatedUser.phone_number,
      email: updatedUser.email,
      role: updatedUser.role,
      firstLogin: updatedUser.firstLogin,
      company_id: updatedUser.company_id,
      zone_id: updatedUser.zone_id,
    },
    logoutRequired: true, // Thêm flag để FE biết cần logout
  };
};

const hardDeleteUser = async (user_id, currentUser, options = {}) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'company') {
    throw new Error('Chỉ admin mới có quyền xóa vĩnh viễn tài khoản');
  }

  const requireSoftDelete = currentUser.role !== 'company';
  const user = await userRepository.findOne({ user_id });
  if (!user) throw new Error('Không tìm thấy người dùng');
  if (requireSoftDelete && !user.deleted_at) {
    throw new StateConflictError(buildStateConflictMessage('Tài khoản', 'xóa vĩnh viễn'));
  }
  assertManagerLifecycleManagedByZone(user, 'bị xóa vĩnh viễn');
  let representativeChangePayload = null;

  if (currentUser.role === 'manager') {
    if (user.role === 'company' && user.company_id) {
      const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null });
      if (!company || company.zone_id !== currentUser.zone_id) {
        throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
      }
    } else {
      throw new Error('Manager không có quyền xóa loại tài khoản này');
    }
  }

  if (currentUser.role === 'company') {
    if (user.company_id !== currentUser.company_id || user.role !== 'company') {
      throw new Error('Bạn chỉ có quyền xóa vĩnh viễn tài khoản phụ thuộc doanh nghiệp của mình');
    }
    if (user.user_id === currentUser.user_id) {
      throw new Error('Bạn không thể tự xóa vĩnh viễn tài khoản chính của mình');
    }

    const currentPassword = options?.current_password ? String(options.current_password).trim() : '';
    if (!currentPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại để xác nhận gỡ nhân sự');
    }

    const currentUserDoc = await userRepository.findByUserId(currentUser.user_id);
    if (!currentUserDoc) {
      throw new Error('Không thể xác minh tài khoản hiện tại');
    }

    const isPasswordValid = await verifyPassword(currentPassword, currentUserDoc.password);
    if (!isPasswordValid) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }
  }

  const representativeRequirement = await getRepresentativeReplacementRequirement([user]);
  if (representativeRequirement) {
    const newRepresentativeUserId = options?.new_representative_user_id
      ? String(options.new_representative_user_id).trim()
      : '';

    if (!newRepresentativeUserId) {
      throw new Error('Vui lòng chọn người đại diện mới trước khi xóa tài khoản đại diện hiện tại.');
    }

    const isValidReplacement = representativeRequirement.replacementCandidates.some(
      (candidate) => candidate.user_id === newRepresentativeUserId
    );

    if (!isValidReplacement) {
      throw new Error('Người đại diện mới phải là nhân sự đang hoạt động thuộc cùng doanh nghiệp.');
    }

    await companyRepository.setRepresentativeUser(
      representativeRequirement.company.company_id,
      newRepresentativeUserId
    );

    representativeChangePayload = {
      company_id: representativeRequirement.company.company_id,
      zone_id: representativeRequirement.company.zone_id || null,
      previous_representative_user_id: representativeRequirement.representativeUserId || user.user_id,
      next_representative_user_id: newRepresentativeUserId,
      updated_by: currentUser?.user_id || null,
    };
  }

  const businessSymbiosisTransfer = await transferOwnedBusinessSymbiosisIfNeeded(user);

  const result = await userRepository.hardDeleteUser(user_id, requireSoftDelete);
  if (result.deletedCount === 0) {
    throw new Error('Xóa vĩnh viễn người dùng thất bại');
  }

  await invalidateAllUserSessions(user.user_id, 'Tài khoản của bạn đã bị xóa khỏi hệ thống.');

  if (user.role === 'company' && user.company_id) {
    const Company = require('../models/companyModel');
    await Company.findOneAndUpdate(
      { company_id: user.company_id },
      { $pull: { user_ids: user.user_id } }
    );
    await companyRepository.unsetRepresentativeUserIfMatches(user.company_id, user.user_id);
  }

  // Xóa user_id khỏi managers_ids của KCN khi hard delete manager
  if (user.role === 'manager' && user.zone_id) {
    const IndustrialZone = require('../models/industrialZoneModel');
    await IndustrialZone.findOneAndUpdate(
      { zone_id: user.zone_id },
      { $pull: { managers_ids: user.user_id } }
    );
  }

  // Xóa các dữ liệu liên quan trong cache
  await cacheManager.del(`user:${user_id}`);
  await cacheManager.del(`audit:${user_id}`);

  emitRepresentativeChanged(representativeChangePayload);

  return {
    message: 'User permanently deleted successfully',
    businessSymbiosisTransfer,
  };
};

const hardDeleteUsers = async (user_ids, currentUser) => {
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new Error('Danh sách ID người dùng không được để trống');
  }
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    throw new Error('Chỉ admin mới có quyền xóa vĩnh viễn tài khoản');
  }

  // Kiểm tra tất cả user có thực sự đã bị soft delete chưa
  const users = await userRepository.find({
    user_id: { $in: user_ids },
    deleted_at: { $ne: null }
  });

  if (users.length !== user_ids.length) {
    throw new StateConflictError('Một hoặc nhiều tài khoản đã thay đổi trạng thái trước khi xóa vĩnh viễn. Vui lòng tải lại danh sách rồi thử lại.');
  }
  users.forEach((user) => assertManagerLifecycleManagedByZone(user, 'bị xóa vĩnh viễn'));

  if (currentUser.role === 'manager') {
    for (const currUser of users) {
      if (currUser.role !== 'company' || !currUser.company_id) {
        throw new Error('Manager không có quyền xóa loại tài khoản này');
      }
      const company = await companyRepository.findOne({ company_id: currUser.company_id, deleted_at: null });
      if (!company || company.zone_id !== currentUser.zone_id) {
        throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
      }
    }
  }

  await getRepresentativeReplacementRequirement(users);

  const businessSymbiosisTransfers = [];
  for (const user of users) {
    const transferResult = await transferOwnedBusinessSymbiosisIfNeeded(user);
    if (transferResult) {
      businessSymbiosisTransfers.push({
        user_id: user.user_id,
        company_id: user.company_id,
        ...transferResult,
      });
    }
  }

  const result = await userRepository.hardDeleteUsers(user_ids);

  for (const user of users) {
    await invalidateAllUserSessions(user.user_id, 'Tài khoản của bạn đã bị xóa khỏi hệ thống.');
  }

  for (const user of users) {
    if (user.role === 'company' && user.company_id) {
      const Company = require('../models/companyModel');
      await Company.findOneAndUpdate(
        { company_id: user.company_id },
        { $pull: { user_ids: user.user_id } }
      );
      await companyRepository.unsetRepresentativeUserIfMatches(user.company_id, user.user_id);
    }
  }

  // Dọn dẹp cache cho từng user
  for (const user_id of user_ids) {
    await cacheManager.del(`user:${user_id}`);
    await cacheManager.del(`audit:${user_id}`);
  }

  return {
    message: `${result.deletedCount} users permanently deleted successfully`,
    businessSymbiosisTransfers,
  };
};

const getSoftDeletedUsers = async (role, page = 1, limit = 10, filters = {}, currentUser = null) => {
  const scopedFilters = applyScopedUserFilters(filters, currentUser, role);
  const skip = (page - 1) * limit;

  const totalCount = await userRepository.countSoftDeletedUsers(role, scopedFilters);
  const totalPages = Math.ceil(totalCount / limit);

  const users = await userRepository.getSoftDeletedUsers(role, skip, limit, scopedFilters);

  return {
    users,
    totalCount,
    totalPages,
    currentPage: page,
    limit
  };
};

const restoreUsers = async (user_ids, currentUser) => {
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new Error('Danh sách ID người dùng không được để trống');
  }
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    throw new Error('Bạn không có quyền khôi phục tài khoản');
  }

  const session = await User.startSession();
  session.startTransaction();
  try {
    // Kiểm tra tất cả user có thực sự bị soft delete chưa
    const users = await userRepository.find({
      user_id: { $in: user_ids },
      deleted_at: { $ne: null }
    }, session);

    if (users.length !== user_ids.length) {
      throw new StateConflictError('Một hoặc nhiều tài khoản đã thay đổi trạng thái trước khi khôi phục. Vui lòng tải lại danh sách rồi thử lại.');
    }
    users.forEach((user) => assertManagerLifecycleManagedByZone(user, 'được khôi phục'));

    // Kiểm tra ràng buộc: manager không được trùng zone
    const managerConflicts = [];
    const pendingCompanyRestores = new Map();
    for (const user of users) {
      // Scoping check for manager
      if (currentUser.role === 'manager') {
        if (user.role === 'company' && user.company_id) {
          const companyX = await companyRepository.findOne({ company_id: user.company_id }, session);
          if (!companyX || companyX.zone_id?.toString() !== currentUser.zone_id?.toString()) {
            throw new Error(`Manager không có quyền khôi phục tài khoản ${user.user_id} ngoài khu công nghiệp quản lý`);
          }
        } else {
          throw new Error(`Manager không có quyền khôi phục loại tài khoản ${user.user_id}`);
        }
      }

      if (user.role === 'manager' && user.zone_id) {
        const activeManager = await userRepository.findOne({
          zone_id: user.zone_id,
          role: 'manager',
          deleted_at: null
        }, session);
        if (activeManager) {
          managerConflicts.push(user.zone_id);
        }
      }

      // Kiểm tra company còn tồn tại không và có đại diện chưa
      if (user.company_id && user.role === 'company') {
        const company = await companyRepository.findOne({
          company_id: user.company_id,
          deleted_at: null
        }, session);
        if (!company) {
          throw new Error(`Không thể khôi phục ${user.user_id}: Công ty ${user.company_id} đã bị xóa`);
        }

        const activeCompanyUsers = await User.countDocuments({
          company_id: user.company_id,
          role: 'company',
          deleted_at: null,
        }).session(session);
        const pendingRestores = pendingCompanyRestores.get(user.company_id) || 0;
        if (activeCompanyUsers + pendingRestores >= 3) {
          throw new Error(`Không thể khôi phục ${user.user_id}: Công ty ${user.company_id} đã đạt tối đa 3 tài khoản hoạt động.`);
        }
        pendingCompanyRestores.set(user.company_id, pendingRestores + 1);
      } else if (user.company_id) {
        const company = await companyRepository.findOne({
          company_id: user.company_id,
          deleted_at: null
        }, session);
        if (!company) {
          throw new Error(`Không thể khôi phục ${user.user_id}: Công ty ${user.company_id} đã bị xóa`);
        }
      }
    }

    if (managerConflicts.length > 0) {
      throw new Error(`Không thể khôi phục manager: Zone ${managerConflicts.join(', ')} đã có manager đang hoạt động`);
    }

    const result = await userRepository.restoreUsers(user_ids, currentUser.user_id, session);

    for (const company_id of pendingCompanyRestores.keys()) {
      await resolveCompanyRepresentativeState(company_id, session);
    }

    await session.commitTransaction();

    return {
      message: `${result.modifiedCount} users restored successfully`
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const previewSoftDeleteUsers = async (user_ids, currentUser = null) => {
  const normalizedUserIds = normalizeUserIds(user_ids);
  if (normalizedUserIds.length === 0) {
    return {
      users: [],
      totalUsers: 0,
      requiresRepresentativeReplacement: false,
      replacementOptions: [],
    };
  }

  const users = await userRepository.find({ user_id: { $in: normalizedUserIds }, deleted_at: null });
  for (const user of users) {
    assertManagerLifecycleManagedByZone(user, 'bị vô hiệu hóa');
    await assertUserAccess(user, currentUser);
  }

  const representativeRequirement = await getRepresentativeReplacementRequirement(users);
  const usersPreview = users.map((user) => ({
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    is_representative: representativeRequirement?.representativeUserId === user.user_id,
  }));

  return {
    action: 'soft-delete',
    totalUsers: usersPreview.length,
    users: usersPreview,
    requiresRepresentativeReplacement: !!representativeRequirement,
    replacementOptions: representativeRequirement
      ? representativeRequirement.replacementCandidates.map(mapRepresentativeCandidate)
      : [],
    representativeContext: representativeRequirement
      ? {
        company_id: representativeRequirement.company.company_id,
        company_name: representativeRequirement.company.company_name,
        current_representative_user_id: representativeRequirement.representativeUserId,
        current_representative_name: representativeRequirement.user.full_name,
      }
      : null,
  };
};

const previewHardDeleteUsers = async (user_ids, currentUser = null) => {
  const normalizedUserIds = normalizeUserIds(user_ids);
  if (normalizedUserIds.length === 0) {
    return {
      users: [],
      totalUsers: 0,
      requiresRepresentativeReplacement: false,
      replacementOptions: [],
    };
  }

  const previewQuery = currentUser?.role === 'company'
    ? { user_id: { $in: normalizedUserIds } }
    : { user_id: { $in: normalizedUserIds }, deleted_at: { $ne: null } };
  const users = await userRepository.find(previewQuery);
  for (const user of users) {
    assertManagerLifecycleManagedByZone(user, 'bị xóa vĩnh viễn');
    await assertUserAccess(user, currentUser);
  }

  const representativeRequirement = await getRepresentativeReplacementRequirement(users);
  const usersPreview = users.map((user) => ({
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    is_representative: representativeRequirement?.representativeUserId === user.user_id,
  }));

  return {
    action: 'hard-delete',
    totalUsers: usersPreview.length,
    users: usersPreview,
    requiresRepresentativeReplacement: !!representativeRequirement,
    replacementOptions: representativeRequirement
      ? representativeRequirement.replacementCandidates.map(mapRepresentativeCandidate)
      : [],
    representativeContext: representativeRequirement
      ? {
        company_id: representativeRequirement.company.company_id,
        company_name: representativeRequirement.company.company_name,
        current_representative_user_id: representativeRequirement.representativeUserId,
        current_representative_name: representativeRequirement.user.full_name,
      }
      : null,
  };
};

const adminResetPassword = async (user_id, currentUser) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    throw new Error('Bạn không có quyền đặt lại mật khẩu');
  }

  const user = await userRepository.findByUserId(user_id);
  if (!user) throw new Error('Không tìm thấy người dùng');
  if (!user.email) throw new Error('Người dùng chưa có email, không thể đặt lại mật khẩu');

  if (currentUser.role === 'manager') {
    if (user.role !== 'company' || !user.company_id) {
      throw new Error('Manager chỉ được đặt lại mật khẩu cho tài khoản doanh nghiệp');
    }

    const company = await companyRepository.findOne({ company_id: user.company_id, deleted_at: null });
    if (!company || String(company.zone_id) !== String(currentUser.zone_id)) {
      throw new Error('Manager chỉ được thao tác tài khoản thuộc khu công nghiệp quản lý');
    }
  }

  const newPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(newPassword);

  await userRepository.updateUser(user_id, {
    password: hashedPassword,
    firstLogin: true,
    updated_by: currentUser.user_id,
  });

  // Invalidate all existing sessions
  await invalidateAllUserSessions(
    user_id,
    currentUser.role === 'manager'
      ? 'Ban quản lý đã đặt lại mật khẩu tài khoản'
      : 'Admin đã đặt lại mật khẩu tài khoản'
  );

  // Clear user cache
  await cacheManager.del(`user:${user_id}`);

  // Send email with new password
  try {
    await sendMail({
      to: user.email,
      subject: 'Thông báo: Mật khẩu tài khoản HEPZA đã được đặt lại',
      html: getWelcomeTemplate(user.full_name, newPassword)
    });
  } catch (error) {
    console.error('Error sending reset email:', error);
    // Không throw - password đã được reset thành công, chỉ email fail
  }

  return { message: 'Mật khẩu đã được đặt lại và gửi đến email người dùng' };
};

module.exports = {
  createUser,
  updateUser,
  softDeleteUser,
  softDeleteUsers,
  getUsersByRole,
  getUserById,
  restoreUser,
  updateMyProfile,
  verifyEmailOtp,
  hardDeleteUser,
  hardDeleteUsers,
  getSoftDeletedUsers,
  restoreUsers,
  previewSoftDeleteUsers,
  previewHardDeleteUsers,
  adminResetPassword
};
