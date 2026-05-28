import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStableQuery } from '@hooks/useStableQuery';
import { QUERY_KEYS } from '@lib/queryClient';
import {
  handlerLogin,
  handlerLogout,
  handlerGetAuthenticatedUser,
  handlerRequestPasswordReset,
  handlerInitiateResetPassword,
  handlerResetPassword,
  handlerChangePassword,
  handlerRefreshToken,
} from '@services/authService';

// Hook for getting current authenticated user
export const useAuthenticatedUser = (options = {}) => {
  return useStableQuery(
    [QUERY_KEYS.AUTH, 'user'],
    ({ signal }) => handlerGetAuthenticatedUser(signal),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry if it's an auth error (401, 403)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      ...options
    }
  );
};

// Hook for login
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) => handlerLogin(email, password),
    onSuccess: (data) => {
      // Set user data in cache
      queryClient.setQueryData([QUERY_KEYS.AUTH, 'user'], data);
      // Invalidate all queries to refresh data with new auth state
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
      // Clear any existing auth data on login failure
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.AUTH] });
    },
  });
};

// Hook for logout
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: handlerLogout,
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
      // Remove user from sessionStorage (already done in service)
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      // Even if logout fails, clear local data
      queryClient.clear();
    },
  });
};

// Hook for requesting password reset
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: handlerRequestPasswordReset,
    onError: (error) => {
      console.error('Request password reset mutation error:', error);
    },
  });
};

// Hook for initiating password reset (from email link)
export const useInitiateResetPassword = () => {
  return useMutation({
    mutationFn: handlerInitiateResetPassword,
    onError: (error) => {
      console.error('Initiate reset password mutation error:', error);
    },
  });
};

// Hook for resetting password
export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ newPassword, confirmPassword }) => handlerResetPassword(newPassword, confirmPassword),
    onSuccess: () => {
      // Clear auth data after password reset
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.AUTH] });
    },
    onError: (error) => {
      console.error('Reset password mutation error:', error);
    },
  });
};

// Hook for changing password
export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ currentPassword, newPassword, confirmPassword, firstLogin, resetToken }) =>
      handlerChangePassword(currentPassword, newPassword, confirmPassword, firstLogin, resetToken),
    onSuccess: () => {
      // Clear auth data after password change (user needs to login again)
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.AUTH] });
    },
    // Do not log to console here; let the caller component show a friendly notification
    onError: () => { },
    retry: false,
  });
};

// Hook for refreshing token
export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: handlerRefreshToken,
    onSuccess: () => {
      // Invalidate auth queries to refetch with new token
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH] });
    },
    onError: (error) => {
      console.error('Refresh token mutation error:', error);
      // If refresh fails, clear auth data
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.AUTH] });
    },
  });
};

// Hook to check if user is authenticated
export const useIsAuthenticated = () => {
  const { data: user, isLoading, error } = useAuthenticatedUser({
    retry: false, // Don't retry for this check
    refetchOnWindowFocus: false,
  });

  return {
    isAuthenticated: !!user && !error,
    user,
    isLoading,
    error
  };
};
