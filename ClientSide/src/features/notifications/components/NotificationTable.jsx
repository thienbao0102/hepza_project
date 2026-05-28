import { useEffect, useMemo, useRef, useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import clsx from 'clsx';
import {
    MoreVertical,
    MailOpen,
    Pin,
    Building2,
    Trash2,
    Mail,
    Circle,
    Check,
    ChevronDown,
    Tag,
    AlertTriangle,
    X,
    PinOff,
    Search,
    ListFilter
} from 'lucide-react';

import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import Pagination from '@components/common/Pagination';
import NotificationDetail from '@features/notifications/components/NotificationDetail';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import ConfirmationModal from '@components/common/ConfirmationModal';
import { useZones } from "@/features/industrialzone/hooks/useZoneQueries";
import { useNotificationLogSenders } from '../hooks/useNotificationLogSenders';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const SENT_LOG_TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'admin', label: 'HEPZA' },
    { key: 'manager', label: 'Quản lý KCN/KCX' },
];

export const NOTIFICATION_LABELS = {
    ALL: 'Tất cả',
    WARNING: 'Cảnh báo',
};

const STATUS_TABS = [
    { key: 'read', label: 'Đã đọc' },
    { key: 'unread', label: 'Chưa đọc' },
];

const BASE_QUICK_LABEL_FILTERS = [
    { value: NOTIFICATION_LABELS.ALL, icon: Mail, iconProps: { className: 'text-gray-500' } },
    {
        value: NOTIFICATION_LABELS.WARNING,
        icon: Circle,
        iconProps: { className: 'text-red-500 fill-red-500', fill: 'currentColor' },
    },
];

const FILTER_FIELD_LABELS = {
    sender: 'Người gửi',
    date_range: 'Khoảng thời gian',
};
const DEFAULT_ITEMS_PER_PAGE = 30;

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const STRIP_HTML_REGEX = /<[^>]+>/g;

const normalizeBody = (content) => {
    if (!content) {
        return { text: '', isHtml: false };
    }
    const text = Array.isArray(content) ? content.join('\n') : String(content);
    const trimmed = text.trim();
    return {
        text,
        isHtml: Boolean(trimmed) && HTML_TAG_REGEX.test(trimmed),
    };
};

const extractPlainText = (content) => {
    if (!content) return '';
    const text = typeof content === 'string' ? content : String(content);
    if (!HTML_TAG_REGEX.test(text)) return text;
    return text.replace(STRIP_HTML_REGEX, ' ').replace(/\s+/g, ' ').trim();
};

const formatDetailDatetime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day} thg ${month}, ${year}`;
};

const buildDetailPayload = (row, zones = []) => {
    if (!row) return null;
    const raw = row.fullData || {};
    const { text: body, isHtml: bodyIsHtml } = normalizeBody(raw.body ?? row.snippet ?? '');
    const labelTone = row.label === 'Cảnh báo' ? 'warning' : 'info';
    const datetimeSource = raw.deliveredAt || raw.created_at || raw.sent_at || raw.updated_at;

    // Find sender displayName
    const inferredSender = (() => {
        const senderObj = raw.sender || row.sender;
        if (raw.sender_full_name) return raw.sender_full_name.trim();
        if (typeof senderObj === 'string' && senderObj.trim() !== '') return senderObj;
        if (typeof senderObj === 'object' && senderObj !== null) {
            return senderObj.full_name || senderObj.name || (senderObj.user_id ? `ID: ${senderObj.user_id}` : 'Hệ thống');
        }
        return 'Hệ thống';
    })();

    const senderRoleLabel = (() => {
        const senderObj = raw.sender || row.sender;
        const role = raw.sender_role || senderObj?.role || (String(raw.sent_by || '').startsWith('AD') ? 'admin' : (String(raw.sent_by || '').startsWith('MG') ? 'manager' : ''));

        if (role === 'admin') return 'HEPZA';
        if (role === 'manager') {
            const zId = raw.sender_zone_id || senderObj?.zone_id;
            const zone = zones.find(z => z.zone_id === zId);
            return zone ? `Quản lý ${zone.zone_name}` : 'Ban quản lý';
        }
        return '';
    })();

    const isSentLog = Boolean(raw.sent_at !== undefined && raw.target !== undefined);

    let parsedTarget = raw.target;
    if (typeof parsedTarget === 'string') {
        try {
            parsedTarget = JSON.parse(parsedTarget);
        } catch (e) {
            console.error("Failed to parse target JSON", e);
        }
    }

    // Map zone IDs to names
    const zoneNames = (parsedTarget?.zone_ids || []).map(id => {
        const zone = zones.find(z => z.zone_id === id);
        return zone ? zone.zone_name : id;
    });

    return {
        id: row.id,
        logId: raw.log_id || raw._id || row.id,
        templateName: raw.template_name || raw.TemplateName || 'Không dùng mẫu',
        title: raw.title || row.subject || 'Thông báo',
        label: row.label,
        labelTone,
        sender: inferredSender,
        senderId: raw.sent_by || raw.user_id || raw.sender?.user_id || raw.sender_id || '',
        senderRole: raw.sender_role || (raw.sender?.role) || (String(raw.sent_by || '').startsWith('AM') ? 'admin' : (String(raw.sent_by || '').startsWith('MG') ? 'manager' : '')),
        senderRoleLabel,
        senderZoneId: raw.sender_zone_id || raw.sender?.zone_id,
        body,
        bodyIsHtml,
        attachments: raw.attachments || [],
        datetime: datetimeSource ? formatDetailDatetime(datetimeSource) : row.time || '',
        isPinned: Boolean(row.isPinned || raw.pin),

        // Log Specific fields
        isSentLog,
        totalRecipients: raw.total_recipients || 0,
        targetRoles: parsedTarget?.roles || [],
        targetZones: zoneNames,
        targetCompanies: raw.target_company_names || [],
        targetMode: parsedTarget?.mode || 'Tất cả',
        isSpecificTarget: (parsedTarget?.company_ids || []).length > 0,
    };
};

const IconButton = ({ icon, label, variant = 'default', className = '', type = 'button', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center text-gray-500 transition-colors';
    const variantClasses =
        variant === 'ghost'
            ? 'h-8 px-0.5 text-gray-400 hover:text-indigo-600 rounded-none'
            : 'h-8 w-8 rounded-full border border-gray-200 bg-white hover:border-gray-300 hover:text-indigo-600';

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses} ${className}`.trim()}
            aria-label={label}
            title={label}
            {...props}
        >
            {icon}
        </button>
    );
};

