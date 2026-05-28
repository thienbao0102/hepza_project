const fs = require('fs');
const dotenv = require('dotenv');

// Load biến môi trường từ secret file hoặc local (MUST be before importing routes/controllers)
const secretEnvPath = "/etc/secrets/env";
if (fs.existsSync(secretEnvPath)) {
    dotenv.config({ path: secretEnvPath });
} else {
    dotenv.config(); // fallback khi dev local
}

const mongoose = require('mongoose');
const http = require('http');
const { initSocket } = require('./config/socket.js');
const { redisClient, pubClient, subClient, shutdownRedis } = require('./config/redis');
const { initializeScheduledNotifications } = require('./services/notificationService');
const { startExportCleanup, stopExportCleanup } = require('./services/exportCleanupService');
const { loadAbbreviations } = require('./utils/abbreviationInMemory');
const logger = require('./utils/logger');

logger.installConsoleBridge();

const app = require('./app');
const server = http.createServer(app);
const {
    nodejsHttpConnections,
    nodejsHeapUsed,
    nodejsHeapTotal,
    nodejsEventLoopLag,
} = require('./monitoring/metrics');
initSocket(server); // Khởi tạo Socket.io

// Update active HTTP connections gauge every 5 seconds
let activeConnectionCount = 0;
server.on('connection', (socket) => {
    activeConnectionCount++;
    socket.once('close', () => {
        activeConnectionCount--;
    });
});
server.on('secureConnection', (socket) => {
    activeConnectionCount++;
    socket.once('close', () => {
        activeConnectionCount--;
    });
});
setInterval(() => {
    nodejsHttpConnections.set(Math.max(0, activeConnectionCount));
}, 5000);

// Custom Node.js process metrics collector (more reliable than collectDefaultMetrics in containers)
setInterval(() => {
    const mem = process.memoryUsage();
    nodejsHeapUsed.set(mem.heapUsed);
    nodejsHeapTotal.set(mem.heapTotal);

    const start = process.hrtime();
    setImmediate(() => {
        const delta = process.hrtime(start);
        const seconds = delta[0] + delta[1] / 1e9;
        nodejsEventLoopLag.set(seconds);
    });
}, 5000);

const mongooseOptions = {
    maxPoolSize: 200,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
};

// Kết nối DB và Redis trước khi start server
mongoose.connect(process.env.ATLAS_URI, mongooseOptions)
    .then(async () => {
        // Auto-seed ban đầu nếu database hoàn toàn mới (chưa có admin nào)
        try {
            const User = require('./models/userModel');
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 0) {
                logger.info('🌱 Môi trường mới được phát hiện (0 Admin). Khởi chạy Auto-Seed...');
                const { execSync } = require('child_process');
                execSync('node scripts/seedAll.js', { stdio: 'inherit' });
                logger.info('✅ Auto-Seed hoàn tất!');
            }
        } catch (err) {
            logger.error('❌ Lỗi trình Auto-Seed:', err);
        }

        // Load abbreviation vào bộ nhớ của server
        try {
            await loadAbbreviations();
        } catch (err) {
            logger.error('Không thể tải dữ liệu viết tắt:', err);
        }

        // GỌI HÀM ĐỒNG BỘ LỊCH TRÌNH
        try {
            await initializeScheduledNotifications();
        } catch (err) {
            logger.error('Không thể đồng bộ lịch trình thông báo:', err);
            // Cân nhắc có nên process.exit(1) ở đây hay không
        }

        startExportCleanup();

        // Kiểm tra trạng thái Redis (tùy chọn, vì listener đã báo)
        if (redisClient.status === 'ready' && pubClient.status === 'ready' && subClient.status === 'ready') {
            // console.log('All Redis clients seem connected.');
        } else {
            logger.warn('One or more Redis clients might not be ready yet. Check logs.');
        }

        server.listen(process.env.PORT, () =>
            logger.info(`Server running on port ${process.env.PORT}`)
        );
    })
    .catch(err => {
        logger.error('Startup error (Mongoose):', err);
        process.exit(1);
    });



process.on('SIGINT', async () => {
    logger.info('Nhận SIGINT, đang tắt Redis...');
    stopExportCleanup();
    await shutdownRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Nhận SIGTERM, đang tắt Redis...');
    stopExportCleanup();
    await shutdownRedis();
    process.exit(0);
});
