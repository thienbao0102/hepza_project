const cacheManager = require('../lib/cacheManager');
const { getIo } = require('../config/socket');

const invalidateAllUserSessions = async (userId, message) => {
    let io;
    try {
        io = getIo();
    } catch (error) {
        console.error('Socket not initialized:', error.message);
    }

    const sessions = await cacheManager.hgetall(`session:${userId}`);

    // Lấy ra tất cả các field (chính là các refresh token)
    const refreshTokens = Object.keys(sessions || {});

    for (const refreshToken of refreshTokens) {
        // FIX: Lấy dữ liệu của session tương ứng với refreshToken hiện tại
        const sessionData = sessions[refreshToken];

        // Giờ sessionData là { authToken: "...", ... }
        if (sessionData?.authToken) {
            // Thêm access token vào blacklist để vô hiệu hóa ngay lập tức
            await cacheManager.set(`blacklist:${sessionData.authToken}`, true, 15 * 60);
        }
        // Xóa con trỏ từ refresh token -> user_id
        await cacheManager.del(`refresh:${refreshToken}`);
    }

    // Xóa tất cả dữ liệu session của người dùng
    await cacheManager.del(`session:${userId}`);
    await cacheManager.del(`user:${userId}`);
    await cacheManager.del(`csrf:${userId}`);

    if (io) {
        // Gửi sự kiện đến tất cả các kết nối socket của người dùng
        io.to(`user:${userId}`).emit('token_invalidated', { message });
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        for (const socket of sockets) {
            socket.disconnect(true);
        }
    } else {
        console.warn(`Socket not available, could not emit token_invalidated for user:${userId}`);
    }
};

async function clearSession(user_id, refreshToken, authToken) {
    let io;
    try {
        io = getIo();
    } catch (error) {
        console.error('Failed to get Socket.io in logoutUser:', error.message);
    }

    let tokenToBlacklist = authToken;
    let finalUserId = user_id;

    // Blacklist authToken ngay nếu có, không phụ thuộc vào user_id hoặc io
    if (tokenToBlacklist) {
        await cacheManager.set(`blacklist:${tokenToBlacklist}`, true, 15 * 60);
    }

    // Nếu không có user_id, thử lấy từ refreshToken
    if (!finalUserId && refreshToken) {
        const userIdFromCache = await cacheManager.get(`refresh:${refreshToken}`);
        if (userIdFromCache) {
            finalUserId = userIdFromCache; // Gán trực tiếp, không cần verify JWT

            // Lấy authToken từ session để blacklist nếu cần
            const sessionData = await cacheManager.hget(`session:${finalUserId}`, refreshToken);
            tokenToBlacklist = sessionData?.authToken || tokenToBlacklist;
            
            if (tokenToBlacklist && tokenToBlacklist !== authToken) {
                await cacheManager.set(`blacklist:${tokenToBlacklist}`, true, 15 * 60);
            }
        }
    }

    // Nếu có user_id, xóa session Redis
    if (finalUserId) {
        const oldRefreshTokens = await cacheManager.hkeys(`session:${finalUserId}`);
        await cacheManager.del(`session:${finalUserId}`);
        await cacheManager.del(`csrf:${finalUserId}`); // Xóa CSRF token
        for (const oldToken of oldRefreshTokens) {
            await cacheManager.del(`refresh:${oldToken}`);
        }
        await cacheManager.del(`user:${finalUserId}`);
    }

    // Gửi socket token_invalidated nếu có io và user_id
    if (io && finalUserId) {
        io.to(`user:${finalUserId}`).emit('token_invalidated', {
            message: 'Đăng xuất thành công',
        });
    }

    return { message: 'Logout successful' };
};

module.exports = { invalidateAllUserSessions, clearSession };