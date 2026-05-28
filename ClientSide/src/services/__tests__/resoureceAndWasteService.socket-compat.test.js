import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetSummaryDetail } from '@/services/resoureceAndWasteService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('resoureceAndWasteService socket compatibility', () => {
  it('returns unchanged shape for handlerGetSummaryDetail', async () => {
    const payload = { isSuccess: true, data: [] };
    requestViaTransport.mockResolvedValue(payload);

    const rs = await handlerGetSummaryDetail({ periodKeyStart: 202501, periodKeyEnd: 202502 });

    expect(rs).toEqual(payload);
  });
});
