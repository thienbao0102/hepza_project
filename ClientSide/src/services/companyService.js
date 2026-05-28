import {
    GET_ALL_COMPANIES_ROUTE,
    GET_MANAGED_COMPANIES_ROUTE,
    DELETE_COMPANY_ROUTE,
    ADD_COMPANY_ROUTE,
    ADD_LIST_COMPANY_ROUTE,
    RESTORE_COMPANY_ROUTE,
    GET_COMPANY_ROUTE,
    COMPANY_ROUTES,
    UPDATE_COMPANY_ROUTE,
    DELETE_COMPANIES_ROUTE,
    RESTORE_COMPANIES_ROUTE,
    GET_DELETED_COMPANIES_ROUTE,
    HARD_DELETE_COMPANIES_ROUTE,
    HARD_DELETE_COMPANY_ROUTE,
    PREVIEW_HARD_DELETE_ROUTE,
    PREVIEW_SOFT_DELETE_ROUTE,
    PREVIEW_IMPORT_COMPANY_ROUTE,
    ADD_LICENSE_ROUTE,
    UPDATE_LICENSE_ROUTE,
    DELETE_LICENSE_ROUTE,
    GET_LICENSE_ROUTE,
    DELETE_MULTIPLE_LICENSES_ROUTE
} from '@constants/constants';

import { apiClient } from '@lib/api-client';

const SET_COMPANY_REPRESENTATIVE_ROUTE = (companyId) => `${COMPANY_ROUTES}/set-representative/${companyId}`;

// Handle fetching all companies with pagination, search, and filters
export const handlerGetAllCompany = async (params = {}, abortSignal = null) => {
    const { page = 1, limit = 10, search = '', filters = {}, sort = {} } = params;
    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
            filters: JSON.stringify(filters),
            sort: JSON.stringify(sort),
        };

        if (search) {
            queryParams.search = search;
        }

        const response = await apiClient.get(GET_ALL_COMPANIES_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        const { companies = [], totalItems = 0, totalPages = 0 } = response.data || {};

        return {
            companies,
            totalItems,
            totalPages,
            currentPage: Number(page),
        };
    } catch (error) {
        // Axios-specific cancellation check
        if (error.name === 'CanceledError') {
            // Request was canceled intentionally, re-throw so react-query can handle it silently.
            throw error;
        }
        // For all other errors, log them
        console.error('Service error:', error);
        throw new Error(error.response?.data?.error || 'Failed to fetch companies');
    }
};

// Handle fetching managed companies (for Manager role only)
export const handlerGetManagedCompany = async (params = {}, abortSignal = null) => {
    const { page = 1, limit = 10, search = '', filters = {}, sort = {} } = params;
    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
            filters: JSON.stringify(filters),
            sort: JSON.stringify(sort),
        };

        if (search) {
            queryParams.search = search;
        }

        const response = await apiClient.get(GET_MANAGED_COMPANIES_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        const { companies = [], totalItems = 0, totalPages = 0 } = response.data || {};

        return {
            companies,
            totalItems,
            totalPages,
            currentPage: Number(page),
        };
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.error('Service error:', error);
        throw new Error(error.response?.data?.error || 'Failed to fetch managed companies');
    }
};

// Handle add single company
export const handleAddCompany = async (companyData) => {
    try {
        const response = await apiClient.post(ADD_COMPANY_ROUTE, companyData);
        const result = response.data;

        return {
            success: true,
            message: result.message,
            company_id: result.data.company_id,
            company_name: result.data.company_name,
            user_created: result.data.user_created,
            user: result.data.user || null, // có thể null
        };
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || 'Thêm công ty thất bại';
        console.error('Error adding company:', errorMsg);
        throw new Error(errorMsg);
    }
};

// Handle import file to add new company list
export const handlerImportFileAddCompany = async (data) => {
    try {
        const response = await apiClient.post(ADD_LIST_COMPANY_ROUTE, data);
        const result = response.data;

        const successCount = result.results.filter(r => r.status === 'success').length;
        const failedCount = result.results.filter(r => r.status === 'failed').length;
        const userCreatedCount = result.results.filter(r => r.user_created).length;

        return {
            success: true,
            message: result.message,
            summary: {
                total: result.results.length,
                success: successCount,
                failed: failedCount,
                users_created: userCreatedCount,
            },
            details: result.results // danh sách chi tiết từng công ty
        };
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || 'Import danh sách thất bại';
        console.error('Error importing companies:', errorMsg);
        throw new Error(errorMsg);
    }
};

