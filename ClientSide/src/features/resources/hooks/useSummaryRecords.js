import { useQuery } from '@tanstack/react-query';
import { handlerGetSummaryRecord, handlerGetSummaryRecordByPeriodkey } from '@services/summaryRecordService';
import { handlerGetSummaryDetail } from '@services/resoureceAndWasteService';

export const useSummaryRecords = (
    { role, companyId, zoneId, periodKeyStart, periodKeyEnd, include = [1] },
    options = {}
) => {
    return useQuery({
        queryKey: ['summary-records', role, companyId, zoneId, periodKeyStart, periodKeyEnd, include],
        queryFn: ({ signal }) =>
            handlerGetSummaryRecord(
                {
                    role,
                    company_id: companyId,
                    zone_id: zoneId,
                    periodKeyStart,
                    periodKeyEnd,
                    include
                },
                signal
            ).then(res => {
                res?.summaryRecord ?? [];
                return res;
            }),
        enabled:
            !!periodKeyStart &&
            !!periodKeyEnd &&
            (
                (role === 'company' && !!(companyId || zoneId)) ||
                (role === 'manager' && !!zoneId) ||
                (role === 'admin')
            ),
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useSummaryRecordByPeriodkey = (
    { role, companyId, zoneId, periodKeyStart, periodKeyEnd, include = [1] },
    options = {}
) => {
    return useQuery({
        queryKey: ['summary-records', role, companyId, zoneId, periodKeyStart, periodKeyEnd, include],
        queryFn: ({ signal }) =>
            handlerGetSummaryRecordByPeriodkey(
                {
                    role,
                    company_id: companyId,
                    zone_id: zoneId,
                    periodKeyStart,
                    periodKeyEnd,
                    include
                },
                signal
            ).then(res => res?.summaryRecord ?? []),
        enabled:
            !!periodKeyStart &&
            !!periodKeyEnd &&
            (
                (role === 'company' && !!(companyId || zoneId)) ||
                (role === 'manager' && !!zoneId) ||
                (role === 'admin')
            ),
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useSummaryDetail = (
    { role, companyId, zoneId, periodKeyStart, periodKeyEnd, include },
    options = {}
) => {
    return useQuery({
        queryKey: ['summary-records', role, companyId, zoneId, periodKeyStart, periodKeyEnd, include],
        queryFn: ({ signal }) =>
            handlerGetSummaryDetail(
                {
                    role,
                    company_id: companyId,
                    zone_id: zoneId,
                    periodKeyStart,
                    periodKeyEnd,
                    include
                },
                signal
            ).then(res => res?.dataResources ?? []),
        enabled:
            !!periodKeyStart &&
            !!periodKeyEnd &&
            (
                (role === 'company' && !!(companyId || zoneId)) ||
                (role === 'manager' && !!zoneId) ||
                (role === 'admin')
            ),
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        ...options,
    });
};
