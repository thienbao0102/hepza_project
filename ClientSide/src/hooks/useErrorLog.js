import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { errorLogService } from '../services/errorLogService';

// Fetch all error logs
const fetchErrorLogs = async () => {
    return await errorLogService.getAllErrorLogs();
};

// Create a new error log
const createErrorLog = async (errorData) => {
    return await errorLogService.createErrorLog(errorData);
};

// Update error status
const updateErrorStatus = async ({ id, status }) => {
    return await errorLogService.updateErrorStatus(id, status);
};

export const useErrorLog = () => {
    const queryClient = useQueryClient();

    // Query to get all logs
    const {
        data: errorLogsData,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['errorLogs'],
        queryFn: fetchErrorLogs,
    });

    // Mutation to create log
    const createLogMutation = useMutation({
        mutationFn: createErrorLog,
        // No invalidate needed usually for create as it's often from user side, 
        // but if admin creates test errors, we might want to refetch
        onSuccess: () => {
            queryClient.invalidateQueries(['errorLogs']);
        },
    });

    // Mutation to update status
    const updateStatusMutation = useMutation({
        mutationFn: updateErrorStatus,
        onSuccess: () => {
            queryClient.invalidateQueries(['errorLogs']);
        },
    });

    // Delete single error log
    const deleteLog = async (id) => {
        await errorLogService.deleteErrorLog(id);
    };

    const deleteLogMutation = useMutation({
        mutationFn: deleteLog,
        onSuccess: () => {
            queryClient.invalidateQueries(['errorLogs']);
        },
    });

    return {
        errorLogs: errorLogsData?.data || [],
        isLoading,
        isError,
        refetch,
        createLog: createLogMutation.mutateAsync,
        isCreating: createLogMutation.isPending,
        updateStatus: updateStatusMutation.mutateAsync,
        isUpdating: updateStatusMutation.isPending,
        deleteLog: deleteLogMutation.mutateAsync,
        isDeleting: deleteLogMutation.isPending,
    };
};
