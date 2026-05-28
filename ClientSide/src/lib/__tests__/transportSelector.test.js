import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';

vi.mock('@/lib/socket-request', () => ({ socketRequest: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async () => ({ data: { ok: true } })),
    post: vi.fn(async () => ({ data: { ok: true } })),
    put: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
  },
}));

describe('requestViaTransport', () => {
  it('uses socket when enabled', async () => {
    const rs = await requestViaTransport({
      method: 'get',
      url: '/x',
      event: 'company:getAll',
      payload: { page: 1 },
      useSocket: true,
    });

    expect(rs).toEqual({ ok: true });
  });

  it('uses http when socket disabled', async () => {
    const rs = await requestViaTransport({
      method: 'get',
      url: '/x',
      payload: { page: 1 },
      useSocket: false,
    });

    expect(rs).toEqual({ ok: true });
  });
});
