const summaryRecordRepository = require('../dataAccess/summaryRecordRepository');
const companyRepository = require('../dataAccess/companyRepository');

/**
 * Lấy danh sách doanh nghiệp ĐÃ khai báo tài nguyên/chất thải trong kỳ.
 *
 * Luồng:
 *   1. Lấy danh sách company_id đã khai báo từ summaryRecordRepository
 *   2. Truyền danh sách đó vào companyRepository.getEnterpriseListPage (companyIds = $in)
 *
 * @param {Object}  params
 * @param {number}  [params.periodKey]   - Kỳ báo cáo (YYYYMM), null = tất cả các kỳ
 * @param {string}  [params.lastId]      - Cursor phân trang
 * @param {number}  [params.limit=20]    - Số lượng mỗi trang
 * @param {string}  [params.search]      - Tìm kiếm theo tên doanh nghiệp
 * @param {Object}  [params.filters]     - Bộ lọc bổ sung
 * @param {string}  [params.zone_id]     - Scope zone cho manager
 */
const getEnterprisesWithDeclaration = async ({
    periodKey,
    lastId,
    limit = 20,
    search,
    filters = {},
    zone_id,
    resourceCategory,
} = {}) => {
    // Bước 1: Lấy danh sách company_id đã khai báo trong kỳ từ SummaryRecord
    const declaredIds = periodKey
        ? await summaryRecordRepository.getDistinctCompanyIdsByPeriod(Number(periodKey), resourceCategory)
        : null; // null = không lọc theo kỳ → lấy tất cả company đã từng khai báo

    // Nếu có periodKey nhưng không có ai khai báo → trả về danh sách rỗng
    if (periodKey && declaredIds && declaredIds.length === 0) {
        return { enterprises: [], hasMore: false, lastId: null };
    }

    // Bước 2: Gọi repository dùng chung để truy vấn + lookup zone_name + phân trang
    return companyRepository.getEnterpriseListPage({
        companyIds: declaredIds,   // $in: chỉ lấy các company đã khai báo
        zone_id,
        search,
        filters,
        lastId,
        limit,
    });
};

/**
 * Lấy danh sách doanh nghiệp CHƯA khai báo trong tháng đã chọn.
 *
 * Luồng:
 *   1. Lấy danh sách company_id đã khai báo từ summaryRecordRepository
 *   2. Truyền danh sách đó vào companyRepository.getEnterpriseListPage (excludeIds = $nin)
 *
 * @param {Object}  params
 * @param {number}  params.periodKey    - Kỳ báo cáo (YYYYMM), BẮT BUỘC
 * @param {string}  [params.lastId]     - Cursor phân trang
 * @param {number}  [params.limit=20]
 * @param {string}  [params.search]
 * @param {Object}  [params.filters]
 * @param {string}  [params.zone_id]    - Scope zone cho manager
 */
const getUndeclaredEnterprises = async ({
    periodKey,
    lastId,
    limit = 20,
    search,
    filters = {},
    zone_id,
    resourceCategory,
} = {}) => {
    if (!periodKey) throw new Error('periodKey is required');

    // Bước 1: Lấy danh sách company_id đã khai báo trong kỳ
    const declaredIds = await summaryRecordRepository.getDistinctCompanyIdsByPeriod(Number(periodKey), resourceCategory);

    // Bước 2: Gọi repository dùng chung, loại trừ các company đã khai báo
    return companyRepository.getEnterpriseListPage({
        excludeIds: declaredIds,   // $nin: loại trừ các company đã khai báo
        zone_id,
        search,
        filters,
        lastId,
        limit,
    });
};

const getYearlyDeclarationMatrix = async ({
    year,
    lastId,
    limit = 20,
    search,
    filters = {},
    zone_id,
} = {}) => {
    if (!year) throw new Error('year is required');

    return companyRepository.getEnterpriseYearlyMatrixPage({
        year,
        zone_id,
        search,
        filters,
        lastId,
        limit,
    });
};

module.exports = { getEnterprisesWithDeclaration, getUndeclaredEnterprises, getYearlyDeclarationMatrix };
