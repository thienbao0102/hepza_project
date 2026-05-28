import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { errorLogService } from '@/services/errorLogService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('errorLogService socket compatibility', () => {
  it('returns unchanged shape for getAllErrorLogs', async () => {
    const payload = [{ _id: '1' }];
    requestViaTransport.mockResolvedValue(payload);

    const rs = await errorLogService.getAllErrorLogs();

    expect(rs).toEqual(payload);
  });
});
