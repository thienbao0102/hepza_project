const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const cacheManager = require('../lib/cacheManager');
const cookie = require('cookie'); // Để parse cookies từ headers
const logger = require('../utils/logger');
const { pubClient } = require('../config/redis');
const { registerSymbiosisHandlers } = require('../socketHandlers/symbiosisSocketHandler');
const { registerCompanyHandlers } = require('../socketHandlers/companySocketHandler');
const { registerUserHandlers } = require('../socketHandlers/userSocketHandler');
const { registerZoneHandlers } = require('../socketHandlers/zoneSocketHandler');
const { registerIndustryHandlers } = require('../socketHandlers/industrySocketHandler');
const { registerResourceWasteHandlers } = require('../socketHandlers/resourceWasteSocketHandler');
const { registerNotificationHandlers } = require('../socketHandlers/notificationSocketHandler');
const { registerRegulationHandlers } = require('../socketHandlers/regulationSocketHandler');
const { registerSolutionHandlers } = require('../socketHandlers/solutionSocketHandler');
const { registerSummaryHandlers } = require('../socketHandlers/summarySocketHandler');
const { registerEmissionHandlers } = require('../socketHandlers/emissionSocketHandler');
const { registerExportHandlers } = require('../socketHandlers/exportSocketHandler');
const { registerHashtagHandlers } = require('../socketHandlers/hashtagSocketHandler');
const { registerErrorLogHandlers } = require('../socketHandlers/errorLogSocketHandler');
const { addOnlineUser, removeOnlineUser, broadcastCounts } = require('../utils/onlineTracker');
const { registerEnterpriseListHandlers } = require('../socketHandlers/enterpriseListSocketHandler');
const { JWT_VERIFY_OPTIONS } = require('../utils/jwtOptions');
const {
    markSocketAuthFailure,
    trackSocketConnection,
    trackSocketDisconnection,
} = require('../monitoring/metrics');

let io;

const setupPubSubListener = () => {
    pubClient.removeAllListeners('message');

    pubClient.on('message', (channel, message) => {
        if (channel === 'new-notification' && io) {
            try {
                const notification = JSON.parse(message);
                if (notification?.user_id) {
                    io.to(`user:${notification.user_id}`).emit('newNotification', notification);
                }
            } catch (err) {
                logger.error('[Socket] Parse error:', err);
            }
        }
    });

    pubClient.subscribe('new-notification')
        .then(() => logger.info('[Socket] Subscribed to new-notification'))
        .catch(err => {
            logger.error('[Socket] Subscribe failed, retrying...', err.message);
            setTimeout(setupPubSubListener, 5000);
        });
};

const authTokenName = process.env.NODE_ENV === 'production' ? '__Secure-authToken' : 'authToken';

