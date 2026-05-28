const { Queue } = require('bullmq');
const { bullRedisClient } = require('../config/redis');

const notificationQueue = new Queue('notification-queue-v2', {
    connection: bullRedisClient,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 300,    // Xóa sau 5 phút (300 giây)
            count: 10   // Giữ tối đa 10 job hoàn thành
        },
        removeOnFail: {
            age: 3600,   // Xóa job lỗi sau 1 giờ
            count: 10
        }
    },
});

module.exports = { notificationQueue };