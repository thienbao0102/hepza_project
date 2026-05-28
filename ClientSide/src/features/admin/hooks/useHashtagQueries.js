import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { handlerCreateHashtag, handlerGetAllHashtags } from '@services/hashtagService';
import { queryKeys } from '@lib/queryClient';

export const useAllHashtags = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.hashtags.all,
        queryFn: handlerGetAllHashtags,
        ...options,
    });
};

export const useCreateHashtag = (options = {}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: handlerCreateHashtag,
        onSuccess: (...args) => {
            queryClient.invalidateQueries(queryKeys.hashtags.all);
            if (typeof options.onSuccess === 'function') {
                options.onSuccess(...args);
            }
        },
        ...options,
    });
};

