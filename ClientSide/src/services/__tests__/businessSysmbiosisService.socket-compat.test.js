import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import {
  addBuyDemand,
  addSellSupply,
  getBuyDemands,
  getSellSupplies,
  deleteBuyDemand,
  deleteSellSupply,
  updateBuyDemand,
  updateSellSupply,
  getBuyRecommendations,
  getSellRecommendations,
} from '@/services/businessSysmbiosisService';

describe('businessSysmbiosisService socket compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('add functions (return raw result)', () => {
    it('addBuyDemand sends correct event and preserves field defaults', async () => {
      apiClient.post.mockResolvedValue({ data: { data: { _id: '1' }, isSuccess: true } });
      const result = await addBuyDemand({ wasteName: 'plastic' });

      const [url, formData, config] = apiClient.post.mock.calls[0];
      const payload = JSON.parse(formData.get('data'));

      expect(url).toContain('/api/business-symbiosis');
      expect(payload).toEqual(expect.objectContaining({
        wasteName: 'plastic',
        unit: 'Tấn',
        currency: 'VND',
        quantity: 0,
      }));
      expect(config).toEqual(expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': undefined }),
      }));
      expect(result).toEqual({ data: { _id: '1' }, isSuccess: true });
    });

    it('addSellSupply sends correct event and preserves field defaults', async () => {
      apiClient.post.mockResolvedValue({ data: { data: { _id: '2' }, isSuccess: true } });
      await addSellSupply({ wasteName: 'paper' });

      const [, formData] = apiClient.post.mock.calls[0];
      const payload = JSON.parse(formData.get('data'));

      expect(payload).toEqual(expect.objectContaining({
        unit: 'Tấn',
        currency: 'VND',
        frequency: 'một lần',
      }));
    });
  });

  describe('get functions (unwrap result)', () => {
    it('getBuyDemands unwraps HTTP-style response', async () => {
      requestViaTransport.mockResolvedValue({ data: [{ _id: '1' }], isSuccess: true });
      const result = await getBuyDemands();
      expect(result).toEqual([{ _id: '1' }]);
    });

    it('getBuyDemands handles already-unwrapped socket response', async () => {
      requestViaTransport.mockResolvedValue([{ _id: '1' }]);
      const result = await getBuyDemands();
      expect(result).toEqual([{ _id: '1' }]);
    });

    it('getSellSupplies sends correct event', async () => {
      requestViaTransport.mockResolvedValue([]);
      await getSellSupplies();
      expect(requestViaTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          event: 'symbiosis:getSellSupplies',
        })
      );
    });

    it('getBuyRecommendations sends correct event', async () => {
      requestViaTransport.mockResolvedValue([]);
      await getBuyRecommendations();
      expect(requestViaTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          event: 'symbiosis:getBuyRecommendations',
        })
      );
    });

    it('getSellRecommendations sends correct event', async () => {
      requestViaTransport.mockResolvedValue([]);
      await getSellRecommendations();
      expect(requestViaTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          event: 'symbiosis:getSellRecommendations',
        })
      );
    });
  });

  describe('delete functions (return raw, unused by components)', () => {
    it('deleteBuyDemand sends ID in payload and URL', async () => {
      requestViaTransport.mockResolvedValue({ isSuccess: true });
      await deleteBuyDemand('abc123');
      expect(requestViaTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'delete',
          event: 'symbiosis:deleteBuyDemand',
          payload: { _id: 'abc123' },
        })
      );
      expect(requestViaTransport.mock.calls[0][0].url).toContain('abc123');
    });

    it('deleteSellSupply sends ID in payload and URL', async () => {
      requestViaTransport.mockResolvedValue({ isSuccess: true });
      await deleteSellSupply('def456');
      expect(requestViaTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'delete',
          event: 'symbiosis:deleteSellSupply',
          payload: { _id: 'def456' },
        })
      );
    });
  });

  describe('update functions (unwrap result)', () => {
    it('updateBuyDemand sends ID + data and unwraps response', async () => {
      apiClient.put.mockResolvedValue({ data: { data: { _id: 'abc', wasteName: 'updated' }, isSuccess: true } });
      const result = await updateBuyDemand('abc', { wasteName: 'updated' });
      expect(result).toEqual({ _id: 'abc', wasteName: 'updated' });
      const [url, formData] = apiClient.put.mock.calls[0];
      const payload = JSON.parse(formData.get('data'));

      expect(url).toContain('abc');
      expect(payload).toEqual(expect.objectContaining({ wasteName: 'updated' }));
    });

    it('updateSellSupply sends ID + data and unwraps response', async () => {
      apiClient.put.mockResolvedValue({ data: { data: { _id: 'def', wasteName: 'updated' }, isSuccess: true } });
      const result = await updateSellSupply('def', { wasteName: 'updated' });
      expect(result).toEqual({ _id: 'def', wasteName: 'updated' });

      const [url, formData] = apiClient.put.mock.calls[0];
      const payload = JSON.parse(formData.get('data'));

      expect(url).toContain('def');
      expect(payload).toEqual(expect.objectContaining({ wasteName: 'updated' }));
    });
  });
});
