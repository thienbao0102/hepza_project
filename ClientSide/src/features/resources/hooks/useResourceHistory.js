import { useQuery } from '@tanstack/react-query';
import { handlerGetAllDataWithHistory } from '@services/resoureceAndWasteService';

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export const useResourceHistory = ({ companyId, zoneId, periodKey, periodKeys, role }, options = {}) => {
    const enabled = Boolean(companyId && zoneId && (periodKey || periodKeys));

    return useQuery({
        queryKey: ['resource-history', role, companyId, zoneId, periodKey, periodKeys],
        queryFn: ({ signal }) =>
            handlerGetAllDataWithHistory(
                { company_id: companyId, zone_id: zoneId, periodKey, periodKeys },
                signal
            ).then(res => {
                const data = res?.dataResources ?? null;
                // detail page expects single object, but backend wraps in array for consistency
                if (Array.isArray(data) && !periodKeys) {
                    return data[0] || null;
                }
                return data;
            }),
        enabled,
        staleTime: 30_000,
        keepPreviousData: true,
        refetchOnWindowFocus: true,
        ...options,
    });
};
