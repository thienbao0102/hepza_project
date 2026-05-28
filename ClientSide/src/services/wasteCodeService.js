import { LOOKUP_WASTE_CODE_ROUTE, SEARCH_WASTE_CODE_ROUTE } from '@constants/constants';
import { apiClient } from '@lib/api-client';

/**
 * Tra cứu chính xác mã CTNH.
 * @param {string} code - Mã CTNH (VD: "13 02 01")
 * @returns {Promise<Object|null>} waste code object or null
 */
export const lookupWasteCode = async (code) => {
    try {
        const response = await apiClient.get(LOOKUP_WASTE_CODE_ROUTE, {
            params: { code: code.trim() },
        });
        return response.data?.data || null;
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
};

/**
 * Tìm kiếm mã CTNH theo từ khóa (code hoặc tên).
 * @param {string} query - Từ khóa tìm kiếm
 * @param {number} [limit=20] - Giới hạn kết quả
 * @returns {Promise<Array>} danh sách waste codes
 */
export const searchWasteCodes = async (query, limit = 20) => {
    try {
        const response = await apiClient.get(SEARCH_WASTE_CODE_ROUTE, {
            params: { q: query.trim(), limit },
        });
        return response.data?.data || [];
    } catch (error) {
        console.error('searchWasteCodes error:', error);
        return [];
    }
};
