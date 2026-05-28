import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetAllZones } from '@/services/zoneService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('zoneService socket compatibility', () => {
  it('returns unchanged shape for handlerGetAllZones', async () => {
    requestViaTransport.mockResolvedValue({ zones: [], totalItems: 0, total: 0 });

    const rs = await handlerGetAllZones({ page: 1, limit: 10, search: '', filters: {} });

    expect(rs).toEqual({ zones: [], totalItems: 0, totalPages: 0, currentPage: 1 });
  });
});
