const { registerDomainHandlers } = require('./registerDomainHandlers');
const cacheManager = require('../lib/cacheManager');
const getEmissionService = () => require('../services/emissionService');

const registerEmissionHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'emission:getData',
      execute: async ({ payload }) => {
        const { periodKeyStart, periodKeyEnd, zone_id, company_id } = payload || {};
        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
          throw new Error('periodKey query parameter is required');
        }

        const cacheKey = `cache:socket:emission:getData:c_${company_id || ''}:z_${zone_id || ''}:pStart_${periodKeyStart}:pEnd_${periodKeyEnd}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        const emissionData = await getEmissionService().getEmissionByPeriod(company_id, zone_id, periodKeyStart, periodKeyEnd);

        const response = { message: 'Emission data retrieved successfully', emissionData };
        await cacheManager.set(cacheKey, response, 300);
        return response;
      },
    },
  ]);
};

module.exports = { registerEmissionHandlers };
