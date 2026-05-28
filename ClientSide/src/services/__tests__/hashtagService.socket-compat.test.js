import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetAllHashtags } from '@/services/hashtagService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('hashtagService socket compatibility', () => {
  it('returns unchanged shape for handlerGetAllHashtags', async () => {
    requestViaTransport.mockResolvedValue({ hashtags: [] });

    const rs = await handlerGetAllHashtags();

    expect(rs).toEqual([]);
  });
});
