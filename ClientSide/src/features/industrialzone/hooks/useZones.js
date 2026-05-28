import { useAuthenticatedQuery } from '@hooks/useAuthenticatedQuery';
import { handlerGetAllZones } from '@services/zoneService';
import { queryKeys } from '@lib/queryClient';
import { useDebounce } from '@hooks/useDebounce';

/**
 * Custom hook for managing industrial zones data with pagination, search, and filters using TanStack Query.
 * @param {object} params - The parameters for fetching zones.
 * @param {number} params.page - The current page number.
 * @param {number} params.limit - The number of items per page.
 * @param {string} params.search - The search term.
 * @param {object} params.filters - The filter criteria.
 * @param {number} debounceDelay - The delay for debouncing search and filters.
 * @returns {Object} The result from useAuthenticatedQuery.
 */
const useZones = ({ page = 1, limit = 10, search = '', filters = {} } = {}, debounceDelay = 300) => {
    const debouncedSearch = useDebounce(search, debounceDelay);
    const debouncedFilters = useDebounce(JSON.stringify(filters), debounceDelay);

    const queryParams = { page, limit, search: debouncedSearch, filters: debouncedFilters };

    return useAuthenticatedQuery({
        queryKey: queryKeys.zones.list(queryParams),
        queryFn: () => handlerGetAllZones({ page, limit, search: debouncedSearch, filters: JSON.parse(debouncedFilters) }),
        keepPreviousData: true,
        staleTime: 5 * 60 * 1000, // 5 minutes
        select: (data) => {
            const zonesData = data?.zones || [];
            const transformedZones = zonesData.map((zone, index) => ({
                id: zone.zone_id || `zone-${index}`,
                image: null, // No image available, will use default
                name: zone.zone_name || 'Chưa có tên',
                zone_id: zone.zone_id || 'N/A',
                activityType: zone.location || 'Chưa có địa chỉ',
                field: zone.status || 'Chưa có trạng thái',
                ...zone
            }));

            return {
                zones: transformedZones,
                totalItems: data?.totalItems || 0,
                totalPages: data?.totalPages || 0,
                currentPage: data?.currentPage || page,
            };
        },
    });
};

export default useZones;