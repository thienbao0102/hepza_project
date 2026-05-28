import { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Clock,
    Trash2,
    Eye,
    Pause,
    Play,
    AlertCircle,
    Info as InfoIcon,
    ArrowRight,
    Pointer,
    Users,
    Send,
    ChevronLeft,
    ChevronRight,
    Settings2,
    Fingerprint,
    Zap,
    CalendarCheck,
    RefreshCcw,
    Pencil
} from 'lucide-react';

import {
    useTemplates,
    useHardDeleteTemplate,
    useSendTemplateNotification,
    useDisableTemplate,
    useRestoreTemplate
} from '../hooks/useNotificationTemplate';
import dayjs from 'dayjs';
import toast from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/auth/AuthProvider';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const ITEMS_PER_PAGE = 9;

// Utilities
const formatCronToText = (cron) => {
    if (!cron) return 'Không xác định';
    if (cron === '0 8 * * *') return 'Hàng ngày lúc 08:00';
    if (cron === '0 8 * * 1') return 'Thứ Hai hàng tuần lúc 08:00';
    if (cron === '0 8 1 * *') return 'Ngày 1 hàng tháng lúc 08:00';

    // Fallback for custom crons
    const parts = cron.split(' ');
    if (parts.length === 5) {
        const [min, hour, dom, mon, dow] = parts;
        const formattedHour = hour.padStart(2, '0');
        const formattedMin = min.padStart(2, '0');

        let normDom = dom.replace('*/1', '*');
        let normMon = mon.replace('*/1', '*');
        let normDow = dow.replace('*/1', '*');

        let desc = `Lúc ${formattedHour}:${formattedMin}`;
        if (normDom !== '*' && normMon !== '*') {
            desc += ` ${normDom.includes('*/') ? 'mỗi ' + normDom.replace('*/', '') + ' ngày' : 'ngày ' + normDom}`;
            desc += ` ${normMon.includes('*/') ? 'mỗi ' + normMon.replace('*/', '') + ' tháng' : 'tháng ' + normMon}`;
        }
        else if (normDom !== '*') {
            desc += ` ${normDom.includes('*/') ? 'mỗi ' + normDom.replace('*/', '') + ' ngày' : 'ngày ' + normDom + ' hàng tháng'}`;
        }
        else if (normDow !== '*') {
            desc += ` ${normDow.includes('*/') ? 'mỗi ' + normDow.replace('*/', '') + ' tuần' : 'Thứ ' + (parseInt(normDow) + 1) + ' hàng tuần'}`;
        }
        else {
            desc += ' hàng ngày';
        }

        return desc;
    }
    return cron;
};

const getTargetSummary = (target) => {
    if (!target) return 'Tất cả';
    if (target.mode === 'DYNAMIC') {
        return 'DN chưa báo cáo (tự động)';
    }    if (target.mode === 'STATIC') {
        const roles = target.roles?.map(r => {
            if (r === 'admin') return 'Admin';
            if (r === 'manager') return 'BQL';
            if (r === 'company') return 'Doanh nghiệp';
            return r;
        }) || [];

        const hasSpecificCompanies = target.company_ids?.length > 0;
        const hasSpecificZones = target.zone_ids?.length > 0;

        if (hasSpecificCompanies) return `${target.company_ids.length} DN cụ thể`;
        if (hasSpecificZones) return `${roles.join(', ')} (${target.zone_ids.length} KCN/KCX)`;
        if (roles.length > 0) return roles.join(', ');
        return 'Tất cả đối tượng';
    }
    return 'Tất cả';
};

