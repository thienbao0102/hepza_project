const { registerDomainHandlers } = require('./registerDomainHandlers');
const mongoose = require('mongoose');

const getIndustryService = () => require('../services/industryService');
const getActor = (socket) => socket.userDetails || socket.user || {};

const registerIndustryHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'industry:getGroups',
      execute: async ({ payload }) => {
        const { page = 1, limit = 10, search = '' } = payload || {};
        const { groups, total } = await getIndustryService().getAllIndustryGroups(page, limit, search);

        // Đếm số ngành trong mỗi nhóm cho Socket API
        const groupsWithCount = await Promise.all(
          groups.map(async (group) => {
            const industryCount = await getIndustryService().countIndustriesByGroup(group.group_id);
            return { ...group, industry_count: industryCount };
          })
        );

        return { message: 'Industry groups retrieved successfully', groups: groupsWithCount, total };
      },
    },
    {
      event: 'industry:getAll',
      execute: async ({ payload }) => {
        const { page = 1, limit = 10, search = '', filters = {} } = payload || {};
        let parsedFilters = filters;
        if (typeof filters === 'string') {
          try { parsedFilters = JSON.parse(filters); } catch (e) { parsedFilters = {}; }
        }
        const { industries, total } = await getIndustryService().getAllIndustries(page, limit, search, parsedFilters);
        return { message: 'Industries retrieved successfully', industries, total };
      },
    },
    {
      event: 'industry:getGroupById',
      execute: async ({ payload }) => {
        const groupId = payload?.group_id || payload;
        const group = await getIndustryService().getIndustryGroupById(groupId);
        if (!group) throw new Error('Industry group not found');
        return { message: 'Industry group retrieved successfully', group };
      },
    },
    {
      event: 'industry:getById',
      execute: async ({ payload }) => {
        const industryId = payload?.industry_id || payload;
        const industry = await getIndustryService().getIndustryById(industryId);
        if (!industry) throw new Error('Industry not found');
        return { message: 'Industry retrieved successfully', industry };
      },
    },
    {
      event: 'industry:createGroup',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const groupData = { ...(payload || {}), created_by: actor.user_id, updated_by: actor.user_id };
          const group = await getIndustryService().createIndustryGroup(groupData, session);
          await session.commitTransaction();
          return { message: 'Industry group added successfully', group };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:create',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const industryData = { ...(payload || {}), created_by: actor.user_id, updated_by: actor.user_id };
          if (!industryData.industry_name || !industryData.group_id) throw new Error('industry_name and group_id are required');
          const industry = await getIndustryService().createIndustry(industryData, session);
          await session.commitTransaction();
          return { message: 'Industry added successfully', industry };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:updateGroup',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const groupId = payload?.group_id;
          const updateData = { ...(payload || {}), updated_by: actor.user_id, updated_at: new Date() };
          const group = await getIndustryService().updateIndustryGroup(groupId, updateData, session);
          if (!group) throw new Error('Industry group not found');
          await session.commitTransaction();
          return { message: 'Industry group updated successfully', group };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:update',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const industryId = payload?.industry_id;
          const updateData = { ...(payload || {}), updated_by: actor.user_id, updated_at: new Date() };
          const industry = await getIndustryService().updateIndustry(industryId, updateData, session);
          if (!industry) throw new Error('Industry not found');
          await session.commitTransaction();
          return { message: 'Industry updated successfully', industry };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:deleteGroup',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const groupId = payload?.group_id || payload;
          const group = await getIndustryService().deleteIndustryGroup(groupId, actor.user_id, session);
          if (!group) throw new Error('Industry group not found');
          await session.commitTransaction();
          return { message: 'Industry group deleted successfully' };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:delete',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const actor = getActor(socket);
          const industryId = payload?.industry_id || payload;
          const industry = await getIndustryService().deleteIndustry(industryId, actor.user_id, session);
          if (!industry) throw new Error('Industry not found');
          await session.commitTransaction();
          return { message: 'Industry deleted successfully' };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:restoreGroup',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const groupId = payload?.group_id || payload;
          const group = await getIndustryService().restoreIndustryGroup(groupId, session);
          if (!group) throw new Error('Industry group not found or already active');
          await session.commitTransaction();
          return { message: 'Industry group restored successfully', group };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
    {
      event: 'industry:restore',
      execute: async ({ payload }) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const industryId = payload?.industry_id || payload;
          const industry = await getIndustryService().restoreIndustry(industryId, session);
          if (!industry) throw new Error('Industry not found or already active');
          await session.commitTransaction();
          return { message: 'Industry restored successfully', industry };
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      },
    },
  ]);
};

module.exports = { registerIndustryHandlers };
