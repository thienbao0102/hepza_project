import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      // Prevent refetch on click/interaction
      refetchOnReconnect: 'always',
      refetchInterval: false,
      refetchIntervalInBackground: false,
      onError: (error) => {
        console.error("Global Query Error:", error);
        // Check for server-side errors (500-599) or network errors
        const isServerError = error.response?.status >= 500;
        const isNetworkError = error.message === 'Network Error';

        if (isServerError || isNetworkError) {
          // Redirect to a dedicated server error page
          // Using window.location for redirection from outside a component context
          if (window.location.pathname !== '/server-error') {
            window.location.href = '/server-error';
          }
        }
      },
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Show error notifications
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Zone queries
  zones: {
    all: ['zones'],
    lists: () => [...queryKeys.zones.all, 'list'],
    list: (filters) => [...queryKeys.zones.lists(), filters],
    details: () => [...queryKeys.zones.all, 'detail'],
    detail: (id) => [...queryKeys.zones.details(), id],
  },
  // Solution queries
  solutions: {
    all: ['solutions'],
    lists: () => [...queryKeys.solutions.all, 'list'],
    list: (filters) => [...queryKeys.solutions.lists(), filters],
    details: () => [...queryKeys.solutions.all, 'detail'],
    detail: (id) => [...queryKeys.solutions.details(), id],
  },
  // Hashtag queries
  hashtags: {
    all: ['hashtags'],
    lists: () => [...queryKeys.hashtags.all, 'list'],
    list: (filters) => [...queryKeys.hashtags.lists(), filters],
    details: () => [...queryKeys.hashtags.all, 'detail'],
    detail: (id) => [...queryKeys.hashtags.details(), id],
  },
  // Company queries
  companies: {
    all: ['companies'],
    lists: () => [...queryKeys.companies.all, 'list'],
    list: (filters) => [...queryKeys.companies.lists(), filters],
    details: () => [...queryKeys.companies.all, 'detail'],
    detail: (id) => [...queryKeys.companies.details(), id],
    deleted: (filters) => [...queryKeys.companies.all, 'deleted', filters],
  },
  // User queries
  users: {
    all: ['users'],
    lists: () => [...queryKeys.users.all, 'list'],
    list: (filters) => [...queryKeys.users.lists(), filters],
    details: () => [...queryKeys.users.all, 'detail'],
    detail: (id) => [...queryKeys.users.details(), id],
    byRole: (role, filters) => [...queryKeys.users.all, 'role', role, filters],
  },
  notifications: {
    all: ['notifications'],
    sent: () => [...queryKeys.notifications.all, 'sent'],
    sentList: (filters) => [...queryKeys.notifications.sent(), filters],
    user: () => [...queryKeys.notifications.all, 'user'],
    userList: (filters) => [...queryKeys.notifications.user(), filters],
    templates: () => [...queryKeys.notifications.all, 'templates'],
    templateList: (filters) => [...queryKeys.notifications.templates(), filters],
    templateDetail: (id) => [...queryKeys.notifications.templates(), 'detail', id],
    disabledTemplates: () => [...queryKeys.notifications.all, 'disabledTemplates'],
    disabledTemplateList: (filters) => [...queryKeys.notifications.disabledTemplates(), filters],
  },
  // Auth queries
  auth: {
    user: ['auth', 'user'],
  },
};

// Simple query keys for backward compatibility
export const QUERY_KEYS = {
  ZONES: 'zones',
  SOLUTIONS: 'solutions',
  COMPANIES: 'companies',
  USERS: 'users',
  AUTH: 'auth',
};
