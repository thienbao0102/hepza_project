import { useCallback, useEffect, useMemo, useState } from 'react';


import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { AddButton } from '@components/ui/Button';

import NotificationTable, { NOTIFICATION_LABELS } from '@features/notifications/components/NotificationTable';
import TemplatesTab from '@features/notifications/components/TemplatesTab';
import { useSentNotifications } from '@features/notifications/hooks/useSentNotifications';
import { 
    handlerRevokeSendLogs,
} from '@services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { History, FileText } from 'lucide-react';

const ITEMS_PER_PAGE = 30;
const ALL_LABEL = NOTIFICATION_LABELS.ALL;
const WARNING_LABEL = NOTIFICATION_LABELS.WARNING;

const getLogIdentifier = (log) => {
    if (!log) return undefined;
    const rawId = log.log_id ?? log.template_id ?? log.id ?? log.notification_id ?? log.logId;
    return rawId !== undefined && rawId !== null ? String(rawId) : undefined;
};

const mapLogToTableItem = (log) => {
    const sentAt = log?.sent_at ? dayjs(log.sent_at) : null;
    const timeDisplay = sentAt
        ? sentAt.isSame(dayjs(), 'day')
            ? sentAt.format('HH:mm')
            : sentAt.isSame(dayjs(), 'year') 
                ? sentAt.format('D [thg] M') 
                : sentAt.format('D [thg] M, YYYY')
        : '';

    const senderName = (() => {
        if (typeof log.user_id === 'object' && log.user_id !== null) {
            return log.user_id.name || log.user_id.full_name || log.user_id.email || 'Hệ thống';
        }
        if (!log?.user_id || log.user_id === 'system') return 'Hệ thống';
        return ''; // Trả về rỗng để hiển thị ID ở phần ID nếu không có tên
    })();

    return {
        id: getLogIdentifier(log),
        sender: senderName,
        subject: log?.title ?? 'Thông báo',
        snippet: log?.body ?? '',
        label: log?.type === 'Warning' ? 'Cảnh báo' : undefined,
        isRead: true,
        isPinned: false,
        time: timeDisplay,
        fullData: log,
    };
};

const mapReceivedNotification = (notif) => {
    const deliveredAt = notif?.deliveredAt ? dayjs(notif.deliveredAt) : null;
    const timeDisplay = deliveredAt
        ? deliveredAt.isSame(dayjs(), 'day')
            ? deliveredAt.format('HH:mm')
            : deliveredAt.isSame(dayjs(), 'year')
                ? deliveredAt.format('D [thg] M')
                : deliveredAt.format('D [thg] M, YYYY')
        : '';

    return {
        id: notif?.notification_I_id,
        sender: 'HEPZA',
        subject: notif?.title ?? 'Thông báo',
        snippet: notif?.body ?? '',
        label: notif?.type === 'Warning' ? 'Cảnh báo' : undefined,
        isRead: notif?.status === 'read',
        isPinned: Boolean(notif?.pin),
        time: timeDisplay,
        fullData: notif,
    };
};

