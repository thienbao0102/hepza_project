import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// Hook để tạo stable query keys và tránh unnecessary refetches
export const useStableQuery = (queryKey, queryFn, options = {}) => {
  // Memoize query key để tránh re-render không cần thiết
  const stableQueryKey = useMemo(() => {
    if (Array.isArray(queryKey)) {
      return queryKey.map(key => 
        typeof key === 'object' ? JSON.stringify(key) : key
      );
    }
    return queryKey;
  }, [JSON.stringify(queryKey)]);

  // Memoize options để tránh re-render
  const stableOptions = useMemo(() => ({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    ...options,
  }), [JSON.stringify(options)]);

  const result = useQuery({
    queryKey: stableQueryKey,
    queryFn,
    ...stableOptions,
  });

  // Transform error to prevent React child error
  if (result.error && typeof result.error === 'object') {
    return {
      ...result,
      error: result.error.message || 'An error occurred'
    };
  }

  return result;
};
