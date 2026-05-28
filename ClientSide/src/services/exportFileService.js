import {
    EXPORT_FILE_RESOURCE_ROUTES,
    GET_EXPORT_DOWNLOAD_ROUTE,
    GET_EXPORT_HISTORY_ROUTE,
    GET_EXPORT_STATUS_ROUTE,
    INIT_EXPORT_ROUTE
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

const buildExportResourceWasteQuery = (params = {}) => {
    const { periodKeyStart, periodKeyEnd, company_ids = [], zone_id = undefined, include = [], fileType = 'xlsx', option = 1 } = params;
    const queryParams = new URLSearchParams();
    const appendIfPresent = (key, value) => {
        if (value !== undefined && value !== null && value !== '') queryParams.append(key, value);
    };

    appendIfPresent('periodKeyStart', periodKeyStart);
    appendIfPresent('periodKeyEnd', periodKeyEnd);
    appendIfPresent('company_ids', Array.isArray(company_ids) ? company_ids.join(',') : company_ids);
    appendIfPresent('zone_id', zone_id);
    for (const value of Array.isArray(include) ? include : [include]) {
        appendIfPresent('include', value);
    }
    appendIfPresent('fileType', fileType);
    appendIfPresent('option', option);
    appendIfPresent('export_id', params.export_id);
    return queryParams;
};

export const buildExportResourceWasteUrl = (params = {}) => {
    const query = buildExportResourceWasteQuery(params).toString();
    return query ? `${EXPORT_FILE_RESOURCE_ROUTES}?${query}` : EXPORT_FILE_RESOURCE_ROUTES;
};

export const buildCompletedExportDownloadUrl = (exportId) => GET_EXPORT_DOWNLOAD_ROUTE(exportId);

export const triggerNativeDownload = (url, fileName = '') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const startCompletedExportDownload = (exportId, fileName = '') => {
    const url = buildCompletedExportDownloadUrl(exportId);
    triggerNativeDownload(url, fileName);
    return { url };
};

export const startNativeResourceWasteDownload = (params = {}, fileName = '') => {
    const url = buildExportResourceWasteUrl(params);
    triggerNativeDownload(url, fileName);
    return { url };
};

// Handle exporting resource and waste data to file (single or multiple companies)
export const handlerExportFileResourceWaste = async (params = {}, abortSignal = null) => {
    try {
        const queryParams = Object.fromEntries(buildExportResourceWasteQuery(params));
        queryParams.include = Array.isArray(params.include) ? params.include : (params.include || []);
        const data = await requestViaTransport({
            method: 'get',
            url: EXPORT_FILE_RESOURCE_ROUTES,
            event: 'export:resourceWaste',
            payload: queryParams,
            config: {
                withCredentials: true,
                responseType: 'blob',
                signal: abortSignal
            }
        });
        console.log('Export Service Response:', data);
        return { data }; // Keep existing shape used by callers
    } catch (error) {
        // Axios-specific cancellation check
        if (error.name === 'CanceledError') {
            // Request was canceled intentionally, re-throw so react-query can handle it silently.
            throw error;
        }
        console.log('Service error:', error);
        throw error;
    }
};

// Initialize export (create history record)
export const initExport = async (params = {}) => {
    try {
        const result = await requestViaTransport({
            method: 'post',
            url: INIT_EXPORT_ROUTE,
            event: 'export:init',
            payload: params,
            config: { withCredentials: true }
        });
        return result?.export_id && result.success === undefined ? { ...result, success: true } : result;
    } catch (error) {
        console.log('Init export error:', error);
        throw error;
    }
};

// Get export status
export const getExportStatus = async (exportId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_EXPORT_STATUS_ROUTE(exportId),
            event: 'export:getStatus',
            payload: { export_id: exportId },
            config: {
                withCredentials: true,
                signal: abortSignal
            }
        });
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.log('Get export status error:', error);
        throw error;
    }
};

// Download completed export file
export const downloadExportFile = async (exportId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_EXPORT_DOWNLOAD_ROUTE(exportId),
            event: 'export:download',
            payload: { export_id: exportId },
            config: {
                withCredentials: true,
                responseType: 'blob',
                signal: abortSignal
            },
            preferHttp: true
        });
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.log('Download export file error:', error);
        throw error;
    }
};

// Get export history
export const getExportHistory = async (abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_EXPORT_HISTORY_ROUTE,
            event: 'export:getHistory',
            payload: {},
            config: {
                withCredentials: true,
                signal: abortSignal
            }
        });
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.log('Get export history error:', error);
        throw error;
    }
};

// Delete export history
export const deleteExportHistory = async (id) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: `${GET_EXPORT_HISTORY_ROUTE}/${id}`,
            event: 'export:deleteHistoryItem',
            payload: { id },
            config: { withCredentials: true }
        });
    } catch (error) {
        console.log('Delete export history error:', error);
        throw error;
    }
};

// Update export history status
export const updateExportHistoryStatus = async (exportId, status, totalRecords = 0) => {
    try {
        return await requestViaTransport({
            method: 'patch',
            url: `${GET_EXPORT_HISTORY_ROUTE}/${exportId}`,
            event: 'export:pinHistoryItem',
            payload: {
                exportId,
                status,
                total_records: totalRecords
            },
            config: {
                withCredentials: true
            }
        });
    } catch (error) {
        console.log('Update export history status error:', error);
        throw error;
    }
};