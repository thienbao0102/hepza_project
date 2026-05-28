import {
    GET_SUMMARY_RECORD_ROUTE,
    GET_SUMMARY_RECORD_BY_PERIODKEY_ROUTE
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

// Handle fetching total summary record based on date range(periodKeyStart (vd: 202401), periodKeyEnd (vd:202402))
export const handlerGetSummaryRecord = async (params = {}, abortSignal = null) => {
    try {
        const { role, periodKeyStart, periodKeyEnd, company_id, zone_id, include = [1] } = params;
        const queryParams = {
            role,
            periodKeyStart,
            periodKeyEnd,
            include,
            company_id,
            zone_id,
        };
        return await requestViaTransport({
            method: 'get',
            url: GET_SUMMARY_RECORD_ROUTE,
            event: 'summary:getRecord',
            payload: queryParams,
            config: {
                withCredentials: true,
                signal: abortSignal,
            }
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

// Handle fetching each summary record by month(periodKeyStart (vd: 202401), periodKeyEnd (vd:202402))
export const handlerGetSummaryRecordByPeriodkey = async (params = {}, abortSignal = null) => {
    try {
        const { role, periodKeyStart, periodKeyEnd, include = [1], company_id, zone_id } = params;
        const queryParams = {
            role,
            periodKeyStart,
            periodKeyEnd,
            include,
            company_id,
            zone_id
        };
        return await requestViaTransport({
            method: 'get',
            url: GET_SUMMARY_RECORD_BY_PERIODKEY_ROUTE,
            event: 'summary:getByPeriodKey',
            payload: queryParams,
            config: {
                withCredentials: true,
                signal: abortSignal,
            }
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

