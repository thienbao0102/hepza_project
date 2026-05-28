import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetSolutionDetail } from '@/services/solutionService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('solutionService socket compatibility', () => {
  it('returns unchanged shape for handlerGetSolutionDetail', async () => {
    requestViaTransport.mockResolvedValue({ solution: { _id: 's1' } });

    const rs = await handlerGetSolutionDetail('s1');

    expect(rs).toEqual({ _id: 's1' });
  });
});
