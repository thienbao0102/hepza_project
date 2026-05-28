import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@app': path.resolve(__dirname, 'src/app'),
            '@assets': path.resolve(__dirname, 'src/assets'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@constants': path.resolve(__dirname, 'src/constants'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@hooks': path.resolve(__dirname, 'src/hooks'),
            '@lib': path.resolve(__dirname, 'src/lib'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@router': path.resolve(__dirname, 'src/router'),
            '@services': path.resolve(__dirname, 'src/services'),
            '@state': path.resolve(__dirname, 'src/state'),
            '@utils': path.resolve(__dirname, 'src/utils'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                // --- ĐƠN GIẢN HÓA LOGIC CHIA CHUNK ---
                manualChunks(id) {
                    // Gói TẤT CẢ các thư viện từ node_modules vào một file duy nhất
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                },
            },
        },
    },
});