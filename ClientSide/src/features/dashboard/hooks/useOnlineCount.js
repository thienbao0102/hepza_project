import { useState, useEffect } from 'react';
import { apiClient } from '@lib/api-client';
import { getSocket } from '@utils/socket';

export const useOnlineCount = ({ enabled = true } = {}) => {
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setOnlineCount(0);
            return undefined;
        }

        let isMounted = true;

        const fetchOnlineCount = async () => {
            try {
                const response = await apiClient.get('/api/online/count');
                if (isMounted) {
                    setOnlineCount(response.data.count);
                }
            } catch (error) {
                if (error?.name !== 'CanceledError') {
                    console.error('Failed to fetch online count:', error);
                }
            }
        };

        fetchOnlineCount();

        const socket = getSocket();

        const handleUpdate = (newCount) => {
            if (isMounted) {
                setOnlineCount(newCount);
            }
        };

        if (socket) {
            socket.on('online_count:updated', handleUpdate);
        }

        return () => {
            isMounted = false;
            if (socket) {
                socket.off('online_count:updated', handleUpdate);
            }
        };
    }, [enabled]);

    return onlineCount;
};
