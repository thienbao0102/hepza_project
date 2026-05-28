import { memo, useState } from 'react';
import { Trash2, Pin, PinOff, X, ChevronDown, Building2, Mail, Circle, Paperclip } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/app/providers/auth/AuthProvider';

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const toneClasses = {
    warning: 'bg-[#FFF8E6] text-[#B17400]',
    info: 'bg-[#E9F2FF] text-[#1D63C4]',
    success: 'bg-[#E6F4EA] text-[#0F8A4B]',
};

const NotificationDetail = ({
    notification = {},
    onBack,
    onDelete,
    onTogglePin,
    className,
}) => {
    const { user } = useAuth();
    const isCompany = user?.role === 'company';
    const [showMetaPanel, setShowMetaPanel] = useState(false);
    const {
        title,
        label,
        labelTone = 'warning',
        sender,
        senderSub,
        recipient,
        recipientCompany,
        body = [],
        bodyIsHtml = false,
        datetime,
        relativeTime,
        isPinned,
        isSentLog,
        totalRecipients = 0,
        targetRoles = [],
        targetZones = [],
        targetCompanies = [],
        isSpecificTarget = false,
        attachments = [],
    } = notification;

    const displaySender = sender || 'HEPZA';
    const recipientLine = recipient
        ? `Tới ${recipient}${recipientCompany ? ` đại diện của ${recipientCompany}` : ''}`
        : senderSub || '';

    return (
        <div className={clsx('flex h-full flex-col bg-slate-50/50', className)}>
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm sticky top-0 z-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                {label && (
                                    <span className={clsx(
                                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ring-inset',
                                        label === 'Cảnh báo'
                                            ? 'bg-red-50 text-red-700 ring-red-600/20'
                                            : 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                                    )}>
                                        {label}
                                    </span>
                                )}
                                {isSentLog && (
                                    <span className="text-[11px] font-bold text-[#4E5BA6] bg-[#4E5BA6]/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                        ID: {notification.logId || notification.id?.substring(0, 12)}
                                    </span>
                                )}
                                {notification.templateName && isSentLog && (
                                    <span className="text-[11px] font-medium text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                                        Mẫu: {notification.templateName}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                                {title}
                            </h2>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5 font-medium">
                                    {displaySender}
                                    {notification.senderRoleLabel && (
                                        <span className={clsx(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 whitespace-normal leading-tight inline-block",
                                            notification.senderRole === 'admin' 
                                                ? "bg-indigo-100 text-indigo-700" 
                                                : "bg-emerald-100 text-emerald-700"
                                        )}
                                        style={{ wordBreak: 'break-word' }}>
                                            {notification.senderRoleLabel}
                                        </span>
                                    )}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>{datetime}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!isSentLog && (
                                <button
                                    type="button"
                                    onClick={() => onTogglePin?.(!isPinned)}
                                    className={clsx(
                                        'p-2.5 rounded-xl border-2 transition-all active:scale-95',
                                        isPinned
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                                    )}
                                    title={isPinned ? 'Bỏ ghim' : 'Ghim'}
                                >
                                    {isPinned ? <PinOff size={18} className="fill-current" /> : <Pin size={18} />}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2.5 rounded-xl border-2 border-slate-100 bg-white text-slate-400 hover:border-red-100 hover:text-red-500 transition-all active:scale-95 shadow-sm"
                                title="Xóa"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2.5 rounded-xl border-2 border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-900 transition-all lg:hidden"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Engagement Stats Banner - SENT LOGS ONLY */}
                    {isSentLog && (
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-100 mb-1">Tổng người nhận</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black">{totalRecipients}</span>
                                        <span className="text-sm font-medium mb-1 text-indigo-100">người đã nhận thông báo</span>
                                    </div>
                                </div>
                                <Mail size={48} className="text-indigo-400 opacity-40" />
                            </div>

                            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Đối tượng tiếp cận</p>
                                <div className="space-y-4">
                                    {(targetRoles.length > 0 || targetZones?.length > 0) ? (
                                        <>
                                            {targetRoles.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {targetRoles.map(role => {
                                                        const isCompanyRole = role === 'company';
                                                        const isManagerRole = role === 'manager';

                                                        // Nếu gửi cho role company nhưng có danh sách công ty cụ thể
                                                        if (isCompanyRole && targetCompanies.length > 0) {
                                                            return targetCompanies.map(name => (
                                                                <span key={name} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                                                                    {name}
                                                                </span>
                                                            ));
                                                        }

                                                        return (
                                                            <span key={role} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                                                                {isCompanyRole ? 'Tất cả Doanh nghiệp' : isManagerRole ? 'Quản lý KCN/KCX' : role}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {targetZones?.length > 0 && notification.senderRole !== 'manager' && (
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                                                        Khu công nghiệp/ Khu chế xuất ({targetZones.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {targetZones.map(zone => (
                                                            <span key={zone} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-medium border border-slate-100">
                                                                {zone}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                                            Toàn bộ hệ thống
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Nội dung chi tiết</span>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Mail size={120} />
                            </div>
                            <div className="relative text-base leading-relaxed text-slate-700 whitespace-pre-line prose prose-indigo max-w-none">
                                {(() => {
                                    const rawContent = Array.isArray(body) ? body.join('\n') : body ?? '';
                                    const content = typeof rawContent === 'string' ? rawContent : String(rawContent);
                                    const shouldRenderHtml = bodyIsHtml || (typeof content === 'string' && HTML_TAG_REGEX.test(content.trim()));
                                    return shouldRenderHtml ? (
                                        <div dangerouslySetInnerHTML={{ __html: content }} className="html-content" />
                                    ) : (
                                        content
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {attachments.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tệp đính kèm</span>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {attachments.map((attachment, index) => (
                                    <a
                                        key={attachment.url || index}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                                    >
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <Paperclip size={18} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-slate-800">
                                                {attachment.originalName || `Tệp đính kèm ${index + 1}`}
                                            </span>
                                            <span className="block text-xs text-slate-400">
                                                {attachment.mimeType || 'Tài liệu'}
                                            </span>
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default memo(NotificationDetail);
