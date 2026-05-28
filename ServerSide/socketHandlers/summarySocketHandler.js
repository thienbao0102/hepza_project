const events = require('./eventCatalog');
const { registerDomainHandlers } = require('./registerDomainHandlers');
const cacheManager = require('../lib/cacheManager');
const getSummaryService = () => require('../services/summaryRecordService');

const normalizeInclude = (include) => {
  if (include === undefined || include === null) return [1];
  const list = Array.isArray(include) ? include : [include];
  return list.map((v) => Number(v));
};

const resolveAccess = async (user, company_id, zone_id) => {
  let deniedMessage = null;
  const res = {
    status: () => ({
      json: (body) => {
        deniedMessage = body?.message || body?.error || 'Forbidden';
      },
    }),
  };

  const result = await getSummaryService().checkAccessPermission(user, company_id, zone_id, res);
  if (!result) {
    const err = new Error(deniedMessage || 'Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }

  return result;
};

const registerSummaryHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'summary:getRecord',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const {
          periodKeyStart,
          periodKeyEnd,
          include,
          company_id,
          zone_id,
        } = payload || {};

        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
          const err = new Error('periodKey query parameter is required');
          err.code = 'VALIDATION';
          throw err;
        }

        const access = await resolveAccess(user, company_id, zone_id);
        const incArray = normalizeInclude(include);
        const cacheKey = `cache:socket:summary:getRecord:c_${access.company_id || ''}:z_${access.zone_id || ''}:pStart_${periodKeyStart}:pEnd_${periodKeyEnd}:inc_${incArray.join(',')}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        const summaryRecord = await getSummaryService().getSummaryRecord(
          access.company_id,
          access.zone_id,
          Number(periodKeyStart),
          Number(periodKeyEnd),
          incArray
        );

        const response = {
          message: 'Summary record retrieved successfully',
          isSuccess: true,
          summaryRecord,
        };
        await cacheManager.set(cacheKey, response, 300);
        return response;
      },
    },
    {
      event: 'summary:getByPeriodKey',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const {
          periodKeyStart,
          periodKeyEnd,
          include,
          company_id,
          zone_id,
        } = payload || {};

        if (periodKeyStart === undefined && periodKeyEnd === undefined) {
          const err = new Error('periodKey query parameter is required');
          err.code = 'VALIDATION';
          throw err;
        }

        const access = await resolveAccess(user, company_id, zone_id);
        const incArray = normalizeInclude(include);
        const cacheKey = `cache:socket:summary:getByPeriodKey:c_${access.company_id || ''}:z_${access.zone_id || ''}:pStart_${periodKeyStart}:pEnd_${periodKeyEnd}:inc_${incArray.join(',')}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        const summaryRecord = await getSummaryService().getSummaryRecordByPeriodKey(
          access.company_id,
          access.zone_id,
          Number(periodKeyStart),
          Number(periodKeyEnd),
          incArray
        );

        const response = {
          message: 'Summary record by periodKey retrieved successfully',
          isSuccess: true,
          summaryRecord,
        };
        await cacheManager.set(cacheKey, response, 300);
        return response;
      },
    },
  ]);
};

module.exports = { registerSummaryHandlers };

