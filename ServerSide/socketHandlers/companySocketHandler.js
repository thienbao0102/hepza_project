const { registerDomainHandlers } = require('./registerDomainHandlers');

const getActor = (socket) => socket.userDetails || socket.user || {};
const getCompanyService = () => require('../services/companyService');

const safeParse = (val, fallback = {}) => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const registerCompanyHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'company:getAll',
      execute: async ({ payload }) => {
        const { page = 1, limit = 10, filters, search = '', sort } = payload || {};
        return getCompanyService().getAllCompanies(page, limit, safeParse(filters), search, getActor(socket), safeParse(sort));
      },
    },
    {
      event: 'company:getById',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const company = await getCompanyService().getCompanyById(payload?.company_id, actor.role, actor.zone_id, actor.company_id);
        return { message: 'Company retrieved successfully', company };
      },
    },
    {
      event: 'company:create',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        return getCompanyService().addCompany(payload?.companyData || payload, payload?.zone_id, actor.user_id);
      },
    },
    {
      event: 'company:createBatch',
      execute: async () => {
        throw new Error('Not implemented yet: company:createBatch');
      },
    },
    {
      event: 'company:update',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        return getCompanyService().updateCompany(payload?.company_id, payload?.updateData || payload, actor.role, actor);
      },
    },
    {
      event: 'company:deleteOne',
      execute: async ({ payload }) => getCompanyService().deleteCompanyById(payload?.company_id, getActor(socket)),
    },
    {
      event: 'company:deleteMany',
      execute: async ({ payload }) => getCompanyService().deleteCompaniesByIds(payload?.company_ids || [], getActor(socket)),
    },
    {
      event: 'company:restoreOne',
      execute: async ({ payload }) => getCompanyService().restoreCompany(payload?.company_id, getActor(socket)),
    },
    {
      event: 'company:restoreMany',
      execute: async ({ payload }) => getCompanyService().restoreCompanies(payload?.company_ids || [], getActor(socket)),
    },
    {
      event: 'company:getDeleted',
      execute: async ({ payload }) => {
        const { page = 1, limit = 10, filters, search = '', sort } = payload || {};
        return getCompanyService().getDeletedCompanies(page, limit, safeParse(filters), search, safeParse(sort));
      },
    },
    {
      event: 'company:hardDeleteOne',
      execute: async ({ payload }) => getCompanyService().hardDeleteCompany(payload?.company_id, getActor(socket)),
    },
    {
      event: 'company:hardDeleteMany',
      execute: async ({ payload }) => getCompanyService().hardDeleteCompanies(payload?.company_ids || [], getActor(socket)),
    },
    {
      event: 'company:previewSoftDelete',
      execute: async ({ payload }) => getCompanyService().previewSoftDeleteCompanies(payload?.company_ids || []),
    },
    {
      event: 'company:previewHardDelete',
      execute: async ({ payload }) => getCompanyService().previewHardDeleteCompanies(payload?.company_ids || []),
    },
    {
      event: 'company:previewImport',
      execute: async () => {
        throw new Error('Not implemented yet: company:previewImport');
      },
    },
    {
      event: 'company:license:add',
      execute: async ({ payload }) => getCompanyService().addLicense(payload?.company_id, payload?.licenseData || payload, getActor(socket).user_id),
    },
    {
      event: 'company:license:update',
      execute: async ({ payload }) => getCompanyService().updateLicense(payload?.company_id, payload?.license_id, payload?.updateData || payload, getActor(socket).user_id),
    },
    {
      event: 'company:license:deleteOne',
      execute: async ({ payload }) => getCompanyService().deleteLicense(payload?.company_id, payload?.license_id, getActor(socket).user_id),
    },
    {
      event: 'company:license:get',
      execute: async ({ payload }) => getCompanyService().getLicense(payload?.company_id, payload?.license_id),
    },
    {
      event: 'company:license:deleteMany',
      execute: async ({ payload }) => getCompanyService().deleteMultipleLicenses(payload?.company_id, payload?.license_ids || [], getActor(socket).user_id),
    },
  ]);
};

module.exports = { registerCompanyHandlers };
