import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { handlerGetUserNotifications } from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';
import { useDebounce } from '@hooks/useDebounce';

const DEFAULT_LIMIT = 15;
const DEFAULT_DEBOUNCE = 300;

const sanitizeFilters = (filters) => {
    const normalized = { ...filters };
    Object.keys(normalized).forEach((key) => {
        const value = normalized[key];
        if (value === undefined || value === null || value === '') {
            delete normalized[key];
        }
    });
    return normalized;
};

export const useUserNotifications = (filters = {}, options = {}) => {
    const mergedFilters = {
        page: 1,
        limit: DEFAULT_LIMIT,
        search: '',
        ...filters,
    };

    const debouncedFilters = useDebounce(mergedFilters, options.debounceMs ?? DEFAULT_DEBOUNCE);

    const queryFilters = useMemo(
        () => sanitizeFilters(debouncedFilters),
        [debouncedFilters]
    );

    const queryResult = useQuery({
        queryKey: queryKeys.notifications.userList(queryFilters),
        queryFn: ({ signal }) => handlerGetUserNotifications(queryFilters, signal),
        keepPreviousData: true,
        select: (payload) => ({
            notifications: payload?.notifications ?? [],
            totalItems: payload?.totalItems ?? 0,
            totalPages: payload?.totalPages ?? 1,
            page: (payload?.currentPage ?? debouncedFilters.page) - 1,
        }),
        ...options.queryOptions,
    });

    return {
        ...queryResult,
        queryFilters,
    };
};
