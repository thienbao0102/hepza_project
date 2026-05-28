import { GET_ENTERPRISE_LIST_ROUTE } from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

/**
 * Lấy danh sách doanh nghiệp ĐÃ khai báo tài nguyên/chất thải.
 * Cursor-based pagination.
 *
 * @param {Object}  params
 * @param {number}  [params.periodKey]  - Kỳ báo cáo (YYYYMM)
 * @param {string}  [params.lastId]     - ID cursor từ trang trước
 * @param {number}  [params.limit=20]
 * @param {string}  [params.search]
 * @param {Object}  [params.filters]
 * @param {AbortSignal} [abortSignal]
 */
export const getEnterpriseList = async (params = {}, abortSignal = null) => {
    // Trích xuất periodKey và các params khác để gửi lên Server
    const { lastId, limit = 20, search = '', filters = {}, periodKey, resourceCategory } = params;

    const queryPayload = {
        ...(lastId && { lastId }),
        limit,
        ...(search && { search }),
        ...(periodKey && { periodKey }),
        ...(resourceCategory && { resourceCategory }),
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) }),
    };

    const result = await requestViaTransport({
        method: 'GET',
        url: GET_ENTERPRISE_LIST_ROUTE, // Route chuẩn (ĐÃ khai báo)
        event: 'enterpriseList:getList', // Event socket chuẩn
        payload: queryPayload,
        config: abortSignal ? { signal: abortSignal } : undefined,
    });

    return result;
};

/**
 * Lấy danh sách doanh nghiệp CHƯA khai báo trong tháng đã chọn.
 *
 * @param {Object}  params
 * @param {number}  params.periodKey    - Kỳ báo cáo (YYYYMM), BẮT BUỘC
 * @param {string}  [params.lastId]
 * @param {number}  [params.limit=20]
 * @param {string}  [params.search]
 * @param {Object}  [params.filters]
 * @param {AbortSignal} [abortSignal]
 */
export const getUndeclaredEnterpriseList = async (params = {}, abortSignal = null) => {
    // Trích xuất thông input, bắt buộc phải có periodKey
    const { lastId, limit = 20, search = '', filters = {}, periodKey, resourceCategory } = params;

    if (!periodKey) throw new Error('periodKey is required');

    const queryPayload = {
        ...(lastId && { lastId }),
        limit,
        ...(search && { search }),
        periodKey,
        ...(resourceCategory && { resourceCategory }),
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) }),
    };

    const result = await requestViaTransport({
        method: 'GET',
        url: `${GET_ENTERPRISE_LIST_ROUTE}/undeclared`, // Thêm /undeclared vào sau URL chính
        event: 'enterpriseList:getUndeclared', // Sử dụng event socket mới
        payload: queryPayload,
        config: abortSignal ? { signal: abortSignal } : undefined,
    });

    return result;
};

/**
 * Lấy lịch sử matrix NĂM
 */
export const getYearlyDeclarationMatrix = async (params = {}, abortSignal = null) => {
    const { lastId, limit = 20, search = '', filters = {}, year } = params;

    if (!year) throw new Error('year is required');

    const queryPayload = {
        ...(lastId && { lastId }),
        limit,
        ...(search && { search }),
        year,
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) }),
    };

    const result = await requestViaTransport({
        method: 'GET',
        url: `${GET_ENTERPRISE_LIST_ROUTE}/yearly-matrix`,
        event: 'enterpriseList:getYearlyMatrix',
        payload: queryPayload,
        config: abortSignal ? { signal: abortSignal } : undefined,
    });

    return result;
};
