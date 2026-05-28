import React from 'react';
import { MoreVertical, ArrowDownLeft, ArrowUpRight, Paperclip, FileText } from 'lucide-react';
import { Dropdown, Image, Tooltip } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';

const SymbiosisCard = ({
    title,
    date = "20/11/2025",
    description,
    quantity,
    price,
    quantityLabel = 'Số lượng:',
    unit,
    currency,
    type = 'buy', // 'buy' or 'sell'
    companyName,
    attachments = [],
    isOwner = false,
    onClick,
    onDelete,
    onEdit
}) => {
    // Define Theme based on Type
    const isSell = type === 'sell';

    const theme = isSell ? {
        color: '#568D65', // Green for Sell (Supply)
        bgColor: 'bg-[#568D65]/10',
        borderColor: 'border-[#568D65]/20',
        icon: ArrowUpRight,
        label: 'CẦN BÁN'
    } : {
        color: '#4E5BA6', // Blue for Buy (Demand)
        bgColor: 'bg-[#4E5BA6]/10',
        borderColor: 'border-[#4E5BA6]/20',
        icon: ArrowDownLeft,
        label: 'CẦN MUA'
    };

    const StatusIcon = theme.icon;

    const menuItems = [
        {
            key: 'edit',
            label: 'Chỉnh sửa',
            onClick: onEdit
        },
        {
            key: 'delete',
            label: 'Xóa',
            danger: true,
            onClick: onDelete
        }
    ];

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative w-full bg-white rounded-xl border overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-300 hover:shadow-md",
                theme.borderColor
            )}
        >
            {/* Top Color Bar */}
            <div className="h-1.5 w-full" style={{ backgroundColor: theme.color }} />

            <div className="p-4 flex flex-col flex-1">
                {/* Header: Label & Date */}
                <div className="flex justify-between items-start mb-2">
                    <span
                        className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1",
                            theme.bgColor
                        )}
                        style={{ color: theme.color }}
                    >
                        <StatusIcon size={12} strokeWidth={3} />
                        {theme.label}
                    </span>

                    <div className="flex items-center gap-2">
                        {date && (
                            <span className="text-[11px] font-medium text-gray-400">
                                {dayjs(date).format('DD/MM/YYYY')}
                            </span>
                        )}
                        {isOwner && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                                    <button className="text-gray-300 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors">
                                        <MoreVertical size={16} />
                                    </button>
                                </Dropdown>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-bold text-gray-800 mb-1 line-clamp-2 group-hover:text-[#4E5BA6] transition-colors">
                    {title}
                </h3>

                {/* Ownership Tag */}
                {isOwner && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            CỦA BẠN
                        </span>
                    </div>
                )}

                {/* Description */}
                {description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Attachment Thumbnails */}
                {attachments?.length > 0 && (
                    <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 mb-1.5">
                            <Paperclip size={11} className="text-gray-400" />
                            <span className="text-[10px] font-medium text-gray-400">{attachments.length} đính kèm</span>
                        </div>
                        <div className="flex gap-1.5 overflow-hidden">
                            <Image.PreviewGroup>
                                {attachments.slice(0, 3).map((att, idx) => {
                                    const url = typeof att === 'object' ? att?.url : att;
                                    if (!url) return null;
                                    const isImage = att?.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                                    
                                    if (isImage) {
                                        return (
                                            <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                                <Image
                                                    src={url}
                                                    alt={att?.originalName || `file-${idx}`}
                                                    className="object-cover w-full h-full"
                                                    width={40}
                                                    height={40}
                                                />
                                            </div>
                                        );
                                    }

                                    // Hiển thị icon cho các file tài liệu (pdf, docx, etc...)
                                    return (
                                        <Tooltip title={att?.originalName || `file-${idx}`} key={idx}>
                                            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
                                                <FileText size={16} className="text-gray-400 group-hover:text-blue-500" />
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </Image.PreviewGroup>
                            {attachments.length > 3 && (
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                                    +{attachments.length - 3}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="mt-auto pt-3 border-t border-dashed border-gray-100 text-sm space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Số lượng:</span>
                        <span className="font-bold font-mono text-gray-700">
                            {quantity} <span className="text-xs text-gray-500 font-sans">{unit}</span>
                        </span>
                    </div>

                    {price != null && currency && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">Đơn giá:</span>
                            <span className="font-bold" style={{ color: theme.color }}>
                                {parseInt(price).toLocaleString()} {currency}/{unit}
                            </span>
                        </div>
                    )}
                </div>

                {/* View Info Action (Market Only) */}
                {!isOwner && companyName && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-center">
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#4E5BA6] flex items-center gap-1 transition-colors uppercase tracking-wider">
                            Xem thông tin chi tiết <span className="text-lg leading-none mt-[-2px]">›</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SymbiosisCard;
