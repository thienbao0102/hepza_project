import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { AddButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import NotificationTable from '@features/notifications/components/NotificationTable';
import TemplatesTab from '@features/notifications/components/TemplatesTab';
import { useSentNotifications } from '@features/notifications/hooks/useSentNotifications';
import { useUserNotifications } from '@features/notifications/hooks/useUserNotifications';
import { handlerRevokeSendLogs } from '@services/notificationService';
import {
    handlerPinNotification,
    handlerUnpinNotification,
    handlerMarkAsRead,
} from '@services/notificationService';
import { queryKeys } from '@lib/queryClient';

import ViewModeSwitcher from './components/ViewModeSwitcher';
import Pagination from '@components/common/Pagination';
import { History, FileText, CalendarCog, Inbox } from 'lucide-react';

import {
    ITEMS_PER_PAGE,
    ALL_LABEL,
    WARNING_LABEL,
    getLogIdentifier,
    mapLogToTableItem,
    mapReceivedNotification,
} from './utils';

import { useHeader } from '@/components/common/Header/HeaderContext';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';

const ManagerNotificationsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const managerId = user?.user_id ?? user?.user?.user_id;
    const currentZoneId = user?.zone_id ?? user?.user?.zone_id;
    const { data: zoneData } = useZone(currentZoneId, { enabled: !!currentZoneId });
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: zoneData?.zone?.zone_name || (user?.zone_name ?? user?.user?.zone_name),
        zoneId: currentZoneId,
    });
    const managerName = user?.full_name ?? user?.user?.full_name ?? "Ban quản lý";

    const [activeTab, setActiveTab] = useState(0);
    const [statusFilter, setStatusFilter] = useState('all');
    const isSentMode = activeTab === 1;
    const isInboxMode = activeTab === 0;
    const isTemplatesMode = activeTab === 2;
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [labelFilter, setLabelFilter] = useState(ALL_LABEL);
    const [selectedFilters, setSelectedFilters] = useState({});

    useEffect(() => {
        setHeaderConfig({
            title: isSentMode ? 'Thông báo đã gửi' : 'Thông báo',
            description: isSentMode ? 'Xem log thông báo Ban quản lý gửi cho doanh nghiệp trong khu' : 'Thông báo HEPZA gửi cho Ban quản lý',
            showWeather: true,
        });

        setBreadcrumbItems([
            {
                title: 'Thông báo',
                key: '/manager/notifications'
            }
        ]);
    }, [isSentMode]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle(isSentMode ? 'Thông báo đã gửi' : 'Thông báo', managerZoneLabel),
            description: isSentMode
                ? `Theo dõi thông báo Ban quản lý gửi tới doanh nghiệp thuộc ${managerZoneLabel}.`
                : `Thông báo áp dụng cho phạm vi ${managerZoneLabel}.`,
            showWeather: true,
        });

        setBreadcrumbItems([
            {
                title: `Thông báo`,
                key: '/manager/notifications'
            }
        ]);
    }, [isSentMode, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle(isSentMode ? 'Thông báo đã gửi' : 'Thông báo', managerZoneLabel),
            description: isSentMode
                ? `Theo dõi thông báo Ban quản lý gửi tới doanh nghiệp thuộc ${managerZoneLabel}.`
                : `Theo dõi thông báo từ HEPZA gửi tới Ban quản lý ${managerZoneLabel}.`,
            showWeather: true,
        });

        setBreadcrumbItems([
            {
                title: `Thông báo`,
                key: '/manager/notifications'
            }
        ]);
    }, [isSentMode, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        const headerTitle = isTemplatesMode
            ? buildManagerScopedTitle('Mẫu & Lịch gửi', managerZoneLabel)
            : buildManagerScopedTitle(isSentMode ? 'Thông báo đã gửi' : 'Thông báo', managerZoneLabel);

        const headerDescription = isTemplatesMode
            ? `Quản lý mẫu thông báo và lịch gửi tới doanh nghiệp thuộc ${managerZoneLabel}.`
            : isSentMode
                ? `Theo dõi thông báo Ban quản lý gửi tới doanh nghiệp thuộc ${managerZoneLabel}.`
                : `Theo dõi thông báo từ HEPZA gửi tới Ban quản lý ${managerZoneLabel}.`;

        setHeaderConfig({
            title: headerTitle,
            description: headerDescription,
            showWeather: true,
        });

        setBreadcrumbItems([
            {
                title: `Thông báo`,
                key: '/manager/notifications'
            }
        ]);
    }, [isSentMode, isTemplatesMode, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    const TABS = [
        { key: 0, label: 'Hộp thư đến', icon: Inbox },
        { key: 1, label: 'Lịch sử đã gửi', icon: History },
        { key: 2, label: 'Mẫu & Lịch gửi', icon: FileText },
    ];

    const sentFilters = useMemo(() => {
        const { sender: _s, sender_role: _sr, ...restFilters } = selectedFilters;
        return {
            page,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
            type: labelFilter === WARNING_LABEL ? 'Warning' : undefined,
            sent_by: selectedFilters.sender?.[0] || managerId,
            ...restFilters,
        };
    }, [page, searchTerm, labelFilter, selectedFilters, managerId]);

    const { data: sentData, isLoading: isLoadingSent, refetch: refetchSent } = useSentNotifications(
        sentFilters,
        {
            debounceMs: 0,
            queryOptions: {
                enabled: Boolean(managerId) && isSentMode,
            },
        },
    );

    const inboxFilters = useMemo(() => {
        const { sender_role: sr, ...restFilters } = selectedFilters;
        return {
            page,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
            type: labelFilter === WARNING_LABEL ? 'Warning' : undefined,
            sender_role: sr?.[0],
            status: statusFilter === 'all' ? undefined : statusFilter,
            ...restFilters,
        };
    }, [page, searchTerm, labelFilter, selectedFilters, statusFilter]);

    const { data: inboxData, isLoading: isLoadingInbox, queryFilters: inboxQueryFilters } = useUserNotifications(
        inboxFilters,
        {
            debounceMs: 0,
            queryOptions: {
                enabled: isInboxMode,
            },
        },
    );


    useEffect(() => {
        const totalPages = isSentMode
            ? (typeof sentData?.totalPages === 'number' ? sentData.totalPages : null)
            : (typeof inboxData?.totalPages === 'number' ? inboxData.totalPages : null);
        if (!totalPages || totalPages < 1) return;
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [sentData?.totalPages, inboxData?.totalPages, page, isSentMode]);

    useEffect(() => {
        setPage(1);
    }, [labelFilter, activeTab]);

    const baseNotifications = useMemo(
        () => (sentData?.logs ?? []).map((log) => mapLogToTableItem(log, managerName)),
        [sentData?.logs, managerName],
    );

    const sentNotifications = useMemo(() => {
        return page === 1 ? baseNotifications.slice(0, ITEMS_PER_PAGE) : baseNotifications;
    }, [baseNotifications, page]);

    const inboxNotifications = useMemo(
        () => (inboxData?.notifications ?? []).map(mapReceivedNotification),
        [inboxData?.notifications],
    );

    const notifications = isSentMode ? sentNotifications : inboxNotifications;

    const totalItems = isSentMode
        ? sentData?.totalItems ?? notifications.length
        : (inboxData?.totalItems ?? notifications.length);

    const isLoading = isSentMode
        ? (isLoadingSent || !managerId)
        : (isLoadingInbox || !managerId);


    const inboxListQueryFilters = useMemo(
        () => inboxQueryFilters ?? {
            page,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
            ...(labelFilter === WARNING_LABEL ? { type: 'Warning' } : {}),
        },
        [inboxQueryFilters, page, searchTerm, labelFilter],
    );

    const updateInboxCache = useCallback((id, updater) => {
        queryClient.setQueryData(queryKeys.notifications.userList(inboxListQueryFilters), (prev) => {
            if (!prev || !Array.isArray(prev.notifications)) return prev;
            return {
                ...prev,
                notifications: prev.notifications.map((item) =>
                    item.notification_I_id === id ? updater(item) : item
                ),
            };
        });
    }, [queryClient, inboxListQueryFilters]);

    const inboxPinMutation = useMutation({
        mutationFn: ({ id, shouldPin }) =>
            shouldPin ? handlerPinNotification(id) : handlerUnpinNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(inboxListQueryFilters) });
        },
    });

    const inboxMarkMutation = useMutation({
        mutationFn: (id) => handlerMarkAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(inboxListQueryFilters) });
        },
    });

    const handleMarkAsRead = useCallback(async (ids = []) => {
        if (!ids.length || !isInboxMode) return;
        await Promise.all(ids.map((id) => inboxMarkMutation.mutateAsync(id).catch(() => null)));
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(inboxListQueryFilters) });
    }, [inboxMarkMutation, queryClient, inboxListQueryFilters, isInboxMode]);

    const toolbarExtras = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <SearchBox
                placeholder="Tìm kiếm thông báo..."
                onSearch={(value) => {
                    setPage(1);
                    setSearchTerm(value);
                }}
                debounceDelay={400}
                rootClassName="w-full sm:w-72"
                className="!border-gray-200 !bg-gray-50"
            />
            <AddButton
                onClick={() => navigate('/manager/notifications/create')}
                text="Gửi Thông báo"
                className="whitespace-nowrap"
            />
        </div>
    );

    const handleTogglePin = useCallback(
        async (logId, shouldPin, notificationItem) => {
            try {
                const normalizedId =
                    logId !== undefined && logId !== null ? String(logId) : undefined;

                if (isSentMode) {
                    // Sent logs no longer support pinning
                    return;
                }

                // Inbox pin
                if (shouldPin) {
                    updateInboxCache(logId, (item) => ({ ...item, pin: true }));
                    inboxPinMutation.mutate({ id: logId, shouldPin: true });
                } else {
                    updateInboxCache(logId, (item) => ({ ...item, pin: false }));
                    inboxPinMutation.mutate({ id: logId, shouldPin: false });
                }
            } catch (error) {
                console.error('Toggle pin failed:', error);
            }
        },
        [isSentMode, updateInboxCache, inboxPinMutation, isInboxMode],
    );

    return (
        <div className="flex h-full flex-col gap-4 bg-slate-50 overflow-hidden pt-1">
            <div className="flex items-center gap-1 px-1 pb-3 border-b border-slate-200">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveTab(tab.key);
                                setPage(1);
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                                ${isActive
                                    ? 'bg-[#4E5BA6]/10 text-[#4E5BA6] ring-1 ring-[#4E5BA6]/20 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {/* Inbox or Sent table */}
                {(isInboxMode || isSentMode) && (
                    <NotificationTable
                        notifications={notifications}
                        loading={isLoading}
                        itemsPerPage={ITEMS_PER_PAGE}
                        extraToolbarContent={toolbarExtras}
                        showManagerLabelFilter={false}
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
                        showSenderFilter={false}
                        userRole="manager"
                        variant={isSentMode ? 'sent-logs' : 'default'}
                        onTogglePin={isInboxMode ? handleTogglePin : undefined}
                        onMarkAsRead={isInboxMode ? handleMarkAsRead : undefined}
                        isServerPagination={true}
                        showInlineDetail={true}
                        enableLocalSearch={false}
                        onDelete={isSentMode ? async (ids) => {
                            if (!ids.length) return;
                            try {
                                const templateIds = ids
                                    .map(id => {
                                        const item = notifications.find(n => n.id === id);
                                        return item?.fullData?.template_id;
                                    })
                                    .filter(Boolean);

                                if (!templateIds.length) {
                                    console.error('No valid template_ids found');
                                    return;
                                }

                                await handlerRevokeSendLogs({ template_ids: templateIds });
                                await refetchSent();
                            } catch (error) {
                                console.error('Manager delete failed:', error);
                            }
                        } : undefined}
                        hidePagination={true}
                        serverPagination={{
                            currentPage: page,
                            totalPages: isSentMode ? (sentData?.totalPages ?? 1) : (inboxData?.totalPages ?? 1),
                            totalItems,
                            onPageChange: setPage,
                        }}
                    />
                )}


                {isTemplatesMode && (
                    <TemplatesTab />
                )}
            </div>
        </div>
    );
};

export default ManagerNotificationsPage;
