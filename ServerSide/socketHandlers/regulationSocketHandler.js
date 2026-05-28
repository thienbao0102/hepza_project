const { registerDomainHandlers } = require('./registerDomainHandlers');

const getRegulationService = () => require('../services/regulationService');

const registerRegulationHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'regulation:getAll',
      execute: async () => {
        const regulationData = await getRegulationService().getRegulations();
        return { message: 'Regulation data retrieved successfully', regulationData };
      },
    },
    {
      event: 'regulation:getById',
      execute: async ({ payload }) => {
        const regulationId = payload?.regulationId || payload?.regulation_id || payload;
        const regulation = await getRegulationService().getRegulationDetail(regulationId);
        return { regulation };
      },
    },
    {
      event: 'regulation:create',
      execute: async ({ payload }) => {
        const regulation = await getRegulationService().createRegulation(payload || {});
        return { message: 'Tạo quy định thành công', regulation };
      },
    },
    {
      event: 'regulation:update',
      execute: async ({ payload }) => {
        const regulationId = payload?.regulationId || payload?.regulation_id;
        const regulation = await getRegulationService().updateRegulation(regulationId, payload || {});
        return { message: 'Cập nhật quy định thành công', regulation };
      },
    },
    {
      event: 'regulation:deleteOne',
      execute: async ({ payload }) => {
        const regulationId = payload?.regulationId || payload?.regulation_id || payload;
        await getRegulationService().deleteRegulation(regulationId);
        return { message: 'Xóa quy định thành công' };
      },
    },
    {
      event: 'regulation:deleteMany',
      execute: async ({ payload }) => {
        const regulationIds = payload?.regulationIds || payload?.regulation_ids || payload || [];
        await getRegulationService().deleteMultipleRegulations(regulationIds);
        return { message: 'Đã xóa các quy định được chọn' };
      },
    },
  ]);
};

module.exports = { registerRegulationHandlers };

