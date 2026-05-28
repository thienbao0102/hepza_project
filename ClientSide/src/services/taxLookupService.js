import { LOOKUP_TAX_CODE_ROUTE } from '@constants/constants';
import { apiClient } from '@lib/api-client';

export const handlerLookupTaxCode = async (taxCode, abortSignal = null) => {
    try {
        const response = await apiClient.get(LOOKUP_TAX_CODE_ROUTE(taxCode), {
            signal: abortSignal,
        });

        return response.data;
    } catch (error) {
        if (error.name === 'CanceledError') {
            throw error;
        }

        console.error('Tax lookup error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message || 'Không thể tra cứu MST');
    }
};
