import { describe, it, expect, vi } from 'vitest';
import { handlerLogin } from '@/services/authService';
import { apiClient } from '@/lib/api-client';
import { requestViaTransport } from '@/lib/transport-selector';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(async () => ({ data: { message: 'ok' } })),
    get: vi.fn(async () => ({ data: {} })),
  },
}));

vi.mock('@/lib/transport-selector', () => ({
  requestViaTransport: vi.fn(),
}));

describe('authService http-only', () => {
  it('uses apiClient and does not use transport selector for handlerLogin', async () => {
    const rs = await handlerLogin('a@b.com', '123456');

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(requestViaTransport).not.toHaveBeenCalled();
    expect(rs).toEqual({ message: 'ok' });
  });
});
