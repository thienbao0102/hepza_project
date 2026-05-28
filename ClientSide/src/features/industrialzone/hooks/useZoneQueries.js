import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@hooks/useDebounce';
import { useStableQuery } from '@hooks/useStableQuery';
import { queryKeys } from '@lib/queryClient';
import {
    handlerGetAllZones,
    handlerGetZoneById,
    handlerCreateZone,
    handlerUpdateZone,
    handlerDeleteZone,
    handlerRestoreZone
} from '@services/zoneService';

// Hook for fetching zones with debounced search
export const useZones = ({
    page = 1,
    limit = 20,
    search = '',
    filters = {},
    debounceDelay = 300
} = {}) => {
    const debouncedSearch = useDebounce(search, debounceDelay);
    const debouncedFilters = useDebounce(JSON.stringify(filters), debounceDelay);

    const queryParams = { page, limit, search: debouncedSearch, filters: debouncedFilters };

    return useStableQuery(
        queryKeys.zones.list(queryParams),
        ({ signal }) => handlerGetAllZones(page, limit, debouncedSearch, JSON.parse(debouncedFilters), signal),
        {
            keepPreviousData: true,
            staleTime: debouncedSearch ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2min for search, 5min for normal
            cacheTime: 10 * 60 * 1000, // 10 minutes
            enabled: true,
        }
    );
};

// Hook for fetching single zone
export const useZone = (zoneId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.zones.detail(zoneId),
        queryFn: ({ signal }) => handlerGetZoneById(zoneId, signal),
        enabled: !!zoneId,
        ...options
    });
};

// Hook for creating zone
export const useCreateZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ zoneData, imageFile }) => handlerCreateZone(zoneData, imageFile),
        onSuccess: async () => {
            // Invalidate and actively refetch all zone lists/details observers
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: queryKeys.zones.lists(),
                    exact: false,
                    refetchType: 'active',
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.zones.details(),
                    exact: false,
                    refetchType: 'inactive',
                }),
            ]);

            await queryClient.refetchQueries({
                queryKey: queryKeys.zones.lists(),
                exact: false,
                type: 'all',
            });
        },
        onError: (error) => {
            console.error('Create zone error:', error);
        }
    });
};

// Hook for updating zone
export const useUpdateZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ zoneId, zoneData, imageFile }) => handlerUpdateZone(zoneId, zoneData, imageFile),
        onSuccess: async (data, variables) => {
            // Invalidate specific zone and actively refetch lists
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: queryKeys.zones.detail(variables.zoneId),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.zones.lists(),
                }),
            ]);

            await queryClient.refetchQueries({
                queryKey: queryKeys.zones.lists(),
                exact: false,
                type: 'all',
            });
        },
        onError: (error) => {
            console.error('Update zone error:', error);
        }
    });
};

// Hook for deleting zone
export const useDeleteZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneId) => handlerDeleteZone(zoneId),
        onSuccess: () => {
            // Invalidate zones list
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.lists() });
        },
        onError: (error) => {
            console.error('Delete zone error:', error);
        }
    });
};

// Hook for restoring zone
export const useRestoreZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneId) => handlerRestoreZone(zoneId),
        onSuccess: () => {
            // Invalidate zones list
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.lists() });
        },
        onError: (error) => {
            console.error('Restore zone error:', error);
        }
    });
};
