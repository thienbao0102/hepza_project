module.exports = {
    apps: [
        {
            name: 'hepza-api-server',
            script: 'index.js',
            instances: 'max', // Sử dụng tất cả các CPU core khả dụng cho Cluster mode
            exec_mode: 'cluster', // Bật Cluster mode
            watch: false, // Không watch trong production
            max_memory_restart: '1G', // Khởi động lại nếu chiếm quá 1GB RAM
            env: {
                NODE_ENV: 'development',
                PORT: 5000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            }
        },
        {
            name: 'hepza-notification-worker',
            script: 'worker/notificationWorker.js',
            instances: 1, // Worker thường chỉ chạy 1 instance trừ khi xử lý queue đồng thời tốt
            exec_mode: 'fork', // Worker chạy chế độ fork
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};
