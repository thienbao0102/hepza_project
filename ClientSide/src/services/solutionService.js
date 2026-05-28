import {
    GET_SOLUTION_DATA_ROUTE,
    ADD_SOLUTION_ROUTE,
    GET_SOLUTION_ROUTE,
    UPDATE_SOLUTION_ROUTE,
    DELETE_SOLUTION_ROUTE,
    SOLUTION_ROUTES,
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

// Handle fetching summary record based on date range and role (periodKeyStart (vd: 202401), periodKeyEnd (vd:202402), role)
export const handlerGetSolutionData = async (filters = {}, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_SOLUTION_DATA_ROUTE,
            event: 'solution:getAll',
            payload: filters,
            config: { signal: abortSignal }
        });
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }
        console.log('Service error:', error);
        throw error;
    }
};

export const handlerCreateSolution = async (payload) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: ADD_SOLUTION_ROUTE,
            event: 'solution:create',
            payload
        });
    } catch (error) {
        throw error;
    }
};

export const handlerGetSolutionDetail = async (solutionId, abortSignal = null) => {
    try {
        const data = await requestViaTransport({
            method: 'get',
            url: GET_SOLUTION_ROUTE(solutionId),
            event: 'solution:getById',
            payload: { solutionId },
            config: { signal: abortSignal }
        });
        return data?.solution ?? null;
    } catch (error) {
        throw error;
    }
};

export const handlerUpdateSolution = async (solutionId, payload) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_SOLUTION_ROUTE(solutionId),
            event: 'solution:update',
            payload: { solutionId, ...payload }
        });
    } catch (error) {
        throw error;
    }
};

export const handlerDeleteSolution = async (solutionId) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_SOLUTION_ROUTE(solutionId),
            event: 'solution:deleteOne',
            payload: { solutionId }
        });
    } catch (error) {
        throw error;
    }
};

export const handlerDeleteSolutions = async (solutionIds = []) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: `${SOLUTION_ROUTES}/delete-solutions`,
            event: 'solution:deleteMany',
            payload: {
                solutionIds,
            }
        });
    } catch (error) {
        throw error;
    }
};
