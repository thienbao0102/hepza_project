import {
    ADD_RESOURCE_WASTE_DATA_ROUTE, GET_DATA_RESOURCE_WASTE_ROUTE,
    UPDATE_RESOURCE_WASTE_DATA_ROUTE, GET_ALL_DATA_WITH_HISTOTY_ROUTE,
    IMPORT_RESOURCE_DATA_ROUTE
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';
import { apiClient } from '@lib/api-client';

// Add a new list resource and waste by month
export const addReourceWasteData = async (dataInsert) => {
    try {
        console.log('Dữ liệu gửi đi: ', dataInsert)
        return await requestViaTransport({
            method: 'post',
            url: ADD_RESOURCE_WASTE_DATA_ROUTE,
            event: 'resourceWaste:create',
            payload: dataInsert,
            useSocket: false, // Force HTTP — response cần createdFuelIds/createdWasteIds để chain upload files
        });
    } catch (error) {
        throw error;
    }
};
// Update a list resource and waste by month
export const updateReourceWasteData = async (dataUpdate) => {
    try {
        console.log('Dữ liệu gửi đi: ', dataUpdate)
        return await requestViaTransport({
            method: 'post',
            url: UPDATE_RESOURCE_WASTE_DATA_ROUTE,
            event: 'resourceWaste:update',
            payload: dataUpdate,
            useSocket: false, // Force HTTP — response cần createdFuelIds/createdWasteIds để chain upload files
        });
    } catch (error) {
        throw error;
    }
};

export const handlerGetSummaryDetail = async (params = {}, abortSignal = null) => {
    const { periodKeyStart, periodKeyEnd, include = [1], company_id = undefined, zone_id = undefined } = params;

    try {
        const queryParams = {
            periodKeyStart,
            periodKeyEnd,
            include,
            company_id,
            zone_id
        };

        console.log(queryParams);

        return await requestViaTransport({
            method: 'get',
            url: GET_DATA_RESOURCE_WASTE_ROUTE,
            event: 'resourceWaste:getData',
            payload: queryParams,
            config: { signal: abortSignal }
        });
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
//get all data resource or waste with history
//param: company_id, zone_id, periodKey
export const handlerGetAllDataWithHistory = async (params = {}, abortSignal = null) => {
    const { company_id = undefined, zone_id = undefined, periodKey, periodKeys } = params;

    try {
        const queryParams = {
            company_id,
            zone_id,
            periodKey,
            periodKeys
        };

        return await requestViaTransport({
            method: 'get',
            url: GET_ALL_DATA_WITH_HISTOTY_ROUTE,
            event: 'resourceWaste:getAllWithHistory',
            payload: queryParams,
            config: { signal: abortSignal }
        });
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

// Import resources from Excel
// param: periodKey, data (grouped by mainGroup), options
export const importResourceData = async (importPayload) => {
    try {
        console.log('Import Resources Payload: ', importPayload);
        return await requestViaTransport({
            method: 'post',
            url: IMPORT_RESOURCE_DATA_ROUTE,
            event: 'resourceWaste:import',
            payload: importPayload,
            // useSocket: false, // Force HTTP — import có thể chain upload files
        });
    } catch (error) {
        console.error('Import Resources Error:', error);
        throw error;
    }
};

// Upload bill image — HTTP-only (file uploads bypass Socket.IO)
export const uploadBillImage = async (resourceId, file) => {
    const formData = new FormData();
    formData.append('billImage', file);
    const response = await apiClient.post(
        `/api/resource-waste/fuel-resources/${resourceId}/upload-bill`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
};

// Upload multiple attachments for waste resources — HTTP-only
export const uploadWasteAttachments = async (resourceId, files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('attachments', files[i]);
    }
    const response = await apiClient.post(
        `/api/resource-waste/waste-resources/${resourceId}/upload-attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
};