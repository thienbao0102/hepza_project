import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import SearchBox from '@components/ui/SearchBox';
import NotificationTable, { NOTIFICATION_LABELS } from '@features/notifications/components/NotificationTable';
import { useUserNotifications } from '@features/notifications/hooks/useUserNotifications';
import {
    handlerPinNotification,
    handlerUnpinNotification,
    handlerMarkAsRead,
    handlerDeleteMultipleNotifications,
} from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useHeader } from '@/components/common/Header/HeaderContext';
import toast from '@/utils/toast';

const ITEMS_PER_PAGE = 30;
const ALL_LABEL = NOTIFICATION_LABELS.ALL;
const WARNING_LABEL = NOTIFICATION_LABELS.WARNING;

const mapInstanceToRow = (item) => {
    const sentAt = item?.deliveredAt ? dayjs(item.deliveredAt) : item?.created_at ? dayjs(item.created_at) : null;
    const timeDisplay = sentAt
        ? sentAt.isSame(dayjs(), 'day')
            ? sentAt.format('HH:mm')
            : sentAt.isSame(dayjs(), 'year')
                ? sentAt.format('D [thg] M')
                : sentAt.format('D [thg] M, YYYY')
        : '';

    const label = item?.type === 'Warning' ? 'Cảnh báo' : undefined;
    const recipientName =
        item?.user_id?.full_name ||
        item?.user_id?.name ||
        item?.recipient_name ||
        item?.recipient ||
        '';
    const recipientCompany =
        item?.user_id?.company_name ||
        item?.user_id?.company?.company_name ||
        item?.company_name ||
        item?.recipient_company ||
        '';

    return {
        id: item?.notification_I_id || item?._id || item?.template_id,
        sender: (() => {
            if (item?.sender && typeof item.sender === 'object') {
                if (item.sender.role === 'admin') return 'Hepza';
                if (item.sender.role === 'manager') return 'Ban quản lý';
                return item.sender.full_name || item.sender.name || 'HEPZA';
            }
            return 'HEPZA';
        })(),
        subject: item?.title ?? 'Thông báo',
        snippet: item?.body ?? '',
        label,
        isRead: item?.status === 'read' || Boolean(item?.readAt),
        isPinned: Boolean(item?.pin),
        time: timeDisplay,
        recipient: recipientName,
        recipientCompany,
        fullData: item,
    };
};

const NotificationsPage = () => {
    const { user } = useAuth();
    const role = user?.role ?? user?.user?.role;
    const [statusFilter, setStatusFilter] = useState('all');
    const senderRoleFilter = role === 'manager' ? 'admin' : undefined;
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [labelFilter, setLabelFilter] = useState(ALL_LABEL);
    const [selectedFilters, setSelectedFilters] = useState({});
    const queryClient = useQueryClient();

    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    useEffect(() => {
        setHeaderConfig({
            title: 'Thông báo của bạn',
            description: 'Danh sách tất cả thông báo đã nhận',
        });
        setBreadcrumbItems([
            {
                title: 'Thông báo',
                key: '/company/notifications',
            },
        ]);
    }, []);

    const notificationsFilters = useMemo(() => {
        const { sender_role: sr, ...restFilters } = selectedFilters;
        return {
            page,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
            type: labelFilter === WARNING_LABEL ? 'Warning' : undefined,
            sender_role: sr?.[0] || senderRoleFilter,
            status: statusFilter === 'all' ? undefined : statusFilter,
            ...restFilters,
        };
    }, [page, searchTerm, labelFilter, selectedFilters, senderRoleFilter, statusFilter]);

    const { data, isLoading, queryFilters } = useUserNotifications(notificationsFilters);

    const listQueryFilters = useMemo(
        () => queryFilters ?? { 
            page, 
            limit: ITEMS_PER_PAGE, 
            search: searchTerm, 
            sender_role: senderRoleFilter,
            status: statusFilter === 'all' ? undefined : statusFilter
        },
        [queryFilters, page, searchTerm, senderRoleFilter, statusFilter]
    );

    const updateCache = useCallback((id, updater) => {
        queryClient.setQueryData(queryKeys.notifications.userList(listQueryFilters), (prev) => {
            if (!prev || !Array.isArray(prev.notifications)) return prev;
            return {
                ...prev,
                notifications: prev.notifications.map((item) =>
                    item.notification_I_id === id ? updater(item) : item
                ),
            };
        });
    }, [queryClient, listQueryFilters]);

    const pinMutation = useMutation({
        mutationFn: ({ id, shouldPin }) =>
            shouldPin ? handlerPinNotification(id) : handlerUnpinNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(listQueryFilters) });
        },
    });

    const markMutation = useMutation({
        mutationFn: (id) => handlerMarkAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(listQueryFilters) });
        },
    });

    const handleMarkAsRead = useCallback(async (ids = []) => {
        if (!ids.length) return;
        await Promise.all(ids.map((id) => markMutation.mutateAsync(id).catch(() => null)));
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(listQueryFilters) });
    }, [markMutation, queryClient, listQueryFilters]);

    const deleteMutation = useMutation({
        mutationFn: (ids) => handlerDeleteMultipleNotifications(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(listQueryFilters) });
            toast.success('Xoá thành công', 'Thông báo đã được xoá khỏi danh sách.');
        },
    });

    const handleDelete = useCallback(async (ids = []) => {
        if (!ids.length) return;
        try {
            await deleteMutation.mutateAsync(ids);
        } catch (error) {
            console.error('Delete notifications failed:', error);
        }
    }, [deleteMutation]);

    useEffect(() => {
        const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : null;
        if (!totalPages || totalPages < 1) return;
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [data?.totalPages, page]);

    useEffect(() => {
        setPage(1);
    }, [labelFilter]);

    const rawNotifications = data?.notifications ?? [];
    const notifications = useMemo(() => rawNotifications.map(mapInstanceToRow), [rawNotifications]);
    const totalItems = data?.totalItems ?? rawNotifications.length;

    return (
        <div className="flex h-full flex-col gap-6 bg-slate-50 overflow-hidden">

            <div className="flex-1 min-h-0 flex flex-col">
                <NotificationTable
                    notifications={notifications}
                    loading={isLoading}
                    itemsPerPage={ITEMS_PER_PAGE}
                    showManagerLabelFilter={false}
                    enableLocalSearch={false}
                    showInlineDetail
                    labelFilterValue={labelFilter}
                    onLabelFilterChange={setLabelFilter}
                    statusFilterValue={statusFilter}
                    onStatusFilterChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                    selectedFilters={selectedFilters}
                    onSelectedFiltersChange={(v) => {
                        setSelectedFilters(v);
                        setPage(1);
                    }}
                    userRole="company"
                    singleSelectFields={['sender_role']}
                    onTogglePin={(id, shouldPin) => {
                        setPage(1);
                        updateCache(id, (item) => ({ ...item, pin: shouldPin }));
                        pinMutation.mutate({ id, shouldPin });
                    }}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    extraToolbarContent={
                        <SearchBox
                            placeholder="Tìm kiếm tiêu đề hoặc nội dung..."
                            onSearch={(value) => {
                                setPage(1);
                                setSearchTerm(value);
                            }}
                            debounceDelay={400}
                            rootClassName="w-full sm:w-72"
                            className="!border-gray-200 !bg-gray-50"
                        />
                    }
                    serverPagination={{
                        currentPage: page,
                        totalPages: data?.totalPages ?? 1,
                        totalItems,
                        onPageChange: setPage,
                    }}
                />
            </div>
        </div>
    );
};

export default NotificationsPage;
