import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { handlerGetUsersByRole } from '@/services/userService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('userService socket compatibility', () => {
  it('returns unchanged response shape for handlerGetUsersByRole', async () => {
    const payload = { message: 'ok', users: [], totalPages: 1, totalCount: 0 };
    requestViaTransport.mockResolvedValue(payload);

    const rs = await handlerGetUsersByRole('company', 1, 10, {}, {});

    expect(rs).toEqual(payload);
  });
});
