import { apiClient } from '@lib/api-client';

const BASE = '/api/env-reports';

export const uploadEnvReport = async (formData, onProgress) => {
  const response = await apiClient.post(`${BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
};

export const getEnvReports = async (companyId) => {
  const response = await apiClient.get(`${BASE}/${companyId}`);
  return response.data;
};

export const deleteEnvReport = async (id) => {
  const response = await apiClient.delete(`${BASE}/${id}`);
  return response.data;
};

export const getDownloadUrl = (id) => `${BASE}/download/${id}`;
