import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAddCompany, handlerUpdateCompany, handlerSetCompanyRepresentative, handlerDeleteCompany, handlerRestoreCompany, handlerPreviewImportCompanies, handlerImportFileAddCompany, handlerPreviewSoftDelete, handlerPreviewHardDelete, handlerHardDeleteCompany, handlerHardDeleteCompanies } from '@services/companyService';
import { queryKeys } from '@lib/queryClient';

// Hook for adding a new company
export const useAddCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (companyData) => handleAddCompany(companyData),
        onSuccess: () => {
            // Invalidate the companies list to refetch data
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        },
    });
};

// Hook for updating a company
export const useUpdateCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ company_id, companyData }) => handlerUpdateCompany(company_id, companyData),
        onSuccess: (data, variables) => {
            // Invalidate the specific company and the companies list
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.company_id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        },
    });
};

export const useSetCompanyRepresentative = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ company_id, representative_user_id, current_password }) =>
            handlerSetCompanyRepresentative(company_id, representative_user_id, current_password),
        onSuccess: (data, variables) => {
            if (data?.company) {
                queryClient.setQueryData(queryKeys.companies.detail(variables.company_id), data);
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.company_id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
        },
    });
};

// Hook for deleting a company
export const useDeleteCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (company_id) => handlerDeleteCompany(company_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        },
    });
};

// Hook for restoring a company
export const useRestoreCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (company_id) => handlerRestoreCompany(company_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        },
    });
};

// Hook for preview import companies
export const usePreviewImportCompanies = () => {
    return useMutation({
        mutationFn: ({ excelData, createAccounts }) => handlerPreviewImportCompanies(excelData, createAccounts),
    });
};

// Hook for importing companies
export const useImportFileAddCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => handlerImportFileAddCompany(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        },
    });
};

// Hook for preview soft delete company
export const usePreviewSoftDeleteCompany = () => {
    return useMutation({
        mutationFn: (companyIds) => handlerPreviewSoftDelete(companyIds)
    });
};

// Hook for preview hard delete company
export const usePreviewHardDeleteCompany = () => {
    return useMutation({
        mutationFn: (companyIds) => handlerPreviewHardDelete(companyIds)
    });
};

// Hook for hard deleting a single company
export const useHardDeleteCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (companyId) => handlerHardDeleteCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        }
    });
};

// Hook for hard deleting multiple companies
export const useHardDeleteCompanies = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (companyIds) => handlerHardDeleteCompanies(companyIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.deleted() });
        }
    });
};