const SCHEDULE_TYPE_CONFIG = {
    MANUAL: {
        label: 'Thủ công',
        icon: Fingerprint,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
    },
    IMMEDIATE: {
        label: 'Tức thì',
        icon: Zap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    ONE_TIME: {
        label: 'Gửi 1 lần',
        icon: CalendarCheck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
    },
    RECURRING: {
        label: 'Lặp lại',
        icon: RefreshCcw,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
    },
};

const TemplatesTab = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const maxTemplates = isAdmin ? 10 : 5;

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, manual, running, paused

    // Data Hooks
    const { data, isLoading } = useTemplates({
        page,
        limit: ITEMS_PER_PAGE,
    });

    const deleteMutation = useHardDeleteTemplate();
    const disableMutation = useDisableTemplate();
    const restoreMutation = useRestoreTemplate();
    const sendMutation = useSendTemplateNotification();

    // Confirmation Modal States
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        title: '',
        content: '',
        onConfirm: () => { },
        type: 'primary',
    });

    const allTemplates = data?.templates || [];
    const totalItemsCount = data?.totalItems || 0;

    // Filter Logic (Client-side search/filter on top of paginated backend data)
    // Note: Backend doesn't support filtering yet, so we apply it to the visible batch.
    const filteredTemplates = useMemo(() => {
        let result = allTemplates;

        // Search
        if (searchTerm) {
            result = result.filter(t =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status Tabs
        if (activeFilter === 'manual') {
            result = result.filter(t => ['MANUAL', 'IMMEDIATE'].includes(t.schedule?.type));
        } else if (activeFilter === 'running') {
            result = result.filter(t => t.isActive && ['RECURRING', 'ONE_TIME'].includes(t.schedule?.type));
        } else if (activeFilter === 'paused') {
            result = result.filter(t => !t.isActive && ['RECURRING', 'ONE_TIME'].includes(t.schedule?.type));
        }

        return result;
    }, [allTemplates, searchTerm, activeFilter]);

    // Handlers
    const handleDelete = (e, id, name) => {
        e.stopPropagation();
        setConfirmModal({
            open: true,
            title: 'Xác nhận xóa mẫu',
            content: `Bạn có chắc muốn xóa vĩnh viễn mẫu "${name}"? Thao tác này không thể hoàn tác.`,
            confirmType: 'danger',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(id);
                    toast.success('Thành công', 'Đã xóa mẫu thông báo');
                } catch (err) {
                    toast.error('Lỗi', err.message);
                }
            }
        });
    };

    const handleToggleStatus = async (e, template) => {
        e.stopPropagation();
        const isCurrentlyActive = template.isActive !== false;
        try {
            if (isCurrentlyActive) {
                await disableMutation.mutateAsync(template.notification_T_id);
                toast.success('Đã tạm dừng', `Lịch gửi mẫu "${template.name}" đã được dừng.`);
            } else {
                await restoreMutation.mutateAsync(template.notification_T_id);
                toast.success('Đã kích hoạt', `Lịch gửi mẫu "${template.name}" đã hoạt động trở lại.`);
            }
        } catch (err) {
            toast.error('Thất bại', err.message);
        }
    };

    const handleQuickSend = (e, template) => {
        e.stopPropagation();
        if (sendMutation.isPending) return;

        setConfirmModal({
            open: true,
            title: 'Xác nhận gửi',
            content: `Bạn có chắc chắn muốn gửi thông báo bằng mẫu "${template.name}" đến các đối tượng mục tiêu đã chọn không?`,
            confirmType: 'primary',
            onConfirm: async () => {
                try {
                    await sendMutation.mutateAsync({
                        templateId: template.notification_T_id,
                        target: template.target
                    });
                    toast.success('Đã xử lý', 'Thông báo đã được đưa vào hàng đợi gửi.');
                } catch (err) {
                    toast.error('Lỗi gửi', err.message);
                }
            }
        });
    };

    const handleViewDetail = (template) => {
        const detailPath = isAdmin ? `/admin/notifications/detail/${template.notification_T_id}` : `/manager/notifications/detail/${template.notification_T_id}`;
        navigate(detailPath, { state: { template, mode: 'VIEW' } });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="size-12 animate-spin rounded-full border-[3px] border-[#4E5BA6] border-t-transparent shadow-sm"></div>
                <p className="mt-4 font-bold tracking-tight animate-pulse">Đang chuẩn bị dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Bar: Stats & Search */}
            <div className="shrink-0 bg-white rounded-2xl p-2 pr-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
                {/* Stats Badge */}
                <div className="flex items-center gap-4 bg-slate-50 py-3 px-6 rounded-xl border border-slate-100 flex-1 md:flex-none">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-400 tracking-widest">Số lượng mẫu</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-slate-800 tracking-tighter">{totalItemsCount}</span>
                            <span className="text-slate-300 font-medium">/</span>
                            <span className="text-slate-500 font-bold">{maxTemplates} mẫu tối đa</span>
                        </div>
                    </div>
                    {/* Visual Progress Dot */}
                    <div className="size-12 relative flex items-center justify-center">
                        <svg className="size-full transform -rotate-90">
                            <circle cx="24" cy="24" r="18" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-200" />
                            <circle
                                cx="24" cy="24" r="18" fill="transparent" stroke="currentColor" strokeWidth="4"
                                className={`${totalItemsCount >= maxTemplates ? 'text-rose-500' : 'text-[#4E5BA6]'} transition-all duration-700 ease-out`}
                                strokeDasharray={113}
                                strokeDashoffset={113 - (113 * Math.min(totalItemsCount / maxTemplates, 1))}
                            />
                        </svg>
                        <Settings2 className="absolute size-4 text-slate-400" />
                    </div>
                </div>

                {/* Sub-tabs for Filtering Status */}
                <div className="flex items-center bg-slate-100/60 p-1.5 rounded-xl border border-slate-100 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'manual', label: 'Thủ công' },
                        { id: 'running', label: 'Đang chạy' },
                        { id: 'paused', label: 'Đã dừng' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveFilter(tab.id); setPage(1); }}
                            className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${activeFilter === tab.id
                                ? 'bg-white text-[#4E5BA6] shadow-sm ring-1 ring-slate-200/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-3 ml-auto w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-[#4E5BA6] transition-colors" />
                        <input
                            type="text"
                            placeholder="Mã/Tên/Nội dung..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:ring-4 focus:ring-[#4E5BA6]/5 focus:border-[#4E5BA6] focus:bg-white transition-all"
                        />
                    </div>
                    <button
                        onClick={() => navigate(isAdmin ? '/admin/notifications/create' : '/manager/notifications/create')}
                        disabled={totalItemsCount >= maxTemplates}
                        className="p-3 bg-[#4E5BA6] text-white rounded-xl shadow-md shadow-indigo-200/50 hover:bg-[#3D4A8F] transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                        title="Thêm mẫu mới"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 no-scrollbar flex flex-col">
                {filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map((template) => {
                            const scheduleConfig = SCHEDULE_TYPE_CONFIG[template.schedule?.type] || SCHEDULE_TYPE_CONFIG.MANUAL;
                            const SchedIcon = scheduleConfig.icon;
                            const isWarning = template.type === 'Warning';
                            const isActive = template.isActive !== false;
                            const isAuto = ['RECURRING', 'ONE_TIME'].includes(template.schedule?.type);
                            const isManual = ['MANUAL', 'IMMEDIATE'].includes(template.schedule?.type);
                            const isOneTimeExpired = !isActive && template.schedule?.type === 'ONE_TIME' && template.schedule?.sendAt && dayjs(template.schedule.sendAt).isBefore(dayjs());

                            return (
                                <div
                                    key={template.notification_T_id}
                                    onClick={() => handleViewDetail(template)}
                                    className={`group relative bg-white border border-slate-200/80 rounded-[22px] p-5 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 hover:shadow-lg ${!isActive ? 'bg-slate-50/70 border-slate-300/40 opacity-90' : 'shadow-sm'
                                        }`}
                                >
                                    {/* Minimal Accent Line */}
                                    <div className={`absolute top-10 left-0 w-1 rounded-r-full h-12 transition-all group-hover:h-16 group-hover:w-1.5 ${!isActive ? 'bg-slate-300' : isWarning ? 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.3)]' : 'bg-[#4E5BA6] shadow-[0_0_10px_rgba(78,91,166,0.3)]'}`} />

                                    {/* Header: Icons & Status badges */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${scheduleConfig.color} ${scheduleConfig.bgColor} border-current/10`}>
                                            <SchedIcon size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">{scheduleConfig.label}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isAuto && (
                                                isOneTimeExpired ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const detailPath = isAdmin ? `/admin/notifications/detail/${template.notification_T_id}` : `/manager/notifications/detail/${template.notification_T_id}`;
                                                            navigate(detailPath, { state: { template, mode: 'EDIT' } });
                                                        }}
                                                        className="p-2.5 rounded-xl border transition-all active:scale-90 shadow-sm bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                                                        title="Gia hạn thời gian gửi"
                                                    >
                                                        <Pencil size={20} fill="none" strokeWidth={2.5} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => handleToggleStatus(e, template)}
                                                        className={`p-2.5 rounded-xl border transition-all active:scale-90 shadow-sm ${isActive ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                                                        title={isActive ? "Tạm dừng" : "Tiếp tục"}
                                                    >
                                                        {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                                    </button>
                                                )
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(e, template.notification_T_id, template.name)}
                                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 border border-slate-100 bg-white rounded-xl transition-all shadow-sm group-hover:border-rose-200"
                                                title="Xóa mẫu"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Title & Category */}
                                    <div className="mb-4">
                                        <h4 className={`text-xl font-extrabold tracking-tight leading-tight line-clamp-1 group-hover:text-[#4E5BA6] transition-colors ${!isActive ? 'text-slate-400' : 'text-slate-800'}`}>
                                            {template.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isWarning ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                                {isWarning ? 'CẢNH BÁO' : 'THÔNG TIN'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Body Info Grid */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1 bg-slate-50 rounded-lg">
                                                <Users size={14} className="text-slate-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Người nhận</span>
                                                <span className="text-[13px] font-bold text-slate-600 line-clamp-1">{getTargetSummary(template.target)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1 bg-slate-50 rounded-lg">
                                                <Clock size={14} className="text-slate-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Lịch gửi</span>
                                                <span className="text-[13px] font-bold text-slate-600">
                                                    {template.schedule?.type === 'RECURRING'
                                                        ? formatCronToText(template.schedule.cronString)
                                                        : template.schedule?.type === 'ONE_TIME'
                                                            ? dayjs(template.schedule.sendAt).format('HH:mm DD/MM/YYYY')
                                                            : 'Gửi thủ công'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
                                        <div className="bg-[#4E5BA6]/5 text-[#4E5BA6] px-4 py-2 rounded-xl text-xs font-bold transition-all group-hover:bg-[#4E5BA6] group-hover:text-white">
                                            Xem chi tiết
                                        </div>

                                        {isManual && (
                                            <button
                                                onClick={(e) => handleQuickSend(e, template)}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-90"
                                            >
                                                <Send size={14} />
                                                GỬI NGAY
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-16 bg-white rounded-2xl border-2 border-dashed border-slate-100 italic text-slate-300">
                        <AlertCircle size={40} className="mb-4 text-slate-200" />
                        <p className="text-lg font-medium">Không tìm thấy mẫu phù hợp với bộ lọc hiện tại</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {data?.totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-between bg-white/50 p-2 pl-6 rounded-2xl border border-slate-100 shadow-sm mt-2">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Trang {page} / {data.totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-3 rounded-xl border border-slate-100 text-slate-400 bg-white hover:text-[#4E5BA6] hover:border-[#4E5BA6]/30 disabled:opacity-30 disabled:grayscale transition-all"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </button>
                        <button
                            disabled={page === data.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-3 rounded-xl border border-slate-100 text-slate-400 bg-white hover:text-[#4E5BA6] hover:border-[#4E5BA6]/30 disabled:opacity-30 disabled:grayscale transition-all"
                        >
                            <ChevronRight size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            <ConfirmationModal
                open={confirmModal.open}
                onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                content={confirmModal.content}
                confirmType={confirmModal.confirmType}
            />
        </div>
    );
};

export default TemplatesTab;
