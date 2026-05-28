import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@hooks/useDebounce';
import { useStableQuery } from '@hooks/useStableQuery';
import { QUERY_KEYS } from '@lib/queryClient';
import {
    handlerGetUsersByRole,
    handlerGetUserById,
    handlerCreateUser,
    handlerUpdateUser,
    handlerDeleteUser,
    handlerDeleteUsers,
    handlerRestoreUser,
    handlerUpdateMyProfile,
    handlerVerifyEmailOtp,
    handlerGetDeletedUsersByRole,
    handlerRestoreUsers,
    handlerHardDeleteUser,
    handlerHardDeleteUsers,
    handlerPreviewSoftDeleteUsers,
    handlerPreviewHardDeleteUsers,
    handlerAdminResetPassword
} from '@services/userService';

// Hook for fetching users by role with pagination
export const useUsersByRole = ({
    role = 'company',
    page = 1,
    limit = 10,
    filters = {},
    sort = {},
    debounceDelay = 300,
    enabled = true,
} = {}) => {
    const debouncedPage = useDebounce(page, debounceDelay);
    const debouncedLimit = useDebounce(limit, debounceDelay);
    const debouncedFilters = useDebounce(JSON.stringify(filters), debounceDelay);
    const debouncedSort = useDebounce(JSON.stringify(sort), debounceDelay);

    return useStableQuery(
        [QUERY_KEYS.USERS, role, debouncedPage, debouncedLimit, debouncedFilters, debouncedSort],
        ({ signal }) => {
            return handlerGetUsersByRole(role, debouncedPage, debouncedLimit, JSON.parse(debouncedFilters), JSON.parse(debouncedSort), signal);
        },
        {
            keepPreviousData: true,
            staleTime: 3 * 60 * 1000,
            cacheTime: 10 * 60 * 1000,
            enabled: !!role && enabled,
            refetchOnMount: 'always',
            onError: (error) => {
                console.error(" useUsersByRole error:", error);
            }
        }
    );
};

// Hook for fetching single user by ID
export const useUser = (userId, options = {}) => {
    return useQuery({
        queryKey: [QUERY_KEYS.USERS, 'detail', userId],
        queryFn: ({ signal }) => handlerGetUserById(userId, signal),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options
    });
};

// Hook for creating user
export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerCreateUser,
        onSuccess: () => {
            // Invalidate all user queries
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
        },
        onError: (error) => {
            console.error('Create user mutation error:', error);
        },
    });
};

// Hook for updating user
export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, updateData }) => handlerUpdateUser(userId, updateData),
        onSuccess: (data, variables) => {
            // Invalidate specific user and all user lists
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS, 'detail', variables.userId] });
        },
        onError: (error) => {
            console.error('Update user mutation error:', error);
        },
    });
};

// Hook for updating own profile
export const useUpdateMyProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ updateData, currentPassword }) => handlerUpdateMyProfile(updateData, currentPassword),
        onSuccess: () => {
            // Invalidate auth queries
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH] });
        },
        onError: (error) => {
            console.error('Update profile mutation error:', error);
        },
    });
};

// Hook for deleting single user
export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerDeleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS, 'deleted'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPANIES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH] });
        },
        onError: (error) => {
            console.error('Delete user mutation error:', error);
        },
    });
};

// Hook for deleting multiple users
export const useDeleteUsers = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerDeleteUsers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS, 'deleted'] });
        },
        onError: (error) => {
            console.error('Delete users mutation error:', error);
        },
    });
};

// Hook for restoring user
export const useRestoreUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerRestoreUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS, 'deleted'] });
        },
        onError: (error) => {
            console.error('Restore user mutation error:', error);
        },
    });
};

// Hook for verifying email OTP
export const useVerifyEmailOtp = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, otp }) => handlerVerifyEmailOtp(userId, otp),
        onSuccess: () => {
            // Invalidate auth queries after email verification
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH] });
        },
        onError: (error) => {
            console.error('Verify email OTP mutation error:', error);
        },
    });
};

// Hook for fetching soft-deleted users
export const useDeletedUsersByRole = ({
    role = 'company',
    page = 1,
    limit = 10,
    filters = {},
    debounceDelay = 300,
    enabled = true
} = {}) => {
    const debouncedPage = useDebounce(page, debounceDelay);
    const debouncedLimit = useDebounce(limit, debounceDelay);
    const debouncedFilters = useDebounce(JSON.stringify(filters), debounceDelay);

    return useStableQuery(
        [QUERY_KEYS.USERS, 'deleted', role, debouncedPage, debouncedLimit, debouncedFilters],
        ({ signal }) => handlerGetDeletedUsersByRole(role, debouncedPage, debouncedLimit, JSON.parse(debouncedFilters), signal),
        {
            keepPreviousData: true,
            staleTime: 3 * 60 * 1000,
            cacheTime: 10 * 60 * 1000,
            enabled: !!role && enabled,
            refetchOnMount: 'always',
        }
    );
};

// Hook for restoring multiple users
export const useRestoreUsers = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerRestoreUsers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS, 'deleted'] });
        },
        onError: (error) => {
            console.error('Restore users mutation error:', error);
        },
    });
};

// Hook for hard deleting single user
export const useHardDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerHardDeleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPANIES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH] });
        },
        onError: (error) => {
            console.error('Hard delete user mutation error:', error);
        },
    });
};

// Hook for hard deleting multiple users
export const useHardDeleteUsers = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: handlerHardDeleteUsers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
        },
        onError: (error) => {
            console.error('Hard delete users mutation error:', error);
        },
    });
};

// Hook for previewing soft delete users impact
export const usePreviewSoftDeleteUsers = () => {
    return useMutation({
        mutationFn: handlerPreviewSoftDeleteUsers,
        onError: (error) => {
            console.error('Preview soft delete users error:', error);
        },
    });
};

// Hook for previewing hard delete users impact
export const usePreviewHardDeleteUsers = () => {
    return useMutation({
        mutationFn: handlerPreviewHardDeleteUsers,
        onError: (error) => {
            console.error('Preview hard delete users error:', error);
        },
    });
};

// Hook for admin reset password
export const useAdminResetPassword = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: handlerAdminResetPassword,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
        },
        onError: (error) => {
            console.error('Admin reset password error:', error);
        },
    });
};
