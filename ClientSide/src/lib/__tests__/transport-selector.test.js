import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { ok: true } }),
    post: vi.fn().mockResolvedValue({ data: { ok: true } }),
    put: vi.fn().mockResolvedValue({ data: { ok: true } }),
    delete: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

vi.mock('@/lib/socket-request', () => ({
  socketRequest: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/utils/ApiError', () => ({
  default: class ApiError extends Error {
    constructor(message, code, errorCode) {
      super(message);
      this.code = errorCode;
    }
  },
}));

import { requestViaTransport } from '@/lib/transport-selector';
import { socketRequest } from '@/lib/socket-request';
import { apiClient } from '@/lib/api-client';

describe('transport-selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FormData guard', () => {
    it('forces HTTP when payload is FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']));

      await requestViaTransport({
        method: 'post',
        url: '/api/upload',
        event: 'zone:create',
        payload: formData,
        useSocket: true,
      });

      expect(socketRequest).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith('/api/upload', formData, undefined);
    });

    it('forces HTTP when Content-Type is multipart/form-data', async () => {
      await requestViaTransport({
        method: 'post',
        url: '/api/upload',
        event: 'zone:create',
        payload: { data: 'test' },
        config: { headers: { 'Content-Type': 'multipart/form-data' } },
        useSocket: true,
      });

      expect(socketRequest).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalled();
    });

    it('uses socket for normal JSON payload', async () => {
      await requestViaTransport({
        method: 'post',
        url: '/api/data',
        event: 'company:create',
        payload: { name: 'test' },
        useSocket: true,
      });

      expect(socketRequest).toHaveBeenCalledWith('company:create', { name: 'test' }, undefined);
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
