import { requestViaTransport } from '@/lib/transport-selector';
import {
    GET_ALL_ERROR_LOGS_ROUTE,
    CREATE_ERROR_LOG_ROUTE,
    UPDATE_ERROR_STATUS_ROUTE,
    DELETE_ERROR_LOG_ROUTE
} from '@constants/constants';

export const errorLogService = {
    // Get all error logs
    getAllErrorLogs: async () => {
        return await requestViaTransport({
            method: 'get',
            url: GET_ALL_ERROR_LOGS_ROUTE,
            event: 'errorLog:getAll'
        });
    },

    // Create a new error log
    createErrorLog: async (errorData) => {
        return await requestViaTransport({
            method: 'post',
            url: CREATE_ERROR_LOG_ROUTE,
            event: 'errorLog:create',
            payload: errorData
        });
    },

    // Update error status
    updateErrorStatus: async (id, status) => {
        return await requestViaTransport({
            method: 'patch',
            url: UPDATE_ERROR_STATUS_ROUTE(id),
            event: 'errorLog:updateStatus',
            payload: { id, status }
        });
    },

    // Delete error log
    deleteErrorLog: async (id) => {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_ERROR_LOG_ROUTE(id),
            event: 'errorLog:delete',
            payload: { id }
        });
    }
};
