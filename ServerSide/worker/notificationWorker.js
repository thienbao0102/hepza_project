const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

process.env.LOG_SCOPE = process.env.LOG_SCOPE || 'worker';
logger.installConsoleBridge();
// 1. ƯU TIÊN: DÙNG /etc/secrets/env (Production)
const secretEnvPath = "/etc/secrets/env";
if (fs.existsSync(secretEnvPath)) {
    dotenv.config({ path: secretEnvPath });
}
// 2. DEV: DÙNG .env local
else {
    const localEnvPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(localEnvPath)) {
        dotenv.config({ path: localEnvPath });
    } else {
        logger.warn('.env not found running with existing process.env');

    }
}
const { shutdownRedis } = require('../config/redis');
const { Worker } = require('bullmq');
const { bullRedisClient, dedicatedPubClient } = require('../config/redis');
const { notificationQueue } = require('../queues/notificationQueue');
const notificationRepo = require('../dataAccess/notificationRepository');
const NotificationInstance = require('../models/notificationInstanceModel');
const logRepo = require('../dataAccess/notificationLogRepository');
const userRepo = require('../dataAccess/userRepository');
const { generateId } = require('../utils/autoIncrement');
const {
    createMetricsHandler,
    observeBullJobOutcome,
    refreshBullQueueMetrics,
} = require('../monitoring/metrics');
const { collectMongoMetrics } = require('../monitoring/mongoMetrics');
const mongoose = require('mongoose');
const http = require('http');
const { getMissingCompanyIdsByPeriod } = require('../services/summaryRecordService');
require('../utils/cleanupBullMQ');

const workerMetricsHandler = createMetricsHandler([
    () => refreshBullQueueMetrics(notificationQueue),
    collectMongoMetrics,
]);

const mongooseOptions = {
    maxPoolSize: 200,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
};

mongoose.connect(process.env.ATLAS_URI, mongooseOptions)
    .then(() => {
        // console.log('Worker đã kết nối đến MongoDB');
    })
    .catch(err => {
        logger.error('Worker không thể kết nối MongoDB:', err);
        process.exit(1); // Thoát nếu không kết nối được DB
    });

logger.info('Worker đang khởi động...');

const getCurrentPeriodKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`; // 202511
};

const buildExecutionKey = (job, template) => {
    const scheduleType = job.data.schedule_type || template?.schedule?.type || 'MANUAL';

    if (scheduleType === 'RECURRING') {
        const baseDate = new Date(job.timestamp || Date.now());
        baseDate.setSeconds(0, 0);
        return `${template.notification_T_id}:RECURRING:${baseDate.toISOString()}`;
    }

    if (scheduleType === 'ONE_TIME') {
        const sendAt = template?.schedule?.sendAt
            ? new Date(template.schedule.sendAt).toISOString()
            : String(job.id);
        return `${template.notification_T_id}:ONE_TIME:${sendAt}`;
    }

    return `${template.notification_T_id}:${scheduleType}:${job.id}`;
};

const worker = new Worker('notification-queue-v2', async (job) => {
    logger.info(`Bắt đầu xử lý job ${job.id}, tên: ${job.name}`);
    const { template_id, target } = job.data;
    let executionLockKey = null;

    try {
        let template = await notificationRepo.findTemplateById(template_id);

        // 1. Template thật: phải tồn tại và active
        if (template && !template.isActive) {
            logger.info(`Job ${job.id} bị hủy: template ${template_id} đã bị tắt.`);
            return;
        }

        // 2. Template tạm: không tồn tại trong DB → dùng _tempTemplate
        if (!template && job.data._tempTemplate) {
            template = job.data._tempTemplate;
            template.notification_T_id = template_id; // gán để log
        }

        // 3. Nếu vẫn không có template → hủy
        if (!template) {
            logger.info(`Job ${job.id} bị hủy: template ${template_id} không tồn tại.`);
            return;
        }

        // Hàm helper tắt template 1 lần
        const executionKey = buildExecutionKey(job, template);
        executionLockKey = `notification:execution:${executionKey}`;
        const acquiredLock = await bullRedisClient.set(executionLockKey, String(job.id), 'EX', 3600, 'NX');
        if (!acquiredLock) {
            logger.info(`Job ${job.id} bị bỏ qua do execution key ${executionKey} đã được xử lý.`);
            return;
        }

        const existingLog = await logRepo.findByExecutionKey(executionKey);
        if (existingLog) {
            logger.info(`Job ${job.id} bị bỏ qua do execution key ${executionKey} đã có log.`);
            return;
        }

        const autoDisableTemplate = async () => {
            if (template.schedule && ['ONE_TIME', 'IMMEDIATE'].includes(template.schedule.type) && !job.data._tempTemplate) {
                try {
                    await notificationRepo.updateTemplate(template.notification_T_id, { isActive: false });
                    logger.info(`Job ${job.id}: Đã vô hiệu hóa template ${template.schedule.type} ${template.notification_T_id}.`);
                } catch (err) {
                    logger.error(`Job ${job.id}: LỖI KHI CẬP NHẬT DATABASE isActive=false:`, err.message);
                }
            }
        };

        let finalCompanyIds = new Set(); // Dùng Set để tránh trùng

        // === DYNAMIC PART ===
        if (['DYNAMIC', 'HYBRID'].includes(template.target.mode)) {
            const periodKey = getCurrentPeriodKey();
            if (template.target.dynamicRule === 'MISSING_REPORT') {
                const missing = await getMissingCompanyIdsByPeriod(periodKey);
                missing.forEach(id => finalCompanyIds.add(id));
            }
            // Thêm các quy tắc dynamic khác ở đây......
        }

        // === STATIC PART (CHỈ THÊM NẾU CÓ) ===
        if (['STATIC', 'HYBRID'].includes(template.target.mode)) {
            const staticIds = target?.company_ids?.length
                ? target.company_ids
                : template.target.company_ids || [];
            staticIds.forEach(id => finalCompanyIds.add(id));
        }

        // === GỘP TARGET ===
        const finalTarget = {
            roles: target?.roles?.length ? target.roles : (template.target.roles || []),
            zone_ids: target?.zone_ids?.length ? target.zone_ids : (template.target.zone_ids || []),
            company_ids: Array.from(finalCompanyIds) // Chuyển Set → Array
        };

        const { roles = [], zone_ids = [], company_ids = [] } = finalTarget;

        if (roles.length === 0) {
            logger.info(`Job ${job.id} bị hủy: không có roles hợp lệ.`);
            await autoDisableTemplate();
            return;
        }

        // 1. Nếu cần gửi cho company theo zone_ids, hãy quy đổi zone_ids ra company_ids
        let resolvedCompanyIds = [...company_ids];
        if (roles.includes("company") && resolvedCompanyIds.length === 0 && zone_ids.length > 0) {
            const Company = require('../models/companyModel');
            const companiesInZones = await Company.find({ zone_id: { $in: zone_ids }, deleted_at: null }, { company_id: 1 }).lean();
            resolvedCompanyIds = companiesInZones.map(c => c.company_id);
        }

        // 2. Xây dựng truy vấn logic OR cho từng role
        const orConditions = [];

        roles.forEach(role => {
            let condition = { role: role };
            
            if (role === 'company') {
                if (resolvedCompanyIds.length > 0) {
                    condition.company_id = { $in: resolvedCompanyIds };
                } else if (zone_ids.length > 0) {
                    condition.zone_id = { $in: zone_ids }; // Fallback
                }
            } else if (role === 'manager' && zone_ids.length > 0) {
                condition.zone_id = { $in: zone_ids };
            }
            
            orConditions.push(condition);
        });

        const finalQuery = { 
            deleted_at: null, 
            $or: orConditions 
        };

        // --- logic tìm user ---
        const users = await userRepo.find(finalQuery);

        if (users.length === 0) {
            logger.info(`Job ${job.id}: Không tìm thấy user nào.`);
            await autoDisableTemplate();
            return;
        }

        // GHI LOG LỊCH SỬ GỬI TRƯỚC ĐỂ LẤY LOG_ID
        const zoneIds = [...new Set(users.map(u => u.zone_id).filter(Boolean))];
        const log = await logRepo.createLog({
            execution_key: executionKey,
            template_id: template.notification_T_id,
            template_name: template.name,
            title: template.title,
            body: template.body,
            attachments: template.attachments || [],
            type: template.type,
            schedule_type: job.data.schedule_type || template.schedule.type,
            target: finalTarget,
            zone_ids: zoneIds,
            total_recipients: users.length,
            sent_by: job.data.admin_id || 'system',
            sent_at: new Date()
        });

        // Tạo một mảng rỗng
        const notifications = [];

        // Sử dụng vòng lặp 'for...of' để đảm bảo generateId chạy tuần tự
        for (const user of users) {
            // Lấy ID (await sẽ tạm dừng vòng lặp, ngăn xung đột)
            const newId = await generateId('notification_instance', 'NI');

            // Thêm object thông báo vào mảng
            notifications.push({
                notification_I_id: newId,
                template_id: template.notification_T_id,
                log_id: log.log_id, // GÁN LOG_ID MỚI TẠO
                user_id: user.user_id,
                status: 'delivered',
                deliveredAt: new Date(),
                title: template.title,
                body: template.body,
                attachments: template.attachments || [],
                type: template.type,
            });
        }

        const createdNotifications = await notificationRepo.createNotifications(notifications);

        // Gửi qua Redis Pub/Sub để server chính bắn socket
        createdNotifications.forEach(notif => {
            const payload = {
                notification_I_id: notif.notification_I_id,
                user_id: notif.user_id,
                title: template.title,
                body: template.body,
                attachments: template.attachments || [],
                type: template.type,
                status: 'delivered',
                deliveredAt: notif.deliveredAt
            };
            dedicatedPubClient.publish('new-notification', JSON.stringify(payload));
        });

        // TỰ ĐỘNG TẮT TEMPLATE NẾU LÀ GỬI 1 LẦN HOẶC TỨC THÌ
        await autoDisableTemplate();

    } catch (error) {
        if (executionLockKey) {
            await bullRedisClient.del(executionLockKey).catch((err) => {
                logger.error(`Job ${job.id}: không thể nhả execution lock:`, err.message);
            });
        }
        logger.error(`Job ${job.id} thất bại:`, error.message);
        throw error; // Ném lỗi để BullMQ biết và retry
    }
}, {
    connection: bullRedisClient,
    removeOnComplete: true,
    removeOnFail: { count: 50, age: 24 * 3600 }
});

worker.on('completed', (job) => logger.info(`Job ${job.id} đã hoàn thành.`));
worker.on('failed', (job, err) => logger.error(`Job ${job.id} thất bại: ${err.message}`));

// Tạo một server HTTP "giả" để làm hài lòng Render
const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/metrics') {
        return workerMetricsHandler(req, res);
    }

    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

healthCheckServer.listen(process.env.WORKER_PORT, '0.0.0.0', () => {
    logger.info(`Worker "Health Check Server" đang chạy trên cổng ${process.env.WORKER_PORT}`);
    logger.info('Worker BullMQ đã sẵn sàng xử lý job.');
});

process.on('SIGINT', async () => {
    logger.info('Nhận SIGINT, đang tắt Redis...');
    await shutdownRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Nhận SIGTERM, đang tắt Redis...');
    await shutdownRedis();
    process.exit(0);
});
