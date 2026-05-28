const { default: mongoose } = require('mongoose');
const { registerDomainHandlers } = require('./registerDomainHandlers');

const getZoneService = () => require('../services/industrialZoneService');

const parseZoneData = (payload) => {
  if (!payload) return null;
  if (payload.zoneData && typeof payload.zoneData === 'string') {
    return JSON.parse(payload.zoneData);
  }
  return payload.zoneData || payload;
};

const safeParse = (val, fallback = {}) => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const registerZoneHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'zone:getAll',
      execute: async ({ payload }) => {
        const page = Number(payload?.page || 1);
        const limit = Number(payload?.limit || 10);
        const filterParams = safeParse(payload?.filters);
        const search = payload?.search || '';
        const { zones, total } = await getZoneService().getAllIndustrialZones(page, limit, filterParams, search);
        return { message: 'Industrial zones retrieved successfully', zones, total };
      },
    },
    {
      event: 'zone:getById',
      execute: async ({ payload }) => {
        const zoneId = payload?.zone_id || payload?.zoneId || payload;
        const zone = await getZoneService().getZoneById(zoneId);
        if (!zone) throw new Error('Industrial zone not found');
        return { message: 'Industrial zone retrieved successfully', zone };
      },
    },
    {
      event: 'zone:create',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          if (user.role !== 'admin') throw new Error('Only admin can create industrial zone');

          const zoneData = parseZoneData(payload);
          if (!zoneData) throw new Error('zoneData is required');
          if (!zoneData.zone_name || !zoneData.zone_type || !zoneData.location || !zoneData.established_year) {
            throw new Error('Missing required fields: zone_name, zone_type, location, established_year');
          }

          if (payload?.image_url) zoneData.image_url = payload.image_url;

          const zone = await getZoneService().createIndustrialZone(zoneData, user.user_id, session, { file: null });
          await session.commitTransaction();
          return { message: 'Industrial zone added successfully', zone };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:update',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          if (user.role !== 'admin') throw new Error('Only admin can update industrial zone');

          const zoneId = payload?.zone_id || payload?.zoneId;
          if (!zoneId) throw new Error('zoneId is required');

          const zoneData = parseZoneData(payload);
          if (!zoneData) throw new Error('zoneData is required');

          const existing = await getZoneService().getZoneById(zoneId);
          if (!existing) throw new Error('Industrial zone not found');

          if (payload?.image_url !== undefined) zoneData.image_url = payload.image_url;

          const zone = await getZoneService().updateIndustrialZone(zoneId, zoneData, user.user_id, session, { file: null });
          await session.commitTransaction();
          return { message: 'Industrial zone updated successfully', zone };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:deleteOne',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneId = payload?.zone_id || payload?.zoneId || payload;
          await getZoneService().deleteIndustrialZone(zoneId, user, session);
          await session.commitTransaction();
          return { message: 'Industrial zone deleted successfully' };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:restoreOne',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneId = payload?.zone_id || payload?.zoneId || payload;
          const zone = await getZoneService().restoreIndustrialZone(zoneId, user, session);
          await session.commitTransaction();
          return { message: 'Industrial zone restored successfully', zone };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:deleteMany',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneIds = payload?.zoneIds || payload?.zone_ids || payload || [];
          if (!Array.isArray(zoneIds) || zoneIds.length === 0) throw new Error('zoneIds array is required');
          const result = await getZoneService().deleteIndustrialZones(zoneIds, user, session);
          await session.commitTransaction();
          return { message: 'Industrial zones deleted successfully', ...result };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:restoreMany',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneIds = payload?.zoneIds || payload?.zone_ids || payload || [];
          if (!Array.isArray(zoneIds) || zoneIds.length === 0) throw new Error('zoneIds array is required');
          const result = await getZoneService().restoreIndustrialZones(zoneIds, user, session);
          await session.commitTransaction();
          return { message: 'Industrial zones restored successfully', ...result };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:hardDeleteOne',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneId = payload?.zone_id || payload?.zoneId || payload;
          const result = await getZoneService().hardDeleteIndustrialZone(zoneId, user, session);
          await session.commitTransaction();
          return result;
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:hardDeleteMany',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const user = socket.userDetails || socket.user || {};
          const zoneIds = payload?.zoneIds || payload?.zone_ids || payload || [];
          if (!Array.isArray(zoneIds) || zoneIds.length === 0) throw new Error('zoneIds array is required');
          const result = await getZoneService().hardDeleteIndustrialZones(zoneIds, user, session);
          await session.commitTransaction();
          return result;
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'zone:previewSoftDelete',
      execute: async ({ payload }) => {
        const zoneIds = payload?.zone_ids || payload?.zoneIds || payload || [];
        return await getZoneService().previewSoftDeleteZones(zoneIds);
      },
    },
    {
      event: 'zone:previewHardDelete',
      execute: async ({ payload }) => {
        const zoneIds = payload?.zone_ids || payload?.zoneIds || payload || [];
        return await getZoneService().previewHardDeleteZones(zoneIds);
      },
    },
  ]);
};

module.exports = { registerZoneHandlers };

