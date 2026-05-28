import { requestViaTransport } from '@lib/transport-selector';
import {
    GET_REGULATION_DATA_ROUTE,
    ADD_REGULATION_ROUTE,
    UPDATE_REGULATION_ROUTE,
    DELETE_REGULATION_ROUTE,
    DELETE_REGULATIONS_ROUTE
} from '../constants/constants';

export const getRegulationData = async () => {
    try {
        const data = await requestViaTransport({
            method: 'get',
            url: GET_REGULATION_DATA_ROUTE,
            event: 'regulation:getAll'
        });
        return data?.regulationData || [];
    } catch (error) {
        throw error;
    }
};

export const createRegulation = async (data) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: ADD_REGULATION_ROUTE,
            event: 'regulation:create',
            payload: data
        });
    } catch (error) {
        throw error;
    }
};

export const updateRegulation = async (id, data) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_REGULATION_ROUTE(id),
            event: 'regulation:update',
            payload: { id, regulation_id: id, regulationId: id, ...data }
        });
    } catch (error) {
        throw error;
    }
};

export const deleteRegulation = async (id) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_REGULATION_ROUTE(id),
            event: 'regulation:deleteOne',
            payload: { id }
        });
    } catch (error) {
        throw error;
    }
};

export const deleteMultipleRegulations = async (ids) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_REGULATIONS_ROUTE,
            event: 'regulation:deleteMany',
            payload: { regulationIds: ids }
        });
    } catch (error) {
        throw error;
    }
};
