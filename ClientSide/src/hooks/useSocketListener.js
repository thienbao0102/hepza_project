import { useEffect } from 'react';
import { getSocket } from '@utils/socket'; // Thay bằng đường dẫn thực tế

/**
 * Hook lắng nghe một sự kiện Socket.IO cụ thể.
 * @param {string} eventName - Tên sự kiện cần lắng nghe từ BE (ví dụ: 'newNotification').
 * @param {function} handler - Hàm callback được gọi khi sự kiện xảy ra.
 * @param {Array<any>} dependencies - Mảng dependencies cho useEffect.
 */
export const useSocketListener = (eventName, handler, dependencies = []) => {
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.off(eventName);     // xoá toàn bộ listener cũ
        socket.on(eventName, handler);

        // console.log(`Subscribed: ${eventName}`);

        return () => {
            socket.off(eventName);
            // console.log(`Unsubscribed: ${eventName}`);
        };
    }, [eventName, handler, ...dependencies]);
};