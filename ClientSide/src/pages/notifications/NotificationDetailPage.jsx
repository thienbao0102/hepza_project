import { useMemo, useState, useEffect, useCallback } from 'react';
import { Drawer } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationDetail from '@features/notifications/components/NotificationDetail';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
    handlerGetUserNotifications,
    handlerMarkAsRead,
    handlerPinNotification,
    handlerUnpinNotification,
} from '@services/notificationService';
import { handlerGetCompanyById } from '@services/companyService';
import { queryKeys } from '@lib/queryClient';
import { useAuth } from '@app/providers/auth/AuthProvider';

const DEFAULT_FILTERS = { page: 1, limit: 15, search: '' };

const formatNotificationDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const dayMap = ['CN', '2', '3', '4', '5', '6', '7'];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} Th ${dayMap[date.getDay()]}, ${date.getDate()} thg ${date.getMonth() + 1}`;
};

const normalizeInitialNotification = (payload) => {
    if (!payload) return null;
    const derivedId = payload.notification_I_id || payload.id || payload.notificationId;
    if (!derivedId) return null;
    const isPinnedValue =
        typeof payload.pin === 'boolean'
            ? payload.pin
            : typeof payload.isPinned === 'boolean'
                ? payload.isPinned
                : undefined;

    return {
        ...payload,
        notification_I_id: derivedId,
        id: derivedId,
        pin: isPinnedValue,
        company_name: payload.company_name || payload.recipientCompany || payload?.user_id?.company_name || null,
        recipientCompany: payload.recipientCompany || payload.company_name || payload?.user_id?.company_name || null,
        deliveredAt: payload.deliveredAt || payload.created_at || payload.sent_at || payload.updated_at,
    };
};

export const NotificationDetailModal = ({
    open,
    notificationId,
    initialNotification,
    listQueryFilters = DEFAULT_FILTERS,
    onClose,
}) => {
    const normalizedFilters = useMemo(() => (
        listQueryFilters && Object.keys(listQueryFilters).length > 0 ? listQueryFilters : DEFAULT_FILTERS
    ), [listQueryFilters]);
    const normalizedInitial = useMemo(() => normalizeInitialNotification(initialNotification), [initialNotification]);

    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.notifications.userList(normalizedFilters),
        queryFn: ({ signal }) => handlerGetUserNotifications(normalizedFilters, signal),
        enabled: Boolean(notificationId),
        select: (payload) => payload?.notifications ?? [],
    });

    const notification = useMemo(() => {
        if (!notificationId) return null;
        let fromQuery = null;
        if (Array.isArray(data)) {
            fromQuery = data.find((item) => item.notification_I_id === notificationId) || null;
        }

        if (fromQuery && normalizedInitial && normalizedInitial.notification_I_id === notificationId) {
            return {
                ...fromQuery,
                pin: typeof normalizedInitial.pin === 'boolean' ? normalizedInitial.pin : fromQuery.pin,
                company_name: fromQuery.company_name || normalizedInitial.company_name || normalizedInitial.recipientCompany,
            };
        }

        if (!fromQuery && normalizedInitial && normalizedInitial.notification_I_id === notificationId) {
            return normalizedInitial;
        }

        return fromQuery;
    }, [data, notificationId, normalizedInitial]);

    const fallbackName = authUser?.full_name || authUser?.user?.full_name || authUser?.name || 'Doanh nghiệp của bạn';
    const fallbackCompany =
        authUser?.company?.company_name ||
        authUser?.company?.name ||
        authUser?.company_name ||
        authUser?.user?.company?.company_name ||
        authUser?.user?.company_name ||
        'Doanh nghiệp của bạn';

    const [resolvedCompanyName, setResolvedCompanyName] = useState(() =>
        normalizedInitial?.company_name || normalizedInitial?.recipientCompany || null
    );

    useEffect(() => {
        if (!normalizedInitial) return;
        setResolvedCompanyName(normalizedInitial.company_name || normalizedInitial.recipientCompany || null);
    }, [normalizedInitial?.company_name, normalizedInitial?.recipientCompany]);

    const companyIdCandidate =
        notification?.user_id?.company_id ||
        notification?.company_id ||
        normalizedInitial?.company_id ||
        authUser?.company_id ||
        authUser?.company?.company_id ||
        authUser?.user?.company_id;

    useEffect(() => {
        let isMounted = true;
        const needFetch = companyIdCandidate && !(notification?.company_name || normalizedInitial?.company_name);
        if (!needFetch || resolvedCompanyName) {
            return () => {
                isMounted = false;
            };
        }

        const fetchCompany = async () => {
            try {
                const res = await handlerGetCompanyById(companyIdCandidate);
                if (isMounted) {
                    setResolvedCompanyName(res?.company?.company_name || res?.company?.name || null);
                }
            } catch (error) {
                console.error('Failed to fetch company info:', error);
                if (isMounted) {
                    setResolvedCompanyName(null);
                }
            }
        };

        fetchCompany();

        return () => {
            isMounted = false;
        };
    }, [companyIdCandidate, notification?.company_name, normalizedInitial?.company_name, resolvedCompanyName]);

    const [pinnedState, setPinnedState] = useState(Boolean(notification?.pin ?? normalizedInitial?.pin));

    useEffect(() => {
        setPinnedState(Boolean(notification?.pin ?? normalizedInitial?.pin));
    }, [notification?.pin, normalizedInitial?.pin]);

    const updatePinInCache = useCallback((id, shouldPin) => {
        queryClient.setQueryData(queryKeys.notifications.userList(normalizedFilters), (prev) => {
            if (!prev || !Array.isArray(prev.notifications)) {
                return prev;
            }
            return {
                ...prev,
                notifications: prev.notifications.map((item) =>
                    item.notification_I_id === id ? { ...item, pin: shouldPin } : item
                ),
            };
        });
    }, [queryClient, normalizedFilters]);

    const pinMutation = useMutation({
        mutationFn: ({ id, shouldPin }) =>
            shouldPin ? handlerPinNotification(id) : handlerUnpinNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(normalizedFilters) });
        },
    });

    const handleTogglePin = useCallback(async (shouldPin) => {
        if (!notification) return;
        const id = notification.notification_I_id;
        updatePinInCache(id, shouldPin);
        setPinnedState(shouldPin);
        try {
            await pinMutation.mutateAsync({ id, shouldPin });
        } catch (error) {
            console.error('Toggle pin failed:', error);
            setPinnedState((prev) => !prev);
            updatePinInCache(id, !shouldPin);
        }
    }, [notification, pinMutation, updatePinInCache]);

    const markAsReadMutation = useMutation({
        mutationFn: handlerMarkAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.user() });
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.userList(normalizedFilters) });
        },
    });

    useEffect(() => {
        if (!notification?.notification_I_id) return;
        if (notification?.status === 'read' || notification?.readAt) return;
        markAsReadMutation.mutate(notification.notification_I_id);
    }, [markAsReadMutation, notification?.notification_I_id, notification?.status, notification?.readAt]);

    const recipientName =
        notification?.user_id?.full_name ||
        notification?.user_id?.name ||
        notification?.recipient_name ||
        normalizedInitial?.recipient ||
        fallbackName;
    const recipientCompany =
        notification?.user_id?.company_name ||
        notification?.company_name ||
        notification?.recipient_company ||
        resolvedCompanyName ||
        normalizedInitial?.company_name ||
        fallbackCompany;

    const detailData = notification
        ? {
            title: notification.title,
            label: notification.type === 'Warning' ? 'Cảnh báo' : undefined,
            labelTone: notification.type === 'Warning' ? 'warning' : 'info',
            sender: 'HEPZA',
            senderSub: recipientCompany,
            recipient: recipientName,
            recipientCompany: recipientCompany,
            body: notification.body,
            datetime: formatNotificationDate(notification.deliveredAt || notification.created_at),
            relativeTime: '',
            isPinned: pinnedState,
        }
        : undefined;

    const handleDrawerClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    if (!open || !notificationId) {
        return null;
    }

    return (
        <Drawer
            placement="right"
            width="clamp(340px, 40vw, 700px)"
            open={open}
            maskClosable
            destroyOnClose={false}
            closable={false}
            onClose={handleDrawerClose}
            styles={{
                mask: { backgroundColor: 'rgba(15,23,42,0.45)' },
                body: { padding: 0, background: '#fff', height: '100%' }
            }}
        >
            <div className="flex h-full flex-col bg-white">
                <div className="flex-1 overflow-y-auto p-3">
                    {isLoading && !notification ? (
                        <div className="flex h-full items-center justify-center">
                            <LoadingSpinner tip="Đang tải thông báo..." />
                        </div>
                    ) : notification ? (
                        <NotificationDetail
                            notification={detailData}
                            onBack={handleDrawerClose}
                            onDelete={() => { }}
                            onTogglePin={handleTogglePin}
                            className="h-full"
                        />
                    ) : (
                        <div className="flex h-full flex-col justify-center gap-3 rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                            <p className="text-gray-500">Không tìm thấy thông báo.</p>
                            <button
                                type="button"
                                className="mx-auto inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm"
                                onClick={handleDrawerClose}
                            >
                                Quay lại
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
};

const NotificationDetailPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    const listQueryFilters = location.state?.listQueryFilters || DEFAULT_FILTERS;
    const initialNotification = location.state?.notification || null;
    const notificationId = params.notificationId || location.state?.notificationId || initialNotification?.id;

    const handleClose = useCallback(() => {
        if (location.key === 'default') {
            navigate('/company/notifications', { replace: true });
            return;
        }
        navigate(-1);
    }, [location.key, navigate]);

    if (!notificationId) {
        return (
            <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <p className="text-gray-500">Không tìm thấy thông báo.</p>
                    <button
                        type="button"
                        className="mt-3 rounded-full border border-gray-200 px-4 py-2 text-sm"
                        onClick={() => navigate('/company/notifications')}
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <NotificationDetailModal
                open
                notificationId={notificationId}
                initialNotification={initialNotification}
                listQueryFilters={listQueryFilters}
                onClose={handleClose}
            />
        </div>
    );
};

export default NotificationDetailPage;
