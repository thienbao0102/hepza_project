import { useQuery } from '@tanstack/react-query';
import { handlerGetSolutionData } from '@services/solutionService';
import {
  normalizeSolutionList,
  groupSolutionsByCategory,
  findSolutionById,
} from '@utils/solutionUtils';
import { queryKeys } from '@lib/queryClient';

const fetchSolutions = async (filters = {}, signal) => {
  const response = await handlerGetSolutionData(filters, signal);
  return {
    ...response,
    solutionData: normalizeSolutionList(response.solutionData || [])
  };
};

export const useSolutions = (filters = {}, options = {}) => {
  const { select, ...restOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.solutions.all, filters],
    queryFn: ({ signal }) => fetchSolutions(filters, signal),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...restOptions,
    select: (data) => {
      const result = data.solutionData || [];
      return typeof select === 'function' ? select(result) : result;
    },
  });
};

export const useSolutionsByGroup = (filters = {}, options = {}) => {
  const { select, ...restOptions } = options;

  const groupSelect = (list) => {
    const grouped = groupSolutionsByCategory(list);
    return typeof select === 'function' ? select(grouped) : grouped;
  };

  return useSolutions(filters, {
    ...restOptions,
    select: groupSelect,
  });
};

export const useSolutionById = (solutionId, options = {}) => {
  const { select, enabled = true, ...restOptions } = options;

  const detailSelect = (list) => {
    const found = findSolutionById(list, solutionId);
    return typeof select === 'function' ? select(found) : found;
  };

  return useSolutions({}, {
    ...restOptions,
    enabled: enabled && !!solutionId,
    select: detailSelect,
  });
};

export const useSolutionsPaginated = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: [...queryKeys.solutions.all, 'paginated', filters],
    queryFn: ({ signal }) => fetchSolutions(filters, signal),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
    ...options,
  });
};

