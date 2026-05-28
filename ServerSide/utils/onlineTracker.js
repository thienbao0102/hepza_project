const cacheManager = require('../lib/cacheManager');

// Thêm user vào các room online tương ứng của Redis
const addOnlineUser = async (user) => {
    if (!user || !user.user_id) return;
    await cacheManager.sadd('online_users_all', user.user_id);
};

// Xóa user khỏi các room online tương ứng của Redis
const removeOnlineUser = async (user) => {
    if (!user || !user.user_id) return;
    await cacheManager.srem('online_users_all', user.user_id);
};

const pruneStaleOnlineUsers = async (io, userIds = []) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
    }

    const normalizedUserIds = [...new Set(userIds.map((userId) => String(userId)).filter(Boolean))];
    if (!io) {
        return normalizedUserIds;
    }

    const User = require('../models/userModel');
    const activeUserIds = [];

    for (const userId of normalizedUserIds) {
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        if (sockets.length > 0) {
            activeUserIds.push(userId);
            continue;
        }

        const user = await User.findOne({ user_id: userId }).lean();
        if (user) {
            await removeOnlineUser(user);
        } else {
            await cacheManager.srem('online_users_all', userId);
        }
    }

    return activeUserIds;
};

// Phát thanh số lượng user đang online cho các nhóm quyền
const broadcastCounts = async (io) => {
    if (!io) return;
    try {
        const countAll = await cacheManager.scard('online_users_all');
        io.to('role:admin').emit('online_count:updated', countAll);
    } catch (err) {
        console.error('Broadcast counts error:', err);
    }
};

module.exports = {
    addOnlineUser,
    removeOnlineUser,
    pruneStaleOnlineUsers,
    broadcastCounts
};
