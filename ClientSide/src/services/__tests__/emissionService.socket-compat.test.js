import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetEmissionData } from '@/services/emissionService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('emissionService socket compatibility', () => {
  it('returns unchanged shape for handlerGetEmissionData', async () => {
    const payload = { emissionData: [] };
    requestViaTransport.mockResolvedValue(payload);

    const rs = await handlerGetEmissionData({ periodKeyStart: 202501, periodKeyEnd: 202502 });

    expect(rs).toEqual(payload);
  });
});