const initSocket = (server) => {
    const allowedOrigins = process.env.ORIGIN.split(',');

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);

                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error('Not allowed by CORS'));
            },
            methods: ["GET", "POST"],  // Socket chỉ cần GET/POST
            credentials: true,         // Bắt buộc để browser gửi cookie httpOnly
            allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "Accept"], // Sync với Express cors
        },
        path: '/socket.io',
        transports: ['websocket', 'polling'], // Ưu tiên websocket
    });

    // Middleware xác thực socket: Lấy token từ cookies (httpOnly, gửi qua headers nhờ withCredentials)
    io.use(async (socket, next) => {

        // Parse cookies từ header (browser gửi tự động)
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies[authTokenName];

        if (!token) {
            markSocketAuthFailure('missing_token');
            socket.emit('error', 'Bạn chưa đăng nhập');
            return next(new Error('Bạn chưa đăng nhập'));
        }

        // Kiểm tra blacklist
        const isBlacklisted = await cacheManager.get(`blacklist:${token}`);
        if (isBlacklisted) {
            markSocketAuthFailure('blacklisted_token');
            socket.emit('error', 'Phiên đăng nhập đã bị thu hồi');
            return next(new Error('Phiên đăng nhập đã bị thu hồi'));
        }

        try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);
            let user = await cacheManager.get(`user:${decoded.user_id}`);
            if (!user) {
                user = await User.findOne({ user_id: decoded.user_id, deleted_at: null }).lean();
                if (!user) {
                    markSocketAuthFailure('user_not_found');
                    socket.emit('error', 'Tài khoản không tồn tại');
                    return next(new Error('Tài khoản không tồn tại'));
                }
                await cacheManager.set(`user:${decoded.user_id}`, user, 15 * 60); // Cache 15 phút
            }

            // Gán thông tin user vào socket (đồng bộ với req.user trong HTTP auth)
            socket.user = { ...decoded, ...user };
            socket.userDetails = user;
            next();
        } catch (err) {
            markSocketAuthFailure(err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token');
            socket.emit('error', err.name === 'TokenExpiredError' ? 'Phiên đăng nhập đã hết hạn' : 'Phiên đăng nhập không hợp lệ');
            next(new Error(err.name === 'TokenExpiredError' ? 'Phiên đăng nhập đã hết hạn' : 'Phiên đăng nhập không hợp lệ'));
        }
    });

    io.on('connection', async (socket) => {
        trackSocketConnection(socket);

        const user = socket.user;
        const userId = user?.user_id;
        const zId = user?.zone_id;
        const cId = user?.company_id;
        const role = user?.role;

        if (role === 'admin') socket.join('role:admin');
        if (role === 'manager' && zId) socket.join(`zone:${zId}:managers`);
        if (role === 'company' && cId) socket.join(`company:${cId}:users`);

        if (userId) {
            socket.join(`user:${userId}`);

            const sockets = await io.in(`user:${userId}`).fetchSockets();
            if (sockets.length === 1) {
                await addOnlineUser(user);
                await broadcastCounts(io);
            }
        }

        registerCompanyHandlers(socket);
        registerUserHandlers(socket);
        registerZoneHandlers(socket);
        registerIndustryHandlers(socket);
        registerResourceWasteHandlers(socket);
        registerNotificationHandlers(socket);
        registerRegulationHandlers(socket);
        registerSolutionHandlers(socket);
        registerSummaryHandlers(socket);
        registerEmissionHandlers(socket);
        registerExportHandlers(socket);
        registerHashtagHandlers(socket);
        registerErrorLogHandlers(socket);

        // Đăng ký các socket handler cho business symbiosis
        registerSymbiosisHandlers(socket);

        // Đăng ký socket handler cho enterprise list
        registerEnterpriseListHandlers(socket);

        // Sự kiện join room user (cho notification cá nhân, token_invalidated)
        socket.on('join', (user_id) => {
            if (user_id && user_id === socket.user.user_id) {
                socket.join(`user:${user_id}`);
            } else {
                logger.warn('Join error: Invalid user_id', { socket_id: socket.id, user_id });
                socket.emit('error', 'Invalid user_id');
            }
        });

        // Xử lý ngắt kết nối
        socket.on('disconnect', async () => {
            trackSocketDisconnection(socket);

            if (userId) {
                const sockets = await io.in(`user:${userId}`).fetchSockets();
                if (sockets.length === 0) {
                    await removeOnlineUser(user);
                    await broadcastCounts(io);
                }
            }
        });

        // Sự kiện đánh dấu thông báo đã đọc
        socket.on('markAsRead', async (notification_I_id) => {
            try {
                const notification = await notificationService.markAsRead(notification_I_id, socket.user.user_id);
                socket.emit('notificationRead', {
                    notification_I_id,
                    status: notification.status,
                    readAt: notification.readAt
                });
            } catch (error) {
                socket.emit('error', error.message);
            }
        });
    });

    setupPubSubListener();

    return io;
};

module.exports = { initSocket, getIo: () => io };

pubClient.on('ready', () => {
    logger.info('[Socket] Redis ready, renewing subscription...');
    setupPubSubListener();
});
