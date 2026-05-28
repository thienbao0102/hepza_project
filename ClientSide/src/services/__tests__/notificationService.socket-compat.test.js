import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { handlerGetTemplates } from '@/services/notificationService';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('notificationService socket compatibility', () => {
  it('returns unchanged shape for handlerGetTemplates', async () => {
    apiClient.get.mockResolvedValue({
      data: { templates: [], totalItems: 0, totalPages: 0 },
    });

    const rs = await handlerGetTemplates({ page: 1, limit: 10 });

    expect(rs).toEqual({ templates: [], totalItems: 0, totalPages: 0, currentPage: 1 });
  });
});
