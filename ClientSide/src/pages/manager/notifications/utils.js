import dayjs from 'dayjs';
import { NOTIFICATION_LABELS } from '@features/notifications/components/NotificationTable';

export const ITEMS_PER_PAGE = 30;
export const ALL_LABEL = NOTIFICATION_LABELS.ALL;
export const WARNING_LABEL = NOTIFICATION_LABELS.WARNING;

export const getLogIdentifier = (log) => {
    if (!log) return undefined;
    const rawId = log.log_id ?? log.template_id ?? log.id ?? log.notification_id ?? log.logId;
    return rawId !== undefined && rawId !== null ? String(rawId) : undefined;
};

export const mapLogToTableItem = (log, defaultSender = 'Manager') => {
    const sentAt = log?.sent_at ? dayjs(log.sent_at) : null;
    const timeDisplay = sentAt
        ? sentAt.isSame(dayjs(), 'day')
            ? sentAt.format('HH:mm')
            : sentAt.isSame(dayjs(), 'year')
                ? sentAt.format('D [thg] M')
                : sentAt.format('D [thg] M, YYYY')
        : '';

    const senderName = (() => {
        if (!log) return defaultSender;
        if (log.sender?.full_name) return log.sender.full_name;
        if (log.user_id?.name) return log.user_id.name;
        if (log.sent_by) return log.sent_by;
        return defaultSender;
    })();

    const isSentLog = Boolean(log?.sent_at !== undefined && log?.target !== undefined);

    let parsedTarget = log?.target;
    if (typeof parsedTarget === 'string') {
        try {
            parsedTarget = JSON.parse(parsedTarget);
        } catch (e) {
            console.error("Failed to parse target JSON", e);
        }
    }

    return {
        id: getLogIdentifier(log),
        sender: senderName,
        subject: log?.title ?? 'Thông báo',
        snippet: log?.body ?? '',
        label: log?.type === 'Warning' ? WARNING_LABEL : undefined,
        isRead: true,
        isPinned: false,
        time: timeDisplay,
        fullData: log,
        
        // Log Specific fields
        isSentLog,
        totalRecipients: log?.total_recipients || 0,
        targetRoles: parsedTarget?.roles || [],
        targetZones: parsedTarget?.zone_ids || [],
    };
};

export const mapReceivedNotification = (item) => {
    const sentAt = item?.deliveredAt ? dayjs(item.deliveredAt) : item?.created_at ? dayjs(item.created_at) : null;
    const timeDisplay = sentAt
        ? sentAt.isSame(dayjs(), 'day')
            ? sentAt.format('HH:mm')
            : sentAt.isSame(dayjs(), 'year')
                ? sentAt.format('D [thg] M')
                : sentAt.format('D [thg] M, YYYY')
        : '';

    const label = item?.type === 'Warning' ? WARNING_LABEL : undefined;
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
        sender: 'HEPZA',
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
