const { registerDomainHandlers } = require('./registerDomainHandlers');

const getActor = (socket) => socket.userDetails || socket.user || {};
const getUserService = () => require('../services/userService');

const safeParse = (val, fallback = {}) => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const registerUserHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'user:create',
      execute: async ({ payload }) => getUserService().createUser(payload?.userData || payload, getActor(socket)),
    },
    {
      event: 'user:update',
      execute: async ({ payload }) => getUserService().updateUser(payload?.user_id, payload?.updateData || payload, getActor(socket)),
    },
    {
      event: 'user:deleteOne',
      execute: async ({ payload }) => getUserService().softDeleteUser(payload?.user_id, getActor(socket), payload || {}),
    },
    {
      event: 'user:deleteMany',
      execute: async ({ payload }) => getUserService().softDeleteUsers(payload?.user_ids || [], getActor(socket)),
    },
    {
      event: 'user:getByRole',
      execute: async ({ payload }) => {
        const { role, page = 1, limit = 10, filters, sort } = payload || {};
        return getUserService().getUsersByRole(role, page, limit, safeParse(filters), safeParse(sort), getActor(socket));
      },
    },
    {
      event: 'user:getById',
      execute: async ({ payload }) => {
        const user = await getUserService().getUserById(payload?.user_id);
        return { message: 'User retrieved successfully', user };
      },
    },
    {
      event: 'user:restoreOne',
      execute: async ({ payload }) => getUserService().restoreUser(payload?.user_id, getActor(socket)),
    },
    {
      event: 'user:restoreMany',
      execute: async ({ payload }) => getUserService().restoreUsers(payload?.user_ids || [], getActor(socket)),
    },
    {
      event: 'user:profile:update',
      execute: async ({ payload }) => getUserService().updateMyProfile(getActor(socket).user_id, payload?.updateData || payload, payload?.currentPassword),
    },
    {
      event: 'user:profile:verifyEmailOtp',
      execute: async ({ payload }) => getUserService().verifyEmailOtp(payload?.user_id || getActor(socket).user_id, payload?.otp),
    },
    {
      event: 'user:getDeletedByRole',
      execute: async ({ payload }) => {
        const { role, page = 1, limit = 10, filters } = payload || {};
        return getUserService().getSoftDeletedUsers(role, page, limit, safeParse(filters), getActor(socket));
      },
    },
    {
      event: 'user:hardDeleteOne',
      execute: async ({ payload }) => getUserService().hardDeleteUser(payload?.user_id, getActor(socket), payload || {}),
    },
    {
      event: 'user:hardDeleteMany',
      execute: async ({ payload }) => getUserService().hardDeleteUsers(payload?.user_ids || [], getActor(socket)),
    },
    {
      event: 'user:previewSoftDelete',
      execute: async ({ payload }) => getUserService().previewSoftDeleteUsers(payload?.user_ids || [], getActor(socket)),
    },
    {
      event: 'user:previewHardDelete',
      execute: async ({ payload }) => getUserService().previewHardDeleteUsers(payload?.user_ids || [], getActor(socket)),
    },
  ]);
};

module.exports = { registerUserHandlers };