// Handle delete single company
export const handlerDeleteCompany = async (companyId) => {
    try {
        const response = await apiClient.delete(DELETE_COMPANY_ROUTE(companyId));
        return response.data; // Trả về: { message: 'Company deleted successfully' }
    } catch (error) {
        console.error('Error deleting company:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle delete multiple companies
export const handlerDeleteCompanies = async (companyIds) => {
    try {
        const response = await apiClient.delete(DELETE_COMPANIES_ROUTE, { data: { company_ids: companyIds } });
        return response.data; // Trả về: { message: 'X companies and their linked users deleted successfully' }
    } catch (error) {
        console.error('Error deleting companies:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle restore company
export const handlerRestoreCompany = async (companyId) => {
    try {
        const response = await apiClient.put(RESTORE_COMPANY_ROUTE(companyId));
        return response.data; // Trả về: { message: 'Company and linked users restored successfully', company: {...} }
    } catch (error) {
        console.error('Error restoring company:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle get company details by ID
export const handlerGetCompanyById = async (companyId, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_COMPANY_ROUTE(companyId), {
            signal: abortSignal
        });
        return response.data; // Trả về: { message: 'Company retrieved successfully', company: {...} }
    } catch (error) {
        if (error.name === 'CanceledError') {
            console.log('Company detail request was cancelled');
            throw error;
        }
        console.error('Error fetching company:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle update company
export const handlerUpdateCompany = async (companyId, companyData) => {
    try {
        const { company_id, ...updateData } = companyData;
        const response = await apiClient.put(UPDATE_COMPANY_ROUTE(companyId), updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating company:', error.response?.data?.error || error.message);
        // Throw the original error (which is an ApiError from apiClient) to keep the status code,
        // or wrap it so the UI can use error.status.
        throw error;
    }
};

// Handle restore multiple companies
export const handlerRestoreCompanies = async (companyIds) => {
    try {
        if (!Array.isArray(companyIds) || companyIds.length === 0) {
            throw new Error('company_ids must be a non-empty array');
        }
        const response = await apiClient.put(RESTORE_COMPANIES_ROUTE, { company_ids: companyIds });
        return response.data; // Trả về: { message: 'X companies and linked users restored successfully', restoredCompanies: [...] }
    } catch (error) {
        console.error('Error restoring companies:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle get deleted companies with pagination, search, and filters
export const handlerGetDeletedCompanies = async (params = {}, abortSignal = null) => {
    const { page = 1, limit = 10, search = '', filters = {}, sort = {} } = params;
    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
            filters: JSON.stringify(filters),
            sort: JSON.stringify(sort),
        };

        if (search) {
            queryParams.search = search;
        }

        const response = await apiClient.get(GET_DELETED_COMPANIES_ROUTE, {
            params: queryParams,
            signal: abortSignal
        });

        const { deletedCompanies = [], totalItems = 0, totalPages = 0, currentPage = 1 } = response.data || {};

        return {
            deletedCompanies,
            totalItems,
            totalPages,
            currentPage,
        };
    } catch (error) {
        if (error.name === 'CanceledError') {
            // This is an intentional cancellation, no need to log.
            throw error;
        }
        console.error('Service error:', error);
        throw new Error(error.response?.data?.error || 'Failed to fetch deleted companies');
    }
};

// Handle preview soft delete impact
export const handlerPreviewSoftDelete = async (companyIds = []) => {
    if (companyIds.length === 0) throw new Error('Chọn ít nhất 1 công ty để xem trước');

    const response = await apiClient.get(PREVIEW_SOFT_DELETE_ROUTE, {
        params: { company_ids: companyIds.join(',') }
    });
    return response.data;
};

// Handle preview hard delete impact
export const handlerPreviewHardDelete = async (companyIds = []) => {
    if (companyIds.length === 0) throw new Error('Chọn ít nhất 1 công ty để xem trước');

    const response = await apiClient.get(PREVIEW_HARD_DELETE_ROUTE, {
        params: { company_ids: companyIds.join(',') }
    });
    return response.data;
};

// Handle hard delete single company
export const handlerHardDeleteCompany = async (companyId) => {
    try {
        const response = await apiClient.delete(HARD_DELETE_COMPANY_ROUTE(companyId));
        return response.data; // { message: 'Company hard deleted successfully' }
    }
    catch (error) {
        console.error('Error hard deleting company:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle hard delete multiple companies
export const handlerHardDeleteCompanies = async (companyIds) => {
    try {
        const response = await apiClient.delete(HARD_DELETE_COMPANIES_ROUTE, { data: { company_ids: companyIds } });
        return response.data; // { message: 'Companies hard deleted successfully' }
    }
    catch (error) {
        console.error('Error hard deleting companies:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle preview import companies from file
export const handlerPreviewImportCompanies = async (excelData, createAccounts = true) => {
    if (!Array.isArray(excelData) || excelData.length === 0) {
        throw new Error('Dữ liệu Excel trống hoặc không hợp lệ');
    }

    try {
        const payload = {
            createAccounts: Boolean(createAccounts), // luôn là true/false
            data: excelData
        };

        const response = await apiClient.post(PREVIEW_IMPORT_COMPANY_ROUTE, payload);
        const result = response.data;

        return {
            success: true,
            message: result.message || 'Kiểm tra hoàn tất',
            total: result.total || result.results?.length || 0,
            summary: result.summary || {
                valid_with_user: 0,
                valid_without_user: 0,
                invalid: 0,
                error: 0
            },
            results: result.results || []
        };
    } catch (error) {
        const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Kiểm tra dữ liệu thất bại';

        console.error('Preview import error:', error);
        throw new Error(errorMsg);
    }
};

// Handle add license to company
const buildLicenseFormData = (licenseData = {}) => {
    const formData = new FormData();
    const { file, ...payload } = licenseData;
    formData.append('data', JSON.stringify({
        ...payload,
        keep_existing_file: Boolean(payload.keep_existing_file),
    }));
    if (file instanceof File) {
        formData.append('attachment', file);
    }
    return formData;
};

export const handlerAddLicenseToCompany = async (companyId, licenseData) => {
    try {
        const response = await apiClient.post(ADD_LICENSE_ROUTE(companyId), buildLicenseFormData(licenseData));
        return response.data;
    } catch (error) {
        console.error('Error adding license:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle update license in company
export const handlerUpdateLicenseInCompany = async (companyId, licenseId, updateData) => {
    try {
        const response = await apiClient.put(UPDATE_LICENSE_ROUTE(companyId), buildLicenseFormData(updateData), {
            params: { license_id: licenseId }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating license:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};
// Handle delete license from company
export const handlerDeleteLicenseFromCompany = async (companyId, licenseId) => {
    try {
        const response = await apiClient.delete(DELETE_LICENSE_ROUTE(companyId), {
            params: { license_id: licenseId }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error deleting license:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle get license by ID from company
export const handlerGetLicenseById = async (companyId, licenseId, abortSignal = null) => {
    try {
        const response = await apiClient.get(GET_LICENSE_ROUTE(companyId, licenseId), {
            params: { license_id: licenseId },
            signal: abortSignal
        });
        return response.data;
    } catch (error) {
        if (error.name === 'CanceledError') {
            console.log('Get license request was cancelled');
            throw error;
        }
        console.error('Error fetching license:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle delete multiple licenses from company
export const handlerDeleteMultipleLicensesFromCompany = async (companyId, licenseIds) => {
    try {
        const response = await apiClient.delete(DELETE_MULTIPLE_LICENSES_ROUTE(companyId), {
            data: { license_ids: licenseIds }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting multiple licenses:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerSetCompanyRepresentative = async (companyId, representativeUserId, currentPassword) => {
    try {
        const response = await apiClient.put(SET_COMPANY_REPRESENTATIVE_ROUTE(companyId), {
            representative_user_id: representativeUserId,
            current_password: currentPassword,
        });
        return response.data;
    } catch (error) {
        console.error('Error changing company representative:', error.response?.data?.error || error.message);
        throw error;
    }
};
