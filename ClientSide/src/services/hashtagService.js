import { requestViaTransport } from '@lib/transport-selector';
import { ADD_HASHTAG_ROUTE, GET_ALL_HASHTAGS_ROUTE } from '@constants/constants';

export const handlerGetAllHashtags = async () => {
    try {
        const data = await requestViaTransport({
            method: 'get',
            url: GET_ALL_HASHTAGS_ROUTE,
            event: 'hashtag:getAll'
        });
        return data?.hashtags ?? [];
    } catch (error) {
        throw error;
    }
};

export const handlerCreateHashtag = async ({ name, description = '' }) => {
    try {
        const payload = {
            name,
            description,
        };
        const data = await requestViaTransport({
            method: 'post',
            url: ADD_HASHTAG_ROUTE,
            event: 'hashtag:create',
            payload
        });
        return data?.hashtag ?? null;
    } catch (error) {
        throw error;
    }
};

