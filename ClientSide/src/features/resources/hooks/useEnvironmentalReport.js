import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnvReports, uploadEnvReport, deleteEnvReport } from '@/services/environmentalReportService';

const QUERY_KEY = 'environmental-reports';

export const useEnvReports = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: () => getEnvReports(companyId),
    enabled: !!companyId,
    select: (data) => data?.data || [],
    ...options,
  });
};

export const useUploadEnvReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData, onProgress }) => uploadEnvReport(formData, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useDeleteEnvReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteEnvReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
