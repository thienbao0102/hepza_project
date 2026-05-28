const enterpriseListService = require('../services/enterpriseListService');

const getEnterprises = async (req, res) => {
    try {
        const user = req.userDetails;

        // Kiểm tra quyền: Chỉ admin và manager mới được truy cập dữ liệu này
        if (!['admin', 'manager'].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden', isSuccess: false });
        }

        // Lấy thông tin query params, bao gồm periodKey (kỳ báo cáo)
        const { lastId, limit, search, periodKey, resourceCategory } = req.query;

        // Thiết lập bộ lọc (filters) từ query params
        let filters = {};
        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (e) {
                console.error("Parse filters error", e);
            }
        } else {
            // Fallback backward compatibility
            if (req.query.zone_id) filters.zone_id = req.query.zone_id;
            if (req.query.status) filters.status = req.query.status;
            if (req.query.industry_group) filters.industry_group = req.query.industry_group;
            if (req.query.company_type) filters.company_type = req.query.company_type;
        }

        // Xử lý phân quyền xem theo khu vực (zone_id):
        // Nếu là manager (Ban quản lý/cán bộ), chỉ được xem doanh nghiệp trong khu vực họ quản lý
        let zone_id = null;
        if (user.role === 'manager') {
            zone_id = user.zone_id || null;
            if (!zone_id) {
                return res.status(400).json({
                    message: 'Manager phải có zone_id để xem danh sách doanh nghiệp',
                    isSuccess: false,
                });
            }
        }

        // Gọi service lấy danh sách ĐÃ khai báo, truyền thêm periodKey để lọc theo kỳ
        const result = await enterpriseListService.getEnterprisesWithDeclaration({
            periodKey: periodKey ? Number(periodKey) : null,
            lastId: lastId || null,
            limit: limit ? Number(limit) : 20,
            search: search || '',
            filters,
            zone_id,
            resourceCategory,
        });

        res.status(200).json({
            message: 'Get enterprise list successfully',
            isSuccess: true,
            ...result,
        });
    } catch (error) {
        console.error('getEnterprises error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

const getUndeclaredEnterprises = async (req, res) => {
    try {
        const user = req.userDetails;

        // Kiểm tra quyền: Chỉ admin và manager mới được truy cập dữ liệu này

        if (!['admin', 'manager'].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden', isSuccess: false });
        }

        const { lastId, limit, search, periodKey, resourceCategory } = req.query;

        // Bắt buộc phải truyền periodKey (Ví dụ: 202604) để xác định xem trong tháng đó ai chưa khai báo
        if (!periodKey) {
            return res.status(400).json({ message: 'yêu cầu cung cấp periodKey', isSuccess: false });
        }

        let filters = {};
        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (e) {
                console.error("Parse filters error", e);
            }
        } else {
            if (req.query.zone_id) filters.zone_id = req.query.zone_id;
            if (req.query.status) filters.status = req.query.status;
            if (req.query.industry_group) filters.industry_group = req.query.industry_group;
            if (req.query.company_type) filters.company_type = req.query.company_type;
        }

        let zone_id = null;
        if (user.role === 'manager') {
            zone_id = user.zone_id || null;
            if (!zone_id) {
                return res.status(400).json({
                    message: 'Manager phải có zone_id',
                    isSuccess: false,
                });
            }
        }

        // Gọi service lấy danh sách CHƯA khai báo dựa vào periodKey
        const result = await enterpriseListService.getUndeclaredEnterprises({
            periodKey: Number(periodKey),
            lastId: lastId || null,
            limit: limit ? Number(limit) : 20,
            search: search || '',
            filters,
            zone_id,
            resourceCategory,
        });

        res.status(200).json({
            message: 'Get undeclared enterprise list successfully',
            isSuccess: true,
            ...result,
        });
    } catch (error) {
        console.error('getUndeclaredEnterprises error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

const getYearlyMatrix = async (req, res) => {
    try {
        const user = req.userDetails;

        if (!['admin', 'manager'].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden', isSuccess: false });
        }

        const { lastId, limit, search, year } = req.query;

        if (!year) {
            return res.status(400).json({ message: 'yêu cầu cung cấp year', isSuccess: false });
        }

        let filters = {};
        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (e) {
                console.error("Parse filters error", e);
            }
        }

        let zone_id = null;
        if (user.role === 'manager') {
            zone_id = user.zone_id || null;
            if (!zone_id) {
                return res.status(400).json({
                    message: 'Manager phải có zone_id',
                    isSuccess: false,
                });
            }
        }

        const result = await enterpriseListService.getYearlyDeclarationMatrix({
            year: Number(year),
            lastId: lastId || null,
            limit: limit ? Number(limit) : 20,
            search: search || '',
            filters,
            zone_id,
        });

        res.status(200).json({
            message: 'Get yearly matrix successfully',
            isSuccess: true,
            ...result,
        });
    } catch (error) {
        console.error('getYearlyMatrix error:', error);
        res.status(400).json({ error: error.message, isSuccess: false });
    }
};

module.exports = { getEnterprises, getUndeclaredEnterprises, getYearlyMatrix };
