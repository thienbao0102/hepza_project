import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { handlerGetAllCompany } from '@/services/companyService';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('companyService socket compatibility', () => {
  it('returns unchanged shape for handlerGetAllCompany', async () => {
    apiClient.get.mockResolvedValue({
      data: { companies: [], totalItems: 0, totalPages: 0 },
    });

    const rs = await handlerGetAllCompany({ page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      })
    );
    expect(rs).toEqual({ companies: [], totalItems: 0, totalPages: 0, currentPage: 1 });
  });
});
