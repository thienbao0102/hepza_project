import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetAllIndustryGroups } from '@/services/industryService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('industryService socket compatibility', () => {
  it('returns unchanged shape for handlerGetAllIndustryGroups', async () => {
    requestViaTransport.mockResolvedValue({ groups: [], total: 0 });

    const rs = await handlerGetAllIndustryGroups({ page: 1, limit: 10, search: '' });

    expect(rs).toEqual({ groups: [], total: 0 });
  });
});