const NotificationTable = ({
    notifications = [],
    loading = false,
    itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
    quickActionButtons = null,
    extraToolbarContent = null,
    showManagerLabelFilter = false,
    serverPagination = null,
    enableLocalSearch = true,
    onTogglePin = null,
    onMarkAsRead = null,
    onDelete = null,
    onRowClick = null,
    showInlineDetail = false,
    labelFilterValue = null,
    onLabelFilterChange = null,
    logTabValue = undefined,
    onLogTabChange = null,
    selectedFilters: selectedFiltersProp = undefined,
    onSelectedFiltersChange = null,
    variant = 'default', // 'default' (Inbox) or 'sent-logs'
    statusFilterValue = undefined,
    onStatusFilterChange = null,
    showSenderFilter = true,
    userRole = null, // 'admin', 'manager', 'company'
}) => {
    const isServerPagination = Boolean(serverPagination);
    const isManager = userRole === 'manager';
    const isCompany = userRole === 'company';
    const [internalNotifications, setInternalNotifications] = useState(() => notifications.map((item) => ({ isPinned: false, ...item })));
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedDetailId, setSelectedDetailId] = useState(null);
    const [internalStatusFilter, setInternalStatusFilter] = useState('all');
    const statusFilter = statusFilterValue !== undefined ? statusFilterValue : internalStatusFilter;

    const setStatusFilter = (val) => {
        const nextVal = typeof val === 'function' ? val(statusFilter) : val;
        // Trigger both parent and local state to be safe, but prioritize parent
        if (onStatusFilterChange) {
            onStatusFilterChange(nextVal);
        }
        setInternalStatusFilter(nextVal);
    };
    const [internalLabelFilter, setInternalLabelFilter] = useState(labelFilterValue ?? NOTIFICATION_LABELS.ALL);
    const [searchTerm, setSearchTerm] = useState('');

    const [internalSelectedFilters, setInternalSelectedFilters] = useState({});
    const selectedFilters = selectedFiltersProp !== undefined ? selectedFiltersProp : internalSelectedFilters;

    const setSelectedFilters = (val) => {
        const nextValue = typeof val === 'function' ? val(selectedFilters) : val;
        if (onSelectedFiltersChange) {
            onSelectedFiltersChange(nextValue);
        } else {
            setInternalSelectedFilters(nextValue);
        }
    };

    const [internalLogTab, setInternalLogTab] = useState('all');
    const logTab = logTabValue !== undefined ? logTabValue : internalLogTab;

    const setLogTab = (val) => {
        if (onLogTabChange) {
            onLogTabChange(val);
        } else {
            setInternalLogTab(val);
        }
    };

    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef(null);
    const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
    const bulkMenuRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(serverPagination?.currentPage) || 1));
    const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
    const [optimisticPins, setOptimisticPins] = useState({});
    const [optimisticPinnedItems, setOptimisticPinnedItems] = useState({});

    const zonesQuery = useZones();
    const zones = zonesQuery.data?.zones || [];

    const { data: availableSenders = [] } = useNotificationLogSenders(
        variant === 'sent-logs' ? (logTab === 'all' ? null : logTab) : null,
        { enabled: userRole !== 'company' }
    );

    // Delete confirmation state
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        open: false,
        ids: [],
        type: 'multiple' // 'multiple' | 'single'
    });

    const handleDeleteClick = (ids) => {
        if (!ids || ids.length === 0) return;
        setDeleteConfirmation({
            open: true,
            ids,
            type: ids.length === 1 ? 'single' : 'multiple'
        });
    };

    const handleConfirmDelete = () => {
        const { ids } = deleteConfirmation;
        if (onDelete && ids.length > 0) {
            onDelete(ids);

            // If deleting the item currently in detail view, close it
            if (detailPayload?.id && ids.includes(detailPayload.id)) {
                setSelectedDetailId(null);
            }

            // Clear selection if bulk delete
            if (ids === selectedIds) {
                setSelectedIds([]);
            }
        }
        setDeleteConfirmation({ open: false, ids: [], type: 'multiple' });
    };

    const handleCancelDelete = () => {
        setDeleteConfirmation({ open: false, ids: [], type: 'multiple' });
    };

    useEffect(() => {
        if (isServerPagination && typeof serverPagination?.currentPage === 'number') {
            const nextPage = Math.max(1, serverPagination.currentPage);
            setCurrentPage(nextPage);
        }
    }, [isServerPagination, serverPagination?.currentPage]);

    useEffect(() => {
        const normalized = notifications.map((item) => {
            const baseItem = { ...item, isPinned: Boolean(item.isPinned) };
            if (Object.prototype.hasOwnProperty.call(optimisticPins, baseItem.id)) {
                return { ...baseItem, isPinned: optimisticPins[baseItem.id] };
            }
            return baseItem;
        });
        setInternalNotifications(normalized);
        if (!isServerPagination) {
            setCurrentPage(1);
        }
        setSelectAllAcrossPages(false);
        if (Object.keys(optimisticPins).length > 0) {
            const nextOptimistic = { ...optimisticPins };
            let changed = false;
            normalized.forEach((item) => {
                if (nextOptimistic[item.id] !== undefined && nextOptimistic[item.id] === item.isPinned) {
                    delete nextOptimistic[item.id];
                    changed = true;
                }
            });
            if (changed) {
                setOptimisticPins(nextOptimistic);
            }
        }
    }, [notifications, isServerPagination, optimisticPins]);

    useEffect(() => {
        if (!showInlineDetail) {
            setSelectedDetailId(null);
            return;
        }
        if (selectedDetailId && !internalNotifications.some((item) => item.id === selectedDetailId)) {
            setSelectedDetailId(null);
        }
    }, [showInlineDetail, internalNotifications, selectedDetailId]);

    const isLabelControlled = typeof labelFilterValue === 'string';
    useEffect(() => {
        if (isLabelControlled) {
            setInternalLabelFilter(labelFilterValue ?? NOTIFICATION_LABELS.ALL);
        }
    }, [isLabelControlled, labelFilterValue]);

    const labelFilter = isLabelControlled ? (labelFilterValue ?? NOTIFICATION_LABELS.ALL) : internalLabelFilter;
    const handleLabelFilterChange = (value) => {
        const next = value || NOTIFICATION_LABELS.ALL;
        if (!isLabelControlled) {
            setInternalLabelFilter(next);
        }
        onLabelFilterChange?.(next);
    };

    useEffect(() => {
        setSelectedFilters((prev) => {
            // Keep existing filters but remove label if it was there from quick filters logic
            // Actually, we want to decouple the quick filters (All/Warning) from the ButtonFilter (Sender/Date)
            // The ButtonFilter state is in selectedFilters.
            // The quick filters state is in labelFilter.
            // So we don't need to sync them anymore for the 'label' field since we removed it from ButtonFilter.
            return prev;
        });
    }, [labelFilter]);

    const quickLabelFilters = useMemo(
        () => BASE_QUICK_LABEL_FILTERS,
        []
    );

    const optionLabels = useMemo(() => {
        const senderLabels = {};
        availableSenders.forEach(s => {
            const isHepza = s.role === 'admin';
            let roleSuffix = '';
            if (isHepza) {
                roleSuffix = 'HEPZA';
            } else if (s.role === 'manager') {
                const zone = zones.find(z => z.zone_id === s.zone_id);
                roleSuffix = zone ? `Quản lý ${zone.zone_name}` : 'Quản lý';
            } else {
                roleSuffix = s.role;
            }
            senderLabels[s.user_id] = `${s.full_name} (${roleSuffix})`;
        });
        return {
            sender: senderLabels
        };
    }, [availableSenders, zones]);
    const currentStatusLabel = useMemo(
        () => STATUS_TABS.find((tab) => tab.key === statusFilter)?.label ?? NOTIFICATION_LABELS.ALL,
        [statusFilter]
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
            if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target)) {
                setIsBulkMenuOpen(false);
            }
        };

        const handleResize = () => {
            setIsStatusDropdownOpen(false);
            setIsBulkMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const filteredNotifications = useMemo(() => {
        if (isServerPagination) return internalNotifications;

        const normalizedSearch = searchTerm.trim().toLowerCase();

        return internalNotifications
            .filter((item) => {
                const matchStatus =
                    statusFilter === 'all'
                        ? true
                        : statusFilter === 'read'
                            ? item.isRead
                            : !item.isRead;
                const matchLabel = labelFilter === NOTIFICATION_LABELS.ALL || item.label === labelFilter;

                // Log classification filter
                let matchLogTab = true;
                if (variant === 'sent-logs' && logTab !== 'all') {
                    const senderRole = item.fullData?.sender?.role || item.senderRole;
                    matchLogTab = senderRole === logTab;
                }

                const snippetString =
                    typeof item.snippet === 'string'
                        ? item.snippet
                        : item.snippet !== undefined && item.snippet !== null
                            ? String(item.snippet)
                            : '';
                const snippetSearchText = extractPlainText(snippetString);
                const bodyText = extractPlainText(item.fullData?.body ?? '');

                const matchSearch =
                    !normalizedSearch ||
                    (item.subject || '').toLowerCase().includes(normalizedSearch) ||
                    (item.sender || '').toLowerCase().includes(normalizedSearch) ||
                    snippetSearchText.toLowerCase().includes(normalizedSearch) ||
                    bodyText.toLowerCase().includes(normalizedSearch);

                // Sender filter
                let matchSender = true;
                if (selectedFilters.sender && selectedFilters.sender.length > 0) {
                    const senderId = item.fullData?.sent_by || item.fullData?.user_id || item.senderId;
                    matchSender = selectedFilters.sender.includes(senderId);
                }

                // Date range filter
                let matchDate = true;
                if (selectedFilters.date_range && (selectedFilters.date_range.from || selectedFilters.date_range.to)) {
                    const itemDateStr = item.fullData?.deliveredAt || item.fullData?.created_at || item.fullData?.sent_at;
                    if (itemDateStr) {
                        const itemDate = dayjs(itemDateStr);
                        const { from, to } = selectedFilters.date_range;
                        if (from && to) {
                            matchDate = itemDate.isBetween(dayjs(from).startOf('day'), dayjs(to).endOf('day'), null, '[]');
                        } else if (from) {
                            matchDate = itemDate.isAfter(dayjs(from).startOf('day')) || itemDate.isSame(dayjs(from).startOf('day'));
                        } else if (to) {
                            matchDate = itemDate.isBefore(dayjs(to).endOf('day')) || itemDate.isSame(dayjs(to).endOf('day'));
                        }
                    }
                }

                return matchStatus && matchLabel && matchLogTab && matchSearch && matchSender && matchDate;
            })
            .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    }, [internalNotifications, statusFilter, labelFilter, searchTerm, selectedFilters, logTab, variant]);
    const filteredCount = filteredNotifications.length;
    const totalPages = isServerPagination
        ? Math.max(1, serverPagination?.totalPages ?? 1)
        : Math.max(1, Math.ceil(filteredCount / itemsPerPage));

    useEffect(() => {
        if (!isServerPagination && currentPage > totalPages) {
            setCurrentPage(Math.max(totalPages, 1));
        }
    }, [currentPage, totalPages, isServerPagination]);

    useEffect(() => {
        if (!isServerPagination) {
            setCurrentPage(1);
        }
        setSelectAllAcrossPages(false);
    }, [statusFilter, labelFilter, searchTerm, itemsPerPage, isServerPagination]);

    // Handle role-based sender filter simplification
    const filterOptions = useMemo(() => {
        const options = {
            date_range: 'date',
        };

        if (showSenderFilter) {
            if (userRole === 'company') {
                // Simplify for company role
                options.sender_role = [
                    { value: 'admin', label: 'HEPZA (Admin)' },
                    { value: 'manager', label: 'Quản lý KCN/KCX (Manager)' }
                ];
            } else if (availableSenders.length > 0) {
                options.sender = availableSenders.map((s) => ({
                    value: s.user_id,
                    label: optionLabels.sender?.[s.user_id] || s.full_name,
                }));
            }
        }

        return options;
    }, [availableSenders, optionLabels, showSenderFilter, userRole]);

    const filterLabels = useMemo(() => ({
        ...FILTER_FIELD_LABELS,
        ...(userRole === 'company' ? { sender_role: 'Người gửi' } : {})
    }), [userRole]);

    const paginatedNotifications = useMemo(() => {
        if (isServerPagination) {
            return filteredNotifications;
        }
        const start = Math.max(currentPage - 1, 0) * itemsPerPage;
        return filteredNotifications.slice(start, start + itemsPerPage);
    }, [filteredNotifications, currentPage, itemsPerPage, isServerPagination]);
    const paginatedCount = paginatedNotifications.length;


    const toggleSelectAll = (e) => {
        setSelectAllAcrossPages(false);
        const pageIds = paginatedNotifications.map((item) => item.id);
        if (e.target.checked) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                pageIds.forEach((id) => next.add(id));
                return Array.from(next);
            });
        } else {
            setSelectedIds((prev) => {
                if (allFilteredSelected) {
                    return [];
                }
                return prev.filter((id) => !pageIds.includes(id));
            });
        }
    };

    const toggleSelectRow = (id) => {
        setSelectAllAcrossPages(false);
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const togglePin = (id) => {
        const target = internalNotifications.find((item) => item.id === id) || optimisticPinnedItems[id];
        if (!target) return;
        const nextPinnedState = !target.isPinned;

        setOptimisticPins((prev) => ({ ...prev, [id]: nextPinnedState }));
        setOptimisticPinnedItems((prev) => {
            if (nextPinnedState) {
                return { ...prev, [id]: target };
            }
            const next = { ...prev };
            delete next[id];
            return next;
        });

        setInternalNotifications((prev) => {
            const updated = prev.map((item) => (item.id === id ? { ...item, isPinned: nextPinnedState } : item));
            if (!nextPinnedState) {
                return updated;
            }
            const pinned = updated.filter((item) => item.isPinned);
            const unpinned = updated.filter((item) => !item.isPinned);
            return [...pinned, ...unpinned];
        });

        onTogglePin?.(id, nextPinnedState, target);

        if (nextPinnedState) {
            setCurrentPage(1);
            if (isServerPagination) {
                serverPagination?.onPageChange?.(1);
            }
        }
    };
    const pageItemIds = useMemo(() => paginatedNotifications.map((item) => item.id), [paginatedNotifications]);
    const selectedIdsOnPage = useMemo(() => selectedIds.filter((id) => pageItemIds.includes(id)), [selectedIds, pageItemIds]);
    const isAllSelected = pageItemIds.length > 0 && selectedIdsOnPage.length === pageItemIds.length;
    const isIndeterminate = selectedIdsOnPage.length > 0 && selectedIdsOnPage.length < pageItemIds.length;
    const totalFilteredCount = isServerPagination
        ? Math.max(serverPagination?.totalItems ?? filteredCount, filteredCount)
        : filteredCount;
    const allFilteredSelected = selectAllAcrossPages || (totalFilteredCount > 0 && selectedIds.length >= totalFilteredCount);

    const handleSelectAllFiltered = () => {
        setSelectedIds(filteredNotifications.map((item) => item.id));
        setSelectAllAcrossPages(true);
    };
    const markSelectedAsRead = (ids = selectedIds) => {
        if (ids.length === 0) return;
        setInternalNotifications((prev) =>
            prev.map((item) =>
                ids.includes(item.id) ? { ...item, isRead: true } : item
            )
        );

        if (onMarkAsRead) {
            onMarkAsRead(ids);
        }
    };
    const handlePageChange = (page) => {
        if (isServerPagination) {
            // The Pagination component is 0-indexed, but the server/parent page expects 1-indexed.
            serverPagination?.onPageChange?.(page + 1);
        } else {
            setCurrentPage(page + 1);
        }
    };

    const selectedDetailItem = showInlineDetail && selectedDetailId
        ? internalNotifications.find((item) => item.id === selectedDetailId) || null
        : null;
    const detailPayload = buildDetailPayload(selectedDetailItem, zones);
    const detailEnabled = Boolean(detailPayload);

    const handleDetailClose = () => setSelectedDetailId(null);
    const handleDetailTogglePin = (shouldPin) => {
        if (!selectedDetailItem) return;
        const detailId = selectedDetailItem.id;
        setInternalNotifications((prev) => prev.map((item) =>
            item.id === detailId ? { ...item, isPinned: shouldPin } : item
        ));
        const detailItem = internalNotifications.find((item) => item.id === detailId);
        onTogglePin?.(detailId, shouldPin, detailItem);
    };

    return (
        <div className="flex flex-col gap-0 h-full w-full flex-1 min-h-0 overflow-hidden">
            <section className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 h-full">
                {(isAllSelected || allFilteredSelected) && (
                    <div className="bg-[#E5E7EB] border-b border-[#E0E6FF] px-5 py-3 text-center text-sm text-[#3F4AB8]">
                        {allFilteredSelected ? (
                            <span>
                                Tất cả <span className="font-bold text-[#4E5BA6]">{totalFilteredCount}</span> thông báo trong danh sách này.
                            </span>
                        ) : (
                            <>
                                <span>
                                    Tất cả <span className="font-bold text-[#4E5BA6]">{pageItemIds.length}</span> thông báo trên trang này đã được chọn.
                                </span>
                                {totalFilteredCount > pageItemIds.length && (
                                    <>
                                        <span className="mx-1 text-[#8791E7]"></span>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllFiltered}
                                            className="inline-flex items-center justify-center font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                            <span className="underline underline-offset-2 cursor-pointer">Chọn tất cả</span>
                                            <span className="mx-1 font-bold text-indigo-600">{totalFilteredCount}</span>
                                            thông báo của bạn
                                        </button>

                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
                <header className="flex flex-col gap-2 border-b border-gray-100 px-5 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                        <div className="flex flex-shrink-0 items-center gap-2 text-sm">
                            <label className="inline-flex items-center gap-1.5">
                                <Checkbox
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    onChange={toggleSelectAll}
                                    color="primary"
                                    disableRipple
                                    sx={{
                                        p: 0,
                                        transform: 'scale(0.9)',
                                        '& .MuiSvgIcon-root': {
                                            fontSize: 20,
                                            borderRadius: '6px',
                                        },
                                    }}
                                />
                            </label>
                            <div><ChevronDown size={20} className='ml-[-5px] text-gray-400' /></div>
                            <div className="hidden min-[1675px]:flex items-center">
                                <IconButton
                                    icon={
                                        <span className="inline-flex items-center gap-1.5">
                                            <Trash2 size={20} />
                                            {selectedIds.length > 0 && (
                                                <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded-full bg-[#4E5BA6]/10 px-2 text-xs font-semibold text-[#4E5BA6]">
                                                    {selectedIds.length}
                                                </span>
                                            )}
                                        </span>
                                    }
                                    label="Xóa"
                                    variant="ghost"
                                    className={`ml-1 cursor-pointer ${selectedIds.length === 0 || !onDelete ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={() => handleDeleteClick(selectedIds)}
                                />
                                {variant !== 'sent-logs' && (
                                    <>
                                        <span className="mx-2 h-5 w-px bg-gray-200" />
                                        <IconButton
                                            icon={<MailOpen size={20} />}
                                            label="Đánh dấu đã đọc"
                                            variant="ghost"
                                            className={`cursor-pointer ${selectedIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                                            onClick={() => markSelectedAsRead()}
                                        />
                                    </>
                                )}
                            </div>

                            <div className="relative min-[1675px]:hidden" ref={bulkMenuRef}>
                                <IconButton
                                    icon={
                                        <span className="relative inline-flex items-center justify-center">
                                            <MoreVertical size={20} />
                                            {selectedIds.length > 0 && (
                                                <span className="absolute -top-2 -right-2 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#4E5BA6] px-1 text-[10px] font-semibold text-white">
                                                    {selectedIds.length}
                                                </span>
                                            )}
                                        </span>
                                    }
                                    label="Tác vụ"
                                    variant="ghost"
                                    className="ml-2 cursor-pointer"
                                    aria-expanded={isBulkMenuOpen}
                                    onClick={() => setIsBulkMenuOpen((prev) => !prev)}
                                />
                                {isBulkMenuOpen && (
                                    <div className="absolute left-0 top-full z-10 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 text-sm shadow-lg">
                                        <div className="flex flex-col gap-1">
                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleDeleteClick(selectedIds);
                                                    setIsBulkMenuOpen(false);
                                                }}
                                                className={
                                                    selectedIds.length === 0 || !onDelete
                                                        ? "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 opacity-50 pointer-events-none text-gray-400"
                                                        : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 text-gray-600"
                                                }
                                            >
                                                <span className="inline-flex items-center gap-2 font-medium">
                                                    <Trash2 size={18} className="text-gray-500" />
                                                    Xóa
                                                </span>
                                                {selectedIds.length > 0 && (
                                                    <span className="inline-flex h-5 min-w-[32px] items-center justify-center rounded-full bg-[#4E5BA6]/10 px-2 text-xs font-semibold text-[#4E5BA6]">
                                                        {selectedIds.length}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Mark Read Button (Inbox Only) */}
                                            {variant !== 'sent-logs' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        markSelectedAsRead();
                                                        setIsBulkMenuOpen(false);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-gray-600 transition hover:bg-gray-50"
                                                >
                                                    <span className="inline-flex items-center gap-2 font-medium">
                                                        <MailOpen size={18} className="text-gray-500" />
                                                        Đánh dấu đã đọc
                                                    </span>
                                                    {selectedIds.length > 0 && (
                                                        <span className="inline-flex h-5 min-w-[32px] items-center justify-center rounded-full bg-[#4E5BA6]/10 px-2 text-xs font-semibold text-[#4E5BA6]">
                                                            {selectedIds.length}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {variant !== 'sent-logs' && (
                                <div className="ml-5 flex items-center gap-10">
                                    {quickLabelFilters.map(({ value, icon: Icon, iconProps = {} }) => {
                                        const isActive = labelFilter === value;
                                        const iconPropsWithState = Icon
                                            ? {
                                                ...iconProps,
                                                className: [
                                                    iconProps?.className,
                                                    value === NOTIFICATION_LABELS.ALL && isActive ? '!text-[#4E5BA6]' : '',
                                                ].filter(Boolean).join(' ') || undefined,
                                            }
                                            : iconProps;
                                        return (
                                            <button
                                                key={`quick-${value}`}
                                                type="button"
                                                onClick={() => {
                                                    handleLabelFilterChange(value);
                                                    if (value === NOTIFICATION_LABELS.ALL) {
                                                        setStatusFilter('all');
                                                    }
                                                    setSelectedFilters((prev) => {
                                                        const next = { ...prev };
                                                        if (value === NOTIFICATION_LABELS.ALL) {
                                                            delete next.label;
                                                        } else {
                                                            next.label = [value];
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className={`group cursor-pointer relative inline-flex items-center gap-2 pb-1 text-base font-semibold transition-colors ${isActive ? 'text-[#4E5BA6]' : 'text-gray-400 hover:text-[#4E5BA6]'}`}
                                            >
                                                {Icon ? (
                                                    <Icon size={20} {...iconPropsWithState} />
                                                ) : (
                                                    <Tag size={20} />
                                                )}
                                                <span>{value}</span>
                                                <span
                                                    className={`absolute left-[-8px] right-[-8px] -bottom-[14px] h-[3px] rounded-full bg-[#4E5BA6] transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'}`}
                                                />
                                            </button>
                                        );
                                    })}
                                    {quickActionButtons && (
                                        <div className="flex items-center gap-3">
                                            {quickActionButtons}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex w-full flex-1 flex-wrap items-center justify-end gap-2">
                            {variant === 'sent-logs' ? (
                                !isManager && (
                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                                        {SENT_LOG_TABS.map((tab) => {
                                            const isActive = logTab === tab.key;
                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setLogTab(tab.key)}
                                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="hidden min-[1675px]:flex items-center gap-2">
                                    {STATUS_TABS.map((tab) => {
                                        const isActive = statusFilter === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setStatusFilter((prev) => (prev === tab.key ? 'all' : tab.key))}
                                                className={`flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors ${isActive ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]' : 'bg-[#4E5BA6]/10 text-gray-400'} hover:bg-gray-200`}
                                            >
                                                <span
                                                    className={`inline-flex h-4 items-center justify-center transition-all duration-150 ${isActive ? 'w-4' : 'w-0 overflow-hidden'}`}
                                                >
                                                    {isActive && <Check size={16} />}
                                                </span>
                                                <span className={`transition-all duration-150 ${isActive ? 'pl-1' : 'pl-0'}`}>
                                                    {tab.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {variant !== 'sent-logs' && (
                                <div className="relative min-[1675px]:hidden" ref={statusDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                                        aria-expanded={isStatusDropdownOpen}
                                        className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-gray-200 px-4 text-sm font-medium text-gray-600 transition-colors hover:border-[#4E5BA6] hover:text-[#4E5BA6]"
                                    >
                                        <span>{currentStatusLabel}</span>
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                    {isStatusDropdownOpen && (
                                        <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-gray-200 bg-white p-2 text-sm shadow-lg">
                                            <div className="flex flex-col gap-1">
                                                {STATUS_TABS.map((tab) => {
                                                    const isActive = statusFilter === tab.key;
                                                    return (
                                                        <button
                                                            key={`dropdown-${tab.key}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setStatusFilter(tab.key);
                                                                setIsStatusDropdownOpen(false);
                                                            }}
                                                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${isActive ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]' : 'text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <span>{tab.label}</span>
                                                            {isActive && <Check size={16} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {Object.keys(filterOptions).length > 0 && (
                                <ButtonFilter
                                    onFilter={onSelectedFiltersChange}
                                    filterOptions={filterOptions}
                                    fieldLabels={filterLabels}
                                    optionLabels={optionLabels}
                                    selectedFilters={selectedFilters}
                                    setSelectedFilters={setSelectedFilters}
                                    singleSelectFields={['sender_role', 'sender']}
                                />
                            )}
                            {enableLocalSearch && (
                                <SearchBox
                                    placeholder="Người gửi, tiêu đề, nội dung..."
                                    onSearch={(value) => setSearchTerm(value)}
                                    debounceDelay={200}
                                    rootClassName="max-w-[210px] min-[1675px]:max-w-xs"
                                    className="!border-gray-200 !bg-gray-50"
                                />
                            )}
                            {extraToolbarContent && (
                                <div className="flex items-center">
                                    {extraToolbarContent}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 min-h-0 h-full flex flex-col">
                    <div className="flex flex-col gap-4 flex-1 h-full min-h-0">
                        {!detailEnabled ? (
                            <div className="w-full min-w-0 flex-1 overflow-y-auto">
                                <div className="divide-y divide-gray-100 overflow-hidden min-h-0">
                                    {loading ? (
                                        <div className="flex h-40 items-center justify-center text-gray-500 text-sm">
                                            Đang tải danh sách thông báo...
                                        </div>
                                    ) : filteredNotifications.length === 0 ? (
                                        <div className="flex h-40 items-center justify-center text-gray-400 text-sm">
                                            Không có thông báo phù hợp.
                                        </div>
                                    ) : (
                                        paginatedNotifications.map((item) => {
                                            const isSelected = selectedIds.includes(item.id);
                                            const isUnread = !item.isRead;
                                            const payload = buildDetailPayload(item, zones);
                                            const isSentVariant = variant === 'sent-logs';

                                            const rowClass = (() => {
                                                const baseSelected = 'bg-[#4E5BA6]/10 hover:bg-[#4E5BA6]/20';
                                                if (showInlineDetail && selectedDetailId === item.id) {
                                                    return baseSelected;
                                                }
                                                if (isSelected) {
                                                    return baseSelected;
                                                }
                                                if (item.isPinned) {
                                                    return 'bg-[#4E5BA6]/20 hover:bg-[#4E5BA6]/30';
                                                }
                                                if (isUnread) {
                                                    return 'bg-white hover:bg-[#4E5BA6]/5';
                                                }
                                                return 'bg-[#F5F5F5]/60 hover:bg-[#F5F5F5]';
                                            })();

                                            if (isSentVariant) {
                                                return (
                                                    <article
                                                        key={item.id}
                                                        className={`group flex w-full flex-wrap items-center gap-4 px-5 py-4 text-sm transition-all hover:bg-gray-50/50 border-b border-gray-50 last:border-0 ${rowClass} cursor-pointer`}
                                                        onClick={() => {
                                                            if (showInlineDetail) {
                                                                setSelectedDetailId((prevId) => (prevId === item.id ? null : item.id));
                                                            } else {
                                                                onRowClick?.(item);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectRow(item.id)}
                                                                color="primary"
                                                                disableRipple
                                                            />
                                                        </div>

                                                        {/* Main Info */}
                                                        <div className="flex flex-col min-w-0 flex-[2]">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[11px] font-bold text-[#4E5BA6] bg-[#4E5BA6]/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                    ID: {payload.logId?.slice(-6) || '...'}
                                                                </span>
                                                                <span className="text-[12px] font-medium text-gray-400">
                                                                    {payload.templateName}
                                                                </span>
                                                            </div>
                                                            <p className="font-bold text-gray-900 truncate text-[15px]" title={payload.title}>
                                                                {payload.title}
                                                            </p>
                                                        </div>

                                                        {/* Target Info */}
                                                        <div className="flex flex-col flex-[1.5] min-w-0">
                                                            <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">Đối tượng nhận</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {payload.targetCompanies.length > 0 ? (
                                                                    <span className="text-[13px] text-indigo-600 font-bold" title={payload.targetCompanies.join(', ')}>
                                                                        {payload.targetCompanies.length} Doanh nghiệp
                                                                    </span>
                                                                ) : payload.targetZones.length > 0 ? (
                                                                    <span className="text-[13px] text-gray-600 truncate font-medium">
                                                                        {payload.targetZones.join(', ')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[13px] text-gray-600 font-medium">
                                                                        {payload.targetRoles.length > 0 ? payload.targetRoles.map(r => r === 'company' ? 'Doanh nghiệp' : r === 'manager' ? 'Ban quản lý' : r).join(', ') : 'Toàn hệ thống'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Sender & Reach */}
                                                        <div className="flex items-center gap-8 shrink-0 ml-auto">
                                                            <div className="flex flex-col items-start w-[200px] shrink-0">
                                                                <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">Người gửi</p>
                                                                <div className="flex flex-col items-start gap-1 w-full">
                                                                    <span className="text-[13px] font-bold text-gray-700 w-full truncate text-left" title={payload.sender}>{payload.sender}</span>
                                                                    {payload.senderRoleLabel && (
                                                                        <span className={clsx(
                                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap text-left inline-block max-w-full truncate",
                                                                            payload.senderRole === 'admin'
                                                                                ? "bg-indigo-100 text-indigo-700"
                                                                                : "bg-emerald-100 text-emerald-700"
                                                                        )} title={payload.senderRoleLabel}>
                                                                            {payload.senderRoleLabel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center min-w-[60px]">
                                                                <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5 text-center w-full">Đã nhận</p>
                                                                <span className="text-[14px] font-black text-[#4E5BA6] bg-[#4E5BA6]/5 px-2.5 py-1 rounded-lg">
                                                                    {payload.totalRecipients}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col items-end min-w-[80px]">
                                                                <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">Thời gian</p>
                                                                <span className="text-[12px] font-medium text-gray-500">{item.time}</span>
                                                            </div>

                                                            <div className="flex items-center self-center">
                                                                <IconButton
                                                                    icon={<Trash2 size={16} />}
                                                                    label="Xóa log"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick([item.id]);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 border-none bg-transparent"
                                                                />
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            }

                                            return (
                                                <article
                                                    key={item.id}
                                                    className={`flex w-full flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors ${rowClass} ${(showInlineDetail || onRowClick) ? 'cursor-pointer' : ''}`}
                                                    onClick={(event) => {
                                                        if (event.target.closest('button') || event.target.closest('.MuiCheckbox-root')) return;
                                                        if (!item.isRead) {
                                                            markSelectedAsRead([item.id]);
                                                        }
                                                        if (showInlineDetail) {
                                                            setSelectedDetailId((prevId) => (prevId === item.id ? null : item.id));
                                                        } else {
                                                            onRowClick?.(item);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectRow(item.id)}
                                                            color="primary"
                                                            disableRipple
                                                            sx={{
                                                                p: 0,
                                                                transform: 'scale(0.9)',
                                                                '& .MuiSvgIcon-root': {
                                                                    fontSize: 20,
                                                                    borderRadius: '6px',
                                                                },
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="flex min-w-0 flex-1 items-stretch gap-3">
                                                        <div className={`${variant === 'default' ? 'w-40' : 'w-32'} min-w-0 flex flex-col justify-center ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`} title={payload.sender}>
                                                            <div className="flex flex-col items-start gap-1 w-full">
                                                                <span className="whitespace-normal leading-tight text-sm w-full">{payload.sender}</span>
                                                                {(userRole === 'company' || userRole === 'manager') && payload.senderRoleLabel && (
                                                                    <span className={clsx(
                                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-normal leading-tight inline-block",
                                                                        payload.senderRole === 'admin'
                                                                            ? "bg-indigo-100 text-indigo-700"
                                                                            : "bg-emerald-100 text-emerald-700"
                                                                    )}
                                                                        style={{ wordBreak: 'break-word' }}>
                                                                        {payload.senderRoleLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={`flex min-w-0 flex-1 items-center justify-start gap-2 text-left ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                            <div className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                                                                <span
                                                                    className={`truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                                                                    style={{ flex: '0 1 auto' }}
                                                                    title={payload.title}
                                                                >
                                                                    {payload.title}
                                                                </span>
                                                            </div>
                                                            {item.label === 'Cảnh báo' && (
                                                                <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-[#FAB403] bg-[#FAB403]/40 px-3 py-0.5 text-xs font-semibold text-[#DD8800] whitespace-nowrap">
                                                                    {item.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="ml-auto flex items-center gap-3 text-xs font-medium text-gray-500">
                                                        <span>{item.time}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePin(item.id)}
                                                            className={`transition-colors ${item.isPinned ? 'text-[#4E5BA6]' : 'text-gray-300 hover:text-[#4E5BA6] cursor-pointer'}`}
                                                            aria-label={item.isPinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo'}
                                                        >
                                                            <Pin size={16} className={item.isPinned ? 'fill-current cursor-pointer' : undefined} />
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <PanelGroup direction="horizontal" className="flex flex-1 min-h-0">
                                <Panel defaultSize={50} minSize={30}>
                                    <div className="w-full min-w-0 h-full overflow-y-auto">
                                        <div className="divide-y divide-gray-100 overflow-hidden min-h-0">
                                            {loading ? (
                                                <div className="flex h-40 items-center justify-center text-gray-500 text-sm">
                                                    Đang tải danh sách thông báo...
                                                </div>
                                            ) : filteredNotifications.length === 0 ? (
                                                <div className="flex h-40 items-center justify-center text-gray-400 text-sm">
                                                    Không có thông báo phù hợp.
                                                </div>
                                            ) : (
                                                paginatedNotifications.map((item) => {
                                                    const isSelected = selectedIds.includes(item.id);
                                                    const isUnread = !item.isRead;
                                                    const payload = buildDetailPayload(item, zones);
                                                    const isSentVariant = variant === 'sent-logs';

                                                    const rowClass = (() => {
                                                        const baseSelected = 'bg-[#4E5BA6]/10 hover:bg-[#4E5BA6]/20';
                                                        if (showInlineDetail && selectedDetailId === item.id) {
                                                            return baseSelected;
                                                        }
                                                        if (isSelected) {
                                                            return baseSelected;
                                                        }
                                                        if (item.isPinned) {
                                                            return 'bg-[#4E5BA6]/20 hover:bg-[#4E5BA6]/30';
                                                        }
                                                        if (isUnread) {
                                                            return 'bg-white hover:bg-[#4E5BA6]/5';
                                                        }
                                                        return 'bg-[#F5F5F5]/60 hover:bg-[#F5F5F5]';
                                                    })();

                                                    if (isSentVariant) {
                                                        return (
                                                            <article
                                                                key={item.id}
                                                                className={`flex w-full flex-col gap-1 px-4 py-3 text-sm transition-colors border-b border-gray-50 ${rowClass} cursor-pointer group`}
                                                                onClick={(event) => {
                                                                    if (event.target.closest('button') || event.target.closest('.MuiCheckbox-root')) return;
                                                                    setSelectedDetailId((prevId) => (prevId === item.id ? null : item.id));
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onChange={() => toggleSelectRow(item.id)}
                                                                            color="primary"
                                                                            disableRipple
                                                                            sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 18 } }}
                                                                        />
                                                                        <span className="font-bold text-gray-900 truncate" title={payload.title}>{payload.title}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{item.time}</span>
                                                                </div>

                                                                <div className="pl-6 flex flex-wrap gap-1.5 items-center">
                                                                    <span className="text-[10px] font-bold text-[#4E5BA6] bg-[#4E5BA6]/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                        ID: {payload.logId || '...'}
                                                                    </span>
                                                                    {payload.senderId && (
                                                                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                            UID: {payload.senderId}
                                                                        </span>
                                                                    )}
                                                                    {payload.targetCompanies.length > 0 && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100" title={payload.targetCompanies.join(', ')}>
                                                                            {payload.targetCompanies.length} DN
                                                                        </span>
                                                                    )}
                                                                    {payload.targetZones.length > 0 && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                            {payload.targetZones.length} KCN/KCX
                                                                        </span>
                                                                    )}
                                                                    <span className="text-gray-400 text-[10px] font-medium ml-auto">
                                                                        Đã nhận: <span className="text-indigo-600 font-bold">{payload.totalRecipients.toLocaleString()}</span>
                                                                    </span>
                                                                </div>
                                                            </article>
                                                        );
                                                    }

                                                    return (
                                                        <article
                                                            key={item.id}
                                                            className={`flex w-full flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors ${rowClass} ${(showInlineDetail || onRowClick) ? 'cursor-pointer' : ''}`}
                                                            onClick={(event) => {
                                                                if (event.target.closest('button') || event.target.closest('.MuiCheckbox-root')) return;
                                                                if (!item.isRead) {
                                                                    markSelectedAsRead([item.id]);
                                                                }
                                                                if (showInlineDetail) {
                                                                    setSelectedDetailId((prevId) => (prevId === item.id ? null : item.id));
                                                                } else {
                                                                    onRowClick?.(item);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                    color="primary"
                                                                    disableRipple
                                                                    sx={{
                                                                        p: 0,
                                                                        transform: 'scale(0.9)',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: 20,
                                                                            borderRadius: '6px',
                                                                        },
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="flex min-w-0 flex-1 items-stretch gap-3">
                                                                <div className={`${variant === 'default' ? 'w-40' : 'w-32'} min-w-0 flex flex-col justify-center ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`} title={payload.sender}>
                                                                    <div className="flex flex-col items-start gap-1 w-full">
                                                                        <span className="whitespace-normal leading-tight text-sm w-full">{payload.sender}</span>
                                                                        {(userRole === 'company' || userRole === 'manager') && payload.senderRoleLabel && (
                                                                            <span className={clsx(
                                                                                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-normal leading-tight inline-block",
                                                                                payload.senderRole === 'admin'
                                                                                    ? "bg-indigo-100 text-indigo-700"
                                                                                    : "bg-emerald-100 text-emerald-700"
                                                                            )}
                                                                                style={{ wordBreak: 'break-word' }}>
                                                                                {payload.senderRoleLabel}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`flex min-w-0 flex-1 items-center justify-start gap-2 text-left ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                                    <div className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                                                                        <span
                                                                            className={`truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                                                                            style={{ flex: '0 1 auto' }}
                                                                            title={payload.title}
                                                                        >
                                                                            {payload.title}
                                                                        </span>
                                                                    </div>
                                                                    {item.label === 'Cảnh báo' && (
                                                                        <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-[#FAB403] bg-[#FAB403]/40 px-3 py-0.5 text-xs font-semibold text-[#DD8800] whitespace-nowrap">
                                                                            {item.label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="ml-auto flex items-center gap-3 text-xs font-medium text-gray-500">
                                                                <span>{item.time}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePin(item.id)}
                                                                    className={`transition-colors ${item.isPinned ? 'text-[#4E5BA6]' : 'text-gray-300 hover:text-[#4E5BA6] cursor-pointer'}`}
                                                                    aria-label={item.isPinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo'}
                                                                >
                                                                    <Pin size={16} className={item.isPinned ? 'fill-current cursor-pointer' : undefined} />
                                                                </button>
                                                            </div>
                                                        </article>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </Panel>
                                <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors min-h-full self-stretch" />
                                <Panel defaultSize={50} minSize={30}>
                                    {detailEnabled && detailPayload && (
                                        <div className="w-full min-w-0 h-full overflow-y-auto">
                                            <div className="flex h-full flex-col overflow-hidden bg-white shadow-sm">
                                                <div className="h-full overflow-y-auto">
                                                    <NotificationDetail
                                                        notification={detailPayload}
                                                        onBack={handleDetailClose}
                                                        onDelete={() => {
                                                            if (onDelete && detailPayload?.id) {
                                                                handleDeleteClick([detailPayload.id]);
                                                            }
                                                        }}
                                                        onTogglePin={handleDetailTogglePin}
                                                        className="h-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Panel>
                            </PanelGroup>
                        )}
                    </div>
                </div>
            </section>
            <div className="flex-shrink-0">
                <Pagination currentPage={currentPage - 1} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            <ConfirmationModal
                open={deleteConfirmation.open}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title={deleteConfirmation.type === 'single' ? 'Xóa thông báo' : 'Xóa nhiều thông báo'}
                content={
                    deleteConfirmation.type === 'single'
                        ? 'Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.'
                        : `Bạn có chắc chắn muốn xóa ${deleteConfirmation.ids.length} thông báo đã chọn? Hành động này không thể hoàn tác.`
                }
                confirmText="Xóa"
                confirmType="danger"
            />
        </div>
    );
};

// IconButton moved to top

export default NotificationTable;
