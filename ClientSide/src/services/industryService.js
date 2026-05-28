import {
    GET_ALL_INDUSTRY_GROUPS_ROUTE,
    GET_ALL_INDUSTRIES_ROUTE,
    GET_INDUSTRY_GROUP_BY_ID_ROUTE,
    GET_INDUSTRY_BY_ID_ROUTE,
    CREATE_INDUSTRY_GROUP_ROUTE,
    CREATE_INDUSTRY_ROUTE,
    UPDATE_INDUSTRY_GROUP_ROUTE,
    UPDATE_INDUSTRY_ROUTE,
    DELETE_INDUSTRY_GROUP_ROUTE,
    DELETE_INDUSTRY_ROUTE,
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

export const handlerGetAllIndustryGroups = async (pageOrParams = 1, limitArg = 10, searchArg = '', abortSignal = null) => {
    let page, limit, search;
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
        const { page: p = 1, limit: l = 10, search: s = '' } = pageOrParams;
        page = Number(p) || 1;
        limit = Number(l) || 10;
        search = s || '';
    } else {
        page = Number(pageOrParams) || 1;
        limit = Number(limitArg) || 10;
        search = searchArg || '';
    }

    try {
        const queryParams = { page, limit };
        if (search) queryParams.search = search;

        const data = await requestViaTransport({
            method: 'get',
            url: GET_ALL_INDUSTRY_GROUPS_ROUTE,
            event: 'industry:getGroups',
            payload: queryParams,
            config: {
                withCredentials: true,
                ...(abortSignal && { signal: abortSignal })
            }
        });

        const { groups = [], total = 0 } = data || {};
        return { groups, total };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Industry groups request was cancelled');
            throw error;
        }
        console.error('Error fetching industry groups:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerGetAllIndustries = async (pageOrParams = 1, limitArg = 10, searchArg = '', filtersArg = {}, abortSignal = null) => {
    let page, limit, search, filters;
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
        const { page: p = 1, limit: l = 10, search: s = '', filters: f = {} } = pageOrParams;
        page = Number(p) || 1;
        limit = Number(l) || 10;
        search = s || '';
        filters = f || {};
    } else {
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
        if (search) queryParams.search = search;

        console.log('DEBUG: Sending Request to Backend with queryParams =', queryParams);

        const data = await requestViaTransport({
            method: 'get',
            url: GET_ALL_INDUSTRIES_ROUTE,
            event: 'industry:getAll',
            payload: queryParams,
            config: {
                withCredentials: true,
                ...(abortSignal && { signal: abortSignal })
            }
        });

        const { industries = [], total = 0 } = data || {};
        return { industries, total };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Industries request was cancelled');
            throw error;
        }
        console.error('Error fetching industries:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerGetIndustriesByGroup = async (groupId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_ALL_INDUSTRIES_ROUTE,
            event: 'industry:getAll',
            payload: { filters: JSON.stringify({ group_id: groupId }) },
            config: {
                withCredentials: true,
                ...(abortSignal && { signal: abortSignal })
            }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Industries by group request was cancelled');
            throw error;
        }
        console.error('Error fetching industries by group:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerGetIndustryGroupById = async (groupId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_INDUSTRY_GROUP_BY_ID_ROUTE(groupId),
            event: 'industry:getGroupById',
            payload: { group_id: groupId },
            config: { withCredentials: true, signal: abortSignal }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Industry group request was cancelled');
            throw error;
        }
        console.error('Error fetching industry group by id:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerGetIndustryById = async (industryId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_INDUSTRY_BY_ID_ROUTE(industryId),
            event: 'industry:getById',
            payload: { industry_id: industryId },
            config: { withCredentials: true, signal: abortSignal }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Industry request was cancelled');
            throw error;
        }
        console.error('Error fetching industry by id:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerCreateIndustryGroup = async (groupData) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: CREATE_INDUSTRY_GROUP_ROUTE,
            event: 'industry:createGroup',
            payload: groupData
        });
    } catch (error) {
        console.error('Error creating industry group:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerCreateIndustry = async (industryData) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: CREATE_INDUSTRY_ROUTE,
            event: 'industry:create',
            payload: industryData
        });
    } catch (error) {
        console.error('Error creating industry:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerUpdateIndustryGroup = async (groupId, groupData) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_INDUSTRY_GROUP_ROUTE(groupId),
            event: 'industry:updateGroup',
            payload: { group_id: groupId, ...groupData }
        });
    } catch (error) {
        console.error('Error updating industry group:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerUpdateIndustry = async (industryId, industryData) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_INDUSTRY_ROUTE(industryId),
            event: 'industry:update',
            payload: { industry_id: industryId, ...industryData }
        });
    } catch (error) {
        console.error('Error updating industry:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerDeleteIndustryGroup = async (groupId) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_INDUSTRY_GROUP_ROUTE(groupId),
            event: 'industry:deleteGroup',
            payload: { group_id: groupId }
        });
    } catch (error) {
        console.error('Error deleting industry group:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

export const handlerDeleteIndustry = async (industryId) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_INDUSTRY_ROUTE(industryId),
            event: 'industry:delete',
            payload: { industry_id: industryId }
        });
    } catch (error) {
        console.error('Error deleting industry:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};
