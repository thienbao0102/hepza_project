import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importResourceData } from '@/services/resoureceAndWasteService';

/**
 * Hook to import resources from Excel file
 * @returns {UseMutationResult} Mutation object for importing resources
 */
export const useImportResources = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) => importResourceData(payload),
        onSuccess: (data) => {
            // Invalidate related queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['resource-history'] });
            queryClient.invalidateQueries({ queryKey: ['summary-records'] });
            queryClient.invalidateQueries({ queryKey: ['inputResources'] });
            queryClient.invalidateQueries({ queryKey: ['fuelResources'] });
            queryClient.invalidateQueries({ queryKey: ['wasteResources'] });
        },
        onError: (error) => {
            console.error('Import resources error:', error);
        }
    });
};

export default useImportResources;
