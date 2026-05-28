import { useQuery } from '@tanstack/react-query';
import { handlerGetLogSenders } from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';

/**
 * Hook lấy danh sách người gửi thông báo duy nhất
 * @param {string} role - 'admin' | 'manager' | null (all)
 * @param {object} options - { enabled: boolean }
 */
export const useNotificationLogSenders = (role = null, options = {}) => {
    const { enabled = true } = options;
    return useQuery({
        queryKey: ['notifications', 'senders', role],
        queryFn: ({ signal }) => handlerGetLogSenders(role, signal),
        staleTime: 5 * 60 * 1000, // 5 minutes
        select: (data) => data?.senders || [],
        enabled,
    });
};
