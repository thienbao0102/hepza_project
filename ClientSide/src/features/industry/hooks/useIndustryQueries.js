import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    handlerGetAllIndustryGroups,
    handlerGetAllIndustries,
    handlerCreateIndustryGroup,
    handlerCreateIndustry,
    handlerUpdateIndustryGroup,
    handlerUpdateIndustry,
    handlerDeleteIndustryGroup,
    handlerDeleteIndustry,
} from '@services/industryService';

const QUERY_KEYS = {
    industryGroups: 'industryGroups',
    industries: 'industries',
};

// ── Query Hooks ──

export const useIndustryGroups = (params = {}) => {
    const { page = 1, limit = 100, search = '' } = params;
    return useQuery({
        queryKey: [QUERY_KEYS.industryGroups, page, limit, search],
        queryFn: () => handlerGetAllIndustryGroups({ page, limit, search }),
        keepPreviousData: true,
        staleTime: 5 * 60 * 1000,
    });
};

export const useIndustries = (params = {}) => {
    const { page = 1, limit = 20, search = '', filters = {} } = params;
    return useQuery({
        queryKey: [QUERY_KEYS.industries, page, limit, search, filters],
        queryFn: () => handlerGetAllIndustries({ page, limit, search, filters }),
        keepPreviousData: true,
        staleTime: 2 * 60 * 1000,
    });
};

// ── Mutation Hooks ──

export const useCreateIndustry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => handlerCreateIndustry(data),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industries]);
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
        },
    });
};

export const useUpdateIndustry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ industryId, data }) => handlerUpdateIndustry(industryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industries]);
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
        },
    });
};

export const useDeleteIndustry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (industryId) => handlerDeleteIndustry(industryId),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industries]);
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
        },
    });
};

export const useCreateIndustryGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => handlerCreateIndustryGroup(data),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
        },
    });
};

export const useUpdateIndustryGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ groupId, data }) => handlerUpdateIndustryGroup(groupId, data),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
        },
    });
};

export const useDeleteIndustryGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (groupId) => handlerDeleteIndustryGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries([QUERY_KEYS.industryGroups]);
            queryClient.invalidateQueries([QUERY_KEYS.industries]);
        },
    });
};