const AdminNotificationsManagement = () => {
    const { setHeaderConfig, date, setDate } = useHeader();
    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý thông báo",
            description: "Tất cả thông báo trong hệ thống.",
            showWeather: true,
            showDatePicker: false,
        });
    }, []);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const role = user?.role ?? user?.user?.role;
    const isAdmin = role === 'admin';
    const adminId = user?.user_id ?? user?.user?.user_id;

    const [activeTab, setActiveTab] = useState(1); // 1: Sent Logs, 2: Templates
    const isSentMode = activeTab === 1;

    const [page, setPage] = useState(1);
    const [logTab, setLogTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [labelFilter, setLabelFilter] = useState(ALL_LABEL);
    const [selectedFilters, setSelectedFilters] = useState({});

    const TABS = [
        { key: 1, label: 'Lịch sử đã gửi', icon: History },
        { key: 2, label: 'Mẫu & Lịch gửi', icon: FileText },
    ];

    // --- FETCH SENT LOGS ---
    const sentFilters = useMemo(() => {
        const { sender: _s, sender_role: _sr, ...restFilters } = selectedFilters;
        return {
            page,
            limit: ITEMS_PER_PAGE,
            search: (labelFilter === NOTIFICATION_LABELS.ALL) ? '' : labelFilter,
            sender_role: logTab === 'all' ? undefined : logTab,
            sent_by: selectedFilters.sender?.[0],
            ...restFilters,
        };
    }, [page, labelFilter, logTab, selectedFilters]);

    const { data: sentData, isLoading: isLoadingSent, refetch: refetchSent } = useSentNotifications(
        sentFilters,
        { 
            debounceMs: 0,
            queryOptions: { enabled: isSentMode }
        },
    );

    // Update pagination
    useEffect(() => {
        const totalPages = typeof sentData?.totalPages === 'number' ? sentData.totalPages : null;
        if (!totalPages || totalPages < 1) return;
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [sentData?.totalPages, page]);

    useEffect(() => {
        setPage(1);
    }, [labelFilter, activeTab, logTab, selectedFilters]);

    // --- MAPPING DATA ---
    const baseSentNotifications = useMemo(
        () => (sentData?.logs ?? []).map(mapLogToTableItem),
        [sentData?.logs],
    );

    const sentNotifications = useMemo(() => {
        return page === 1 ? baseSentNotifications.slice(0, ITEMS_PER_PAGE) : baseSentNotifications;
    }, [baseSentNotifications, page]);

    const notifications = sentNotifications;
    const totalItems = sentData?.totalItems ?? notifications.length;
    const isLoading = isLoadingSent;

    const handleAddNotification = () => {
        navigate('create');
    };


    const addNotificationButton = isAdmin ? (
        <AddButton
            onClick={handleAddNotification}
            text="Gửi thông báo"
            className="whitespace-nowrap"
        />
    ) : null;

    const toolbarExtras = addNotificationButton;

    return (
        <div className="flex h-full flex-col bg-slate-50 overflow-hidden pt-1">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 px-1 pb-3 border-b border-slate-200 mb-4">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
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

            {/* Tab Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {isSentMode && (
                    <NotificationTable
                        notifications={notifications}
                        loading={isLoading}
                        itemsPerPage={ITEMS_PER_PAGE}
                        extraToolbarContent={toolbarExtras}
                        showManagerLabelFilter={false}
                        labelFilterValue={labelFilter}
                        onLabelFilterChange={setLabelFilter}
                        isSentLogView={isSentMode}
                        enableLocalSearch={isSentMode}
                        showInlineDetail
                        logTabValue={logTab}
                        onLogTabChange={setLogTab}
                        selectedFilters={selectedFilters}
                        onSelectedFiltersChange={setSelectedFilters}
                        singleSelectFields={['sender']}
                        variant="sent-logs"
                        onDelete={async (ids) => {
                            if (!ids.length) return;
                            try {
                                const logIds = [];
                                const templateIds = [];

                                ids.forEach(id => {
                                    const item = notifications.find(n => n.id === id);
                                    const logId = item?.fullData?.log_id;
                                    const tempId = item?.fullData?.template_id;
                                    
                                    if (logId) logIds.push(logId);
                                    else if (tempId) templateIds.push(tempId);
                                });

                                if (!logIds.length && !templateIds.length) {
                                    console.error('No valid log_ids or template_ids found');
                                    return;
                                }

                                await handlerRevokeSendLogs({ 
                                    log_ids: logIds, 
                                    template_ids: templateIds 
                                });
                                await refetchSent();
                            } catch (error) {
                                console.error('Admin revoke failed:', error);
                            }
                        }}
                        serverPagination={{
                            currentPage: page,
                            totalPages: sentData?.totalPages ?? 1,
                            totalItems,
                            onPageChange: setPage,
                        }}
                    />
                )}

                {activeTab === 2 && (
                    <TemplatesTab />
                )}
            </div>
        </div>
    );
};

export default AdminNotificationsManagement;
