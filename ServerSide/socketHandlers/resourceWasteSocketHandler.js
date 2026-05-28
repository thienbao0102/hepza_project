const { default: mongoose } = require('mongoose');
const { registerDomainHandlers } = require('./registerDomainHandlers');
const cacheManager = require('../lib/cacheManager');
const { invalidateResourceWasteCache } = require('../controllers/resourceAndWasteController');
const getResourceService = () => require('../services/resoureceAndWasteService');

const normalizeInclude = (include) => {
  if (include === undefined || include === null) return [1];
  const list = Array.isArray(include) ? include : [include];
  return list.map((v) => Number(v));
};

const getPeriodKey = (value) => {
  if (value) return Number(value);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return Number(`${year}${month.toString().padStart(2, '0')}`);
};

const registerResourceWasteHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'resourceWaste:create',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const insertData = { ...(payload || {}) };
          const periodKey = getPeriodKey(insertData.periodKey);
          delete insertData.periodKey;

          const userId = user?.user_id || user?._id;
          const result = await getResourceService().processResourceDataCreate(
            insertData,
            user.company_id,
            user.zone_id,
            periodKey,
            session,
            userId
          );

          if (!result || !result.success) {
            throw new Error('Failed, This month has been declared in the system');
          }

          await session.commitTransaction();

          // Invalidate cache so new data appears immediately
          invalidateResourceWasteCache(result.company_id, result.zone_id);

          // Recalculate summary NGOÀI transaction (giống REST controller)
          try {
            await getResourceService().recalculateSummaryRecord(
              result.company_id, result.zone_id, 'company', result.periodKey, null
            );
          } catch (e) {
            console.warn('Post-tx recalculate failed (non-critical):', e.message);
          }

          return { message: 'success', isSuccess: true, createdFuelIds: result.createdFuelIds || [], createdWasteIds: result.createdWasteIds || [] };
        } catch (error) {
          if (session.inTransaction()) await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'resourceWaste:update',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const updateData = { ...(payload || {}) };
          const periodKey = getPeriodKey(updateData.periodKey);

          const userId = user?.user_id || user?._id;
          const result = await getResourceService().processResourceDataUpdate(
            updateData,
            user.company_id,
            periodKey,
            session,
            userId
          );

          if (!result || !result.success) {
            throw new Error('failed');
          }

          await session.commitTransaction();

          // Invalidate cache so updated data appears immediately
          invalidateResourceWasteCache(result.company_id, result.zone_id);

          // Recalculate summary NGOÀI transaction (giống REST controller)
          try {
            await getResourceService().recalculateSummaryRecord(
              result.company_id, result.zone_id, 'company', result.periodKey, null
            );
          } catch (e) {
            console.warn('Post-tx recalculate failed (non-critical):', e.message);
          }

          return { message: 'success', isSuccess: true, createdFuelIds: result.createdFuelIds || [], createdWasteIds: result.createdWasteIds || [] };
        } catch (error) {
          if (session.inTransaction()) await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'resourceWaste:getData',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        let { periodKeyStart, periodKeyEnd, include, company_id, zone_id } = payload || {};

        if (!periodKeyStart && !periodKeyEnd) {
          throw new Error('periodKeyStart and periodKeyEnd is required');
        }

        include = normalizeInclude(include);
        periodKeyStart = Number(periodKeyStart);
        periodKeyEnd = Number(periodKeyEnd);

        const cacheKey = `cache:socket:resourceWaste:getData:c_${company_id || ''}:z_${zone_id || ''}:pStart_${periodKeyStart}:pEnd_${periodKeyEnd}:inc_${include.join(',')}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        const dataResources = await getResourceService().processGetListDataResource(
          periodKeyStart,
          periodKeyEnd,
          include,
          user.role,
          company_id,
          zone_id
        );

        const response = { message: 'Get data Resources successfull', isSuccess: true, dataResources };
        await cacheManager.set(cacheKey, response, 300);
        return response;
      },
    },
    {
      event: 'resourceWaste:getAllWithHistory',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const { company_id, zone_id, periodKey, periodKeys } = payload || {};

        const include = [1, 2, 3, 4, 5, 6];

        if (periodKeys) {
          const keys = String(periodKeys)
            .split(',')
            .map((k) => Number(k))
            .filter((k) => !Number.isNaN(k) && k > 0);

          const maxKeys = 12;
          if (keys.length > maxKeys) {
            throw new Error(`Tối đa ${maxKeys} kỳ`);
          }

          const cacheKey = `cache:socket:resourceWaste:getAllWithHistory_batch:c_${company_id || ''}:z_${zone_id || ''}:pKeys_${keys.join('_')}`;
          const cached = await cacheManager.get(cacheKey);
          if (cached) return cached;

          const results = await Promise.all(
            keys.map((key) =>
              getResourceService().getAllResourceDataWithHistory(company_id, zone_id, key, include, user.role)
            )
          );

          const dataResources = results
            .map((result, index) => ({ ...result, periodKey: keys[index] }))
            .filter((item) => {
              const hasHistory = item.resource_change && item.resource_change.length > 0;
              const hasData = Object.keys(item).some(
                (k) => k !== 'resource_change' && k !== 'periodKey' && Array.isArray(item[k]) && item[k].length > 0
              );
              return hasHistory || hasData;
            });

          const response = { message: 'Get all data Resources with history successfull', isSuccess: true, dataResources };
          await cacheManager.set(cacheKey, response, 300);
          return response;
        }

        const cacheKeySingle = `cache:socket:resourceWaste:getAllWithHistory_single:c_${company_id || ''}:z_${zone_id || ''}:pKey_${periodKey}`;
        const cachedSingle = await cacheManager.get(cacheKeySingle);
        if (cachedSingle) return cachedSingle;

        const dataResourcesRaw = await getResourceService().getAllResourceDataWithHistory(
          company_id,
          zone_id,
          Number(periodKey),
          include,
          user.role
        );

        const dataResources = [{ ...dataResourcesRaw, periodKey: Number(periodKey) }];
        const responseSingle = { message: 'Get all data Resources with history successfull', isSuccess: true, dataResources };
        await cacheManager.set(cacheKeySingle, responseSingle, 300);
        return responseSingle;
      },
    },
    {
      event: 'resourceWaste:import',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const { periodKey, data, options = {} } = payload || {};

          if (!periodKey) {
            throw new Error('periodKey is required');
          }

          if (!data || Object.keys(data).length === 0) {
            throw new Error('No data to import');
          }

          const userId = user?.user_id || user?._id;
          const company_id = user.company_id;
          const zone_id = user.zone_id;

          const result = await getResourceService().processImportResourceData(
            data,
            company_id,
            zone_id,
            Number(periodKey),
            session,
            userId,
            options
          );

          if (!result.isSuccess) {
            throw new Error(result.message || 'Import failed');
          }

          await session.commitTransaction();

          // Invalidate cache so imported data appears immediately
          invalidateResourceWasteCache(result.company_id, result.zone_id);

          // Recalculate summary NGOÀI transaction (giống REST controller)
          try {
            await getResourceService().recalculateSummaryRecord(
              result.company_id, result.zone_id, 'company', result.periodKey, null
            );
          } catch (e) {
            console.warn('Post-tx recalculate failed (non-critical):', e.message);
          }

          return { message: 'Import successful', isSuccess: true, summary: result.summary };
        } catch (error) {
          if (session.inTransaction()) await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
  ]);
};

module.exports = { registerResourceWasteHandlers };

