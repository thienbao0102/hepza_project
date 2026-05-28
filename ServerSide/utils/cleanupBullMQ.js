const { notificationQueue } = require('../queues/notificationQueue');

async function cleanup() {
    try {
        // console.log('Bắt đầu dọn dẹp BullMQ...');

        // Xóa job hoàn thành > 4 giờ
        const completed = await notificationQueue.clean(4 * 60 * 60 * 1000, 'completed');
        // Xóa job lỗi > 24 giờ
        const failed = await notificationQueue.clean(24 * 60 * 60 * 1000, 'failed');
        // Xóa job chờ quá lâu (nếu có)
        const waiting = await notificationQueue.clean(2 * 60 * 60 * 1000, 'wait');

        console.log(`Đã dọn dẹp: ${completed} completed, ${failed} failed, ${waiting} waiting`);
    } catch (err) {
        console.error('Cleanup error:', err.message);
    }
}

// Chạy mỗi 6 giờ
require('node-cron').schedule('0 */6 * * *', cleanup);

// Hoặc chạy ngay khi khởi động
cleanup();