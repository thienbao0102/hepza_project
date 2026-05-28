import React from 'react';
import { FileText, Edit, Trash2, ExternalLink, MoreVertical } from 'lucide-react';
import dayjs from 'dayjs';
import { Popconfirm, Dropdown } from 'antd';

const DecreeCard = ({ decree, onEdit, onDelete, canEdit }) => {
    const menuItems = [
        {
            key: 'edit',
            label: 'Chỉnh sửa',
            icon: <Edit size={16} className="text-blue-600" />,
            onClick: () => onEdit(decree),
        },
        {
            key: 'delete',
            label: (
                <Popconfirm
                    title="Xóa nghị định?"
                    description="Hành động này không thể hoàn tác"
                    onConfirm={(e) => {
                        e.stopPropagation();
                        onDelete(decree.id);
                    }}
                    onCancel={(e) => e.stopPropagation()}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    placement="leftTop"
                >
                    <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
                        Xóa
                    </div>
                </Popconfirm>
            ),
            icon: <Trash2 size={16} className="text-rose-600" />,
            danger: true,
        },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-visible flex flex-col h-full">
            {/* Background Icon */}
            {/* <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none overflow-hidden rounded-3xl">
                <FileText size={80} className="text-indigo-600" />
            </div> */}

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <span className="bg-indigo-50 text-[#4E5BA6] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {decree.group_regulation || decree.group || 'Nghị định'}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">
                        Hiệu lực: {decree.effectiveDate ? dayjs(decree.effectiveDate).format('DD/MM/YYYY') : 'Chưa rõ'}
                    </span>

                    {/* Action Menu */}
                    {canEdit && (
                        <div className="ml-auto z-10">
                            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors outline-none">
                                    <MoreVertical size={18} />
                                </button>
                            </Dropdown>
                        </div>
                    )}
                </div>
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#4E5BA6] transition-colors line-clamp-2 mb-3">
                    {decree.title}
                </h4>
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {decree.summary}
                </p>
            </div>
            <a
                href={decree.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-[#4E5BA6] text-sm font-semibold rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all font-inter z-10"
            >
                <ExternalLink size={14} />
                Xem chi tiết văn bản
            </a>
        </div>
    );
};

export default DecreeCard;
