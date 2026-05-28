import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    handlerCreateTemplate,
    handlerGetTemplates,
    handlerDisableTemplate,
    handlerRestoreTemplate,
    handlerHardDeleteTemplate,
    handlerUpdateTemplate,
    handlerSendNotification,
    handlerGetTemplateById,
} from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';

/**
 * Hook lấy danh sách templates (có phân trang).
 */
export const useTemplates = (filters = {}, options = {}) => {
    const { page = 1, limit = 10 } = filters;

    return useQuery({
        queryKey: queryKeys.notifications.templateList({ page, limit }),
        queryFn: ({ signal }) => handlerGetTemplates({ page, limit }, signal),
        keepPreviousData: true,
        select: (payload) => ({
            templates: payload?.templates ?? [],
            totalItems: payload?.totalItems ?? 0,
            totalPages: payload?.totalPages ?? 1,
            currentPage: payload?.currentPage ?? page,
        }),
        ...options,
    });
};

/**
 * Hook tạo mẫu thông báo mới.
 */
export const useCreateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (templateData) => handlerCreateTemplate(templateData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.sent() });
        },
    });
};

/**
 * Hook cập nhật mẫu thông báo.
 */
export const useUpdateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => handlerUpdateTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
        },
    });
};

/**
 * Hook gửi thông báo từ mẫu có sẵn (thủ công).
 */
export const useSendTemplateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ templateId, target }) => handlerSendNotification(templateId, target),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.sent() });
        },
    });
};

/**
 * Hook tạm dừng template.
 */
export const useDisableTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (templateId) => handlerDisableTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.disabledTemplates() });
        },
    });
};

/**
 * Hook khôi phục template đã tạm dừng.
 */
export const useRestoreTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (templateId) => handlerRestoreTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.disabledTemplates() });
        },
    });
};

/**
 * Hook xóa vĩnh viễn template.
 */
export const useHardDeleteTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (templateId) => handlerHardDeleteTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
        },
    });
};

/**
 * Hook lấy chi tiết template theo ID
 */
export const useTemplateById = (templateId, options = {}) => {
    return useQuery({
        queryKey: ['notifications', 'template', templateId],
        queryFn: ({ signal }) => handlerGetTemplateById(templateId, signal),
        enabled: !!templateId,
        select: (data) => data?.template,
        ...options,
    });
};

