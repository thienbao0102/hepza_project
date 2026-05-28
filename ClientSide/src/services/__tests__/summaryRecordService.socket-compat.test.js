import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetSummaryRecord } from '@/services/summaryRecordService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('summaryRecordService socket compatibility', () => {
  it('returns unchanged shape for handlerGetSummaryRecord', async () => {
    const payload = { summaryRecord: [] };
    requestViaTransport.mockResolvedValue(payload);

    const rs = await handlerGetSummaryRecord({ periodKeyStart: 202501, periodKeyEnd: 202502 });

    expect(rs).toEqual(payload);
  });
});
