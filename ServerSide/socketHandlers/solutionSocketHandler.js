const mongoose = require('mongoose');
const { registerDomainHandlers } = require('./registerDomainHandlers');

const getSolutionService = () => require('../services/solutionService');
const getHashtagRepository = () => require('../dataAccess/hashtagRepository');

const registerSolutionHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'solution:getAll',
      execute: async ({ payload }) => {
        const { group_solution, search, tags, page = 1, limit = 0 } = payload || {};

        const filters = {};
        if (group_solution) filters.group_solution = group_solution;

        if (search) {
          const searchRegex = new RegExp(search, 'i');
          filters.$or = [{ solution_name: searchRegex }, { des_short: searchRegex }];
        }

        if (tags) {
          const tagList = Array.isArray(tags) ? tags : [tags];
          const hashtags = await getHashtagRepository().findByNames(tagList);
          if (hashtags.length > 0) {
            filters.tags = { $in: hashtags.map((h) => h._id) };
          } else if (tagList.length > 0) {
            filters.tags = { $in: [new mongoose.Types.ObjectId()] };
          }
        }

        const result = await getSolutionService().getSolution(filters, page, limit);
        return {
          message: 'Solution data retrieved successfully',
          solutionData: result.solutions,
          pagination: result.pagination,
        };
      },
    },
    {
      event: 'solution:getById',
      execute: async ({ payload }) => {
        const solution = await getSolutionService().getSolutionDetail(payload?.solutionId || payload?.solution_id || payload);
        return { solution };
      },
    },
    {
      event: 'solution:create',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const result = await getSolutionService().createSolution(payload || {}, user?.user_id);
        return { message: 'Tạo giải pháp thành công', solution: result };
      },
    },
    {
      event: 'solution:update',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const solutionId = payload?.solutionId || payload?.solution_id;
        const solution = await getSolutionService().updateSolution(solutionId, payload || {}, user?.user_id);
        return { message: 'Cập nhật giải pháp thành công', solution };
      },
    },
    {
      event: 'solution:deleteOne',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const solutionId = payload?.solutionId || payload?.solution_id || payload;
        await getSolutionService().deleteSolution(solutionId, user?.user_id);
        return { message: 'Xóa giải pháp thành công' };
      },
    },
    {
      event: 'solution:deleteMany',
      execute: async ({ payload }) => {
        const user = socket.userDetails || socket.user || {};
        const solutionIds = payload?.solutionIds || payload?.solution_ids || payload || [];
        await getSolutionService().deleteMultipleSolutions(solutionIds, user?.user_id);
        return { message: 'Đã xóa các giải pháp được chọn' };
      },
    },
  ]);
};

module.exports = { registerSolutionHandlers };

