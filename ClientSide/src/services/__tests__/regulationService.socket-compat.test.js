import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { getRegulationData } from '@/services/regulationService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('regulationService socket compatibility', () => {
  it('returns unchanged shape for getRegulationData', async () => {
    requestViaTransport.mockResolvedValue({ regulationData: [] });

    const rs = await getRegulationData();

    expect(rs).toEqual([]);
  });
});
