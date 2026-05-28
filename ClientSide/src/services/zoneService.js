import {
    GET_ALL_ZONES_ROUTE,
    CREATE_ZONE_ROUTE,
    UPDATE_ZONE_ROUTE,
    DELETE_ZONE_ROUTE,
    RESTORE_ZONE_ROUTE,
    GET_ZONE_ROUTE,
    DELETE_ZONES_ROUTE,
    RESTORE_ZONES_ROUTE,
    HARD_DELETE_ZONE_ROUTE,
    HARD_DELETE_ZONES_ROUTE,
    PREVIEW_SOFT_DELETE_ZONE_ROUTE,
    PREVIEW_HARD_DELETE_ZONE_ROUTE
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

// Helper function to convert zoneData to JSON string and create FormData
const createFormData = (zoneData, imageFile) => {
    const formData = new FormData();
    formData.append('zoneData', JSON.stringify(zoneData)); // Gửi zoneData dưới dạng chuỗi JSON
    if (imageFile) {
        formData.append('image', imageFile); // Gửi file ảnh
    }
    return formData;
};

const normalizeZoneDeletePreview = (response, action) => {
    if (Array.isArray(response)) {
        return {
            action,
            totalZones: response.length,
            zones: response,
        };
    }

    return {
        action: response?.action || action,
        totalZones: response?.totalZones ?? response?.zones?.length ?? 0,
        zones: response?.zones || [],
        ...response,
    };
};

export const handlerGetAllZones = async (pageOrParams = 1, limitArg = 10, searchArg = '', filtersArg = {}, abortSignal = null) => {
    let page, limit, search, filters;

    // Handle different parameter patterns
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
        // If first param is an object, extract all values from it
        const { page: p = 1, limit: l = 10, search: s = '', filters: f = {} } = pageOrParams;
        page = Number(p) || 1;
        limit = Number(l) || 10;
        search = s || '';
        filters = f || {};
    } else {
        // Traditional parameter order
        page = Number(pageOrParams) || 1;
        limit = Number(limitArg) || 10;
        search = searchArg || '';
        filters = filtersArg || {};
    }

    try {
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
            filters: JSON.stringify(filters),
        };

        if (search) {
            queryParams.search = search;
        }

        const data = await requestViaTransport({
            method: 'get',
            url: GET_ALL_ZONES_ROUTE,
            event: 'zone:getAll',
            payload: queryParams,
            config: { ...(abortSignal && { signal: abortSignal }) }
        });

        const { zones = [], totalItems = data?.total ?? 0 } = data || {};
        const totalPages = Math.ceil(totalItems / limit);

        return {
            zones,
            totalItems,
            totalPages,
            currentPage: Number(page),
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Zone request was cancelled');
            throw error;
        }
        console.error('Error fetching industrial zones:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle create industrial zone
export const handlerCreateZone = async (zoneData, imageFile) => {
    try {
        const formData = createFormData(zoneData, imageFile);
        return await requestViaTransport({
            method: 'post',
            url: CREATE_ZONE_ROUTE,
            event: 'zone:create',
            payload: formData,
            config: {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            },
        });
    } catch (error) {
        console.error('Error creating zone:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle get industrial zone by id
export const handlerGetZoneById = async (zoneId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_ZONE_ROUTE(zoneId),
            event: 'zone:getById',
            payload: { zone_id: zoneId },
            config: { signal: abortSignal }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Zone detail request was cancelled');
            throw error;
        }
        console.error('Error fetching zone by id:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle update industrial zone
export const handlerUpdateZone = async (zoneId, zoneData, imageFile) => {
    try {
        const formData = createFormData(zoneData, imageFile);
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_ZONE_ROUTE(zoneId),
            event: 'zone:update',
            payload: formData,
            config: {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            },
        });
    } catch (error) {
        console.error('Error updating zone:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle delete industrial zone
export const handlerDeleteZone = async (zoneId) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_ZONE_ROUTE(zoneId),
            event: 'zone:deleteOne',
            payload: { zone_id: zoneId }
        });
    } catch (error) {
        console.error('Error deleting zone:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle restore industrial zone
export const handlerRestoreZone = async (zoneId) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: RESTORE_ZONE_ROUTE(zoneId),
            event: 'zone:restoreOne',
            payload: { zone_id: zoneId }
        });
    } catch (error) {
        console.error('Error restoring zone:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle delete multiple industrial zones
export const handlerDeleteZones = async (zoneIds) => {
    try {
        // DELETE request with body
        return await requestViaTransport({
            method: 'post',
            url: DELETE_ZONES_ROUTE,
            event: 'zone:deleteMany',
            payload: { zoneIds }
        });
    } catch (error) {
        console.error('Error deleting multiple zones:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle restore multiple industrial zones
export const handlerRestoreZones = async (zoneIds) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: RESTORE_ZONES_ROUTE,
            event: 'zone:restoreMany',
            payload: { zoneIds }
        });
    } catch (error) {
        console.error('Error restoring multiple zones:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle hard delete industrial zone
export const handlerHardDeleteZone = async (zoneId) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: HARD_DELETE_ZONE_ROUTE(zoneId),
            event: 'zone:hardDeleteOne',
            payload: { zone_id: zoneId }
        });
    } catch (error) {
        console.error('Error hard deleting zone:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle hard delete multiple industrial zones
export const handlerHardDeleteZones = async (zoneIds) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: HARD_DELETE_ZONES_ROUTE,
            event: 'zone:hardDeleteMany',
            payload: { zoneIds }
        });
    } catch (error) {
        console.error('Error hard deleting multiple zones:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Preview soft delete zones
export const handlerPreviewSoftDeleteZone = async (zoneIds) => {
    try {
        const queryParams = Array.isArray(zoneIds) ? zoneIds.join(',') : zoneIds;
        const response = await requestViaTransport({
            method: 'get',
            url: PREVIEW_SOFT_DELETE_ZONE_ROUTE,
            event: 'zone:previewSoftDelete',
            payload: { zone_ids: queryParams }
        });
        return normalizeZoneDeletePreview(response, 'soft-delete');
    } catch (error) {
        console.error('Error fetching soft delete preview:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Preview hard delete zones
export const handlerPreviewHardDeleteZone = async (zoneIds) => {
    try {
        const queryParams = Array.isArray(zoneIds) ? zoneIds.join(',') : zoneIds;
        const response = await requestViaTransport({
            method: 'get',
            url: PREVIEW_HARD_DELETE_ZONE_ROUTE,
            event: 'zone:previewHardDelete',
            payload: { zone_ids: queryParams }
        });
        return normalizeZoneDeletePreview(response, 'hard-delete');
    } catch (error) {
        console.error('Error fetching hard delete preview:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};
