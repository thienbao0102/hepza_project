import {
    GET_EMISSION_DATA_ROUTER
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

// Handle fetching summary record based on date range and role (periodKeyStart (vd: 202401), periodKeyEnd (vd:202402), role)
export const handlerGetEmissionData = async (params = {}, abortSignal = null) => {
    const { periodKeyStart, periodKeyEnd, include = [1], company_id = undefined, zone_id = undefined } = params;

    try {
        const queryParams = {
            periodKeyStart,
            periodKeyEnd,
            include,
            company_id,
            zone_id
        };
        const data = await requestViaTransport({
            method: 'get',
            url: GET_EMISSION_DATA_ROUTER,
            event: 'emission:getData',
            payload: queryParams,
            config: {
                withCredentials: true,
                signal: abortSignal
            }
        });
        console.log('response: ', data)
        return data; // { message: 'Emission data retrieved successfully', emissionData: [...] }
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