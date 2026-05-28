import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { queryKeys } from '@lib/queryClient';
import { useDebounce } from '@hooks/useDebounce';
import {
    handlerGetAllCompany,
    handlerGetCompanyById,
    handleAddCompany,
    handlerUpdateCompany,
    handlerDeleteCompany,
    handlerRestoreCompany,
    handlerGetDeletedCompanies,
    handlerAddLicenseToCompany,
    handlerUpdateLicenseInCompany,
    handlerDeleteLicenseFromCompany,
    handlerGetManagedCompany
} from '@services/companyService';
import { useAuth } from '@app/providers/auth/AuthProvider';

// Hook for fetching companies with debounced search
export const useCompanies = (params = {}) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        filters = {},
        debounceDelay = 500,
        sort = {},
        enabled = true,
    } = params;

    const debouncedSearch = useDebounce(search, debounceDelay);

    const memoFilters = useMemo(() => filters, [JSON.stringify(filters)]);
    const memoSort = useMemo(() => sort, [sort]);

    const queryParams = {
        page,
        limit,
        search: debouncedSearch,
        filters: memoFilters,
        sort: memoSort,
    };

    const { user } = useAuth();

    // Check if the current user is a manager requesting a managed view list
    const isManagerView = user?.role === 'manager' && params.isManagedView;

    const query = useQuery({
        // Include isManagerView in queryKey to differentiate cache entries
        queryKey: [...queryKeys.companies.list(queryParams), isManagerView],
        queryFn: ({ signal }) =>
            isManagerView
                ? handlerGetManagedCompany(queryParams, signal)
                : handlerGetAllCompany(queryParams, signal),
        keepPreviousData: true,
        enabled,
        staleTime: debouncedSearch ? 2 * 60 * 1000 : 5 * 60 * 1000,
    });

    return {
        ...query,
        isLoading: query.isLoading || query.isFetching,
    };
};

// Hook for fetching deleted companies
export const useDeletedCompanies = (params = {}) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        filters = {},
        debounceDelay = 500,
        sort = {},
        enabled = true,
    } = params;

    const debouncedSearch = useDebounce(search, debounceDelay);
    const memoFilters = useMemo(() => filters, [JSON.stringify(filters)]);
    const memoSort = useMemo(() => sort, [sort]);

    const queryParams = {
        page,
        limit,
        search: debouncedSearch,
        filters: memoFilters,
        sort: memoSort,
    };

    return useQuery({
        queryKey: queryKeys.companies.deleted(queryParams),
        queryFn: ({ signal }) => {
            return handlerGetDeletedCompanies(queryParams, signal);
        },
        keepPreviousData: true,
        enabled,
        staleTime: debouncedSearch ? 2 * 60 * 1000 : 5 * 60 * 1000,
    });
};

// Hook for fetching single company
export const useCompany = (companyId, options = {}, enabled = false) => {
    return useQuery({
        queryKey: queryKeys.companies.detail(companyId),
        queryFn: ({ signal }) => handlerGetCompanyById(companyId, signal),
        enabled: !!companyId,
        ...options
    });
};

// Hook for creating company
export const useCreateCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (companyData) => handleAddCompany(companyData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        },
        onError: (error) => {
            console.error('Create company error:', error);
        }
    });
};

// Hook for updating company
export const useUpdateCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companyId, companyData, imageFile }) => handlerUpdateCompany(companyId, companyData, imageFile),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.companyId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        },
        onError: (error) => {
            console.error('Update company error:', error);
        }
    });
};

// Hook for deleting company
export const useDeleteCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (companyId) => handlerDeleteCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        },
        onError: (error) => {
            console.error('Delete company error:', error);
        }
    });
};

// Hook for restoring company
export const useRestoreCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (companyId) => handlerRestoreCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        },
        onError: (error) => {
            console.error('Restore company error:', error);
        }
    });
};

// Hook for adding license to company
export const useAddLicense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companyId, licenseData }) => handlerAddLicenseToCompany(companyId, licenseData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.companyId) });
            // Optionally invalidate list if licenses are shown there
        },
        onError: (error) => {
            console.error('Add license error:', error);
        }
    });
};

// Hook for updating license
export const useUpdateLicense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companyId, licenseId, updateData }) => handlerUpdateLicenseInCompany(companyId, licenseId, updateData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.companyId) });
        },
        onError: (error) => {
            console.error('Update license error:', error);
        }
    });
};

// Hook for deleting license
export const useDeleteLicense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companyId, licenseId }) => handlerDeleteLicenseFromCompany(companyId, licenseId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.companyId) });
        },
        onError: (error) => {
            console.error('Delete license error:', error);
        }
    });
};
