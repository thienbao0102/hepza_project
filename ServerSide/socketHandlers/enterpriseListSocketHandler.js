const { registerDomainHandlers } = require('./registerDomainHandlers');
const getEnterpriseListService = () => require('../services/enterpriseListService');

const registerEnterpriseListHandlers = (socket) => {
    registerDomainHandlers(socket, [
        {
            // Event: Lấy danh sách doanh nghiệp ĐÃ khai báo trong kỳ
            event: 'enterpriseList:getList',
            execute: async ({ payload }) => {
                const user = socket.userDetails || socket.user || {};

                if (!['admin', 'manager'].includes(user.role)) {
                    const err = new Error('Forbidden');
                    err.code = 'FORBIDDEN';
                    throw err;
                }

                const { lastId, limit, search, filters = {}, periodKey, resourceCategory } = payload || {};

                let parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;

                // Xử lý phân quyền xem theo khu vực (zone_id):
                let zone_id = null;
                if (user.role === 'manager') {
                    zone_id = user.zone_id || null;
                    if (!zone_id) {
                        const err = new Error('Manager phải có zone_id');
                        err.code = 'VALIDATION';
                        throw err;
                    }
                }

                // Gọi service trả về danh sách ĐÃ khai báo dựa trên periodKey truyền lên từ client
                const result = await getEnterpriseListService().getEnterprisesWithDeclaration({
                    periodKey: periodKey ? Number(periodKey) : null,
                    lastId: lastId || null,
                    limit: limit ? Number(limit) : 20,
                    search: search || '',
                    filters: parsedFilters,
                    zone_id,
                    resourceCategory,
                });

                return {
                    message: 'Enterprise list retrieved successfully',
                    isSuccess: true,
                    ...result,
                };
            },
        },
        {
            // Event mới: Lấy danh sách doanh nghiệp CHƯA khai báo trong kỳ
            event: 'enterpriseList:getUndeclared',
            execute: async ({ payload }) => {
                const user = socket.userDetails || socket.user || {};

                if (!['admin', 'manager'].includes(user.role)) {
                    const err = new Error('Forbidden');
                    err.code = 'FORBIDDEN';
                    throw err;
                }

                const { lastId, limit, search, filters = {}, periodKey, resourceCategory } = payload || {};

                let parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;

                // Bắt buộc phải có periodKey để so sánh doanh nghiệp nào chưa có dữ liệu trong tháng đó
                if (!periodKey) {
                    const err = new Error('periodKey is required');
                    err.code = 'VALIDATION';
                    throw err;
                }

                // Xử lý phân quyền xem theo khu vực (zone_id):
                let zone_id = null;
                if (user.role === 'manager') {
                    zone_id = user.zone_id || null;
                    if (!zone_id) {
                        const err = new Error('Manager phải có zone_id');
                        err.code = 'VALIDATION';
                        throw err;
                    }
                }

                // Gọi service trả về danh sách CHƯA khai báo
                const result = await getEnterpriseListService().getUndeclaredEnterprises({
                    periodKey: Number(periodKey),
                    lastId: lastId || null,
                    limit: limit ? Number(limit) : 20,
                    search: search || '',
                    filters: parsedFilters,
                    zone_id,
                    resourceCategory,
                });

                return {
                    message: 'Undeclared enterprise list retrieved successfully',
                    isSuccess: true,
                    ...result,
                };
            },
        },
        {
            // Event mới: Lấy danh sách doanh nghiệp CHƯA khai báo trong kỳ
            event: 'enterpriseList:getYearlyMatrix',
            execute: async ({ payload }) => {
                const user = socket.userDetails || socket.user || {};

                if (!['admin', 'manager'].includes(user.role)) {
                    const err = new Error('Forbidden');
                    err.code = 'FORBIDDEN';
                    throw err;
                }

                const { lastId, limit, search, filters = {}, year } = payload || {};

                let parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;

                if (!year) {
                    const err = new Error('year is required');
                    err.code = 'VALIDATION';
                    throw err;
                }

                let zone_id = null;
                if (user.role === 'manager') {
                    zone_id = user.zone_id || null;
                    if (!zone_id) {
                        const err = new Error('Manager phải có zone_id');
                        err.code = 'VALIDATION';
                        throw err;
                    }
                }

                const result = await getEnterpriseListService().getYearlyDeclarationMatrix({
                    year: Number(year),
                    lastId: lastId || null,
                    limit: limit ? Number(limit) : 20,
                    search: search || '',
                    filters: parsedFilters,
                    zone_id,
                });

                return {
                    message: 'Yearly matrix retrieved successfully',
                    isSuccess: true,
                    ...result,
                };
            },
        },
    ]);
};

module.exports = { registerEnterpriseListHandlers };
