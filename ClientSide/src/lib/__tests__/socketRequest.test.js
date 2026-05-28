import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiError from '@/utils/ApiError';
import { socketRequest } from '@/lib/socket-request';
import { getSocket } from '@/utils/socket';

vi.mock('@/utils/socket', () => ({ getSocket: vi.fn() }));

describe('socketRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ack data on success', async () => {
    const emit = vi.fn((event, payload, cb) => cb({ isSuccess: true, data: { ok: 1 } }));
    getSocket.mockReturnValue({ connected: true, emit, id: 's1' });

    const rs = await socketRequest('company:getAll', { page: 1 });
    expect(rs).toEqual({ ok: 1 });
  });

  it('throws ApiError on business error', async () => {
    const emit = vi.fn((event, payload, cb) => cb({ isSuccess: false, error: 'forbidden' }));
    getSocket.mockReturnValue({ connected: true, emit, id: 's1' });

    await expect(socketRequest('company:getAll', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('throws timeout on missing ack', async () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    getSocket.mockReturnValue({ connected: true, emit, id: 's1' });

    const p = socketRequest('company:getAll', {}, { timeoutMs: 50 });
    vi.advanceTimersByTime(51);
    await expect(p).rejects.toBeInstanceOf(ApiError);

    vi.useRealTimers();
  });
});
