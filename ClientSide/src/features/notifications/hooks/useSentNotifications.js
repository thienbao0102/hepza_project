import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { handlerGetSendHistory } from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';
import { useDebounce } from '@hooks/useDebounce';

const DEFAULT_LIMIT = 15;
const DEFAULT_DEBOUNCE = 400;

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

export const useSentNotifications = (filters = {}, options = {}) => {
    const mergedFilters = {
        page: 1,
        limit: DEFAULT_LIMIT,
        search: '',
        type: undefined,
        ...filters,
    };

    const debouncedFilters = useDebounce(mergedFilters, options.debounceMs ?? DEFAULT_DEBOUNCE);

    const queryFilters = useMemo(
        () => sanitizeFilters(debouncedFilters),
        [debouncedFilters]
    );

    const queryResult = useQuery({
        queryKey: queryKeys.notifications.sentList(queryFilters),
        queryFn: ({ signal }) => handlerGetSendHistory(queryFilters, signal),
        keepPreviousData: true,
        select: (payload) => ({
            logs: payload?.logs ?? [],
            totalItems: payload?.totalItems ?? 0,
            totalPages: payload?.totalPages ?? 1,
            page: (payload?.page ?? debouncedFilters.page) - 1,
        }),
        ...options.queryOptions,
    });

    return queryResult;
};
