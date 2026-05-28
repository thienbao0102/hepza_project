import React from 'react';
import { Tooltip } from 'antd';
import { FileText } from 'lucide-react';
import BillImageViewer from '@/components/common/BillImageViewer';

const ReportSectionTable = ({ data, isEmpty, nameHeader = "Tên nguyên liệu", hideNameColumn = false, showBillImage = false }) => {
    const textStyle = 'text-gray-600';

    // Kiểm tra xem có bản ghi nào chứa mã chất thải không (để hiện cột Mã CTNH)
    const hasWasteCode = data?.some(item => item.codeWaste);

    // Lọc ra các dòng thực sự còn sử dụng (quantity > 0)
    const activeData = (data || []).filter(item => Number(item.quantity) > 0);

    if (isEmpty || activeData.length === 0) {
        return (
            <div className="h-[100px] flex items-center justify-center">
                <p className="text-gray-500 font-roboto text-sm">Không có dữ liệu</p>
            </div>
        );
    }

    return (
        <div className="bg-white h-full overflow-hidden">
            <header className="flex items-center gap-3 px-5 py-3 text-base font-semibold text-black bg-white border-b border-gray-100">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className={`${hideNameColumn && !hasWasteCode ? 'flex-1' : 'w-40'} truncate text-center`}>Nhóm</div>

                    {/* Cột Mã CTNH — chỉ hiện khi có dữ liệu mã chất thải */}
                    {hasWasteCode && (
                        <>
                            <span className="h-7 w-px bg-gray-300" />
                            <div className="w-28 truncate text-center">Mã CTNH</div>
                        </>
                    )}

                    {!hideNameColumn && (
                        <>
                            <span className="h-7 w-px bg-gray-300" />
                            <div className="flex-1 truncate text-center">{nameHeader}</div>
                        </>
                    )}

                    <span className="h-7 w-px bg-gray-300" />
                    <div className="w-24 truncate text-center">Số lượng</div>
                    <span className="h-7 w-px bg-gray-300" />
                    <div className="w-32 truncate text-center">Đơn vị</div>
                    <span className="h-7 w-px bg-gray-300" />
                    <div className="flex-1 truncate text-center">Ghi chú</div>
                </div>
            </header>

            <div className="divide-y divide-gray-100">
                {activeData.map((item) => (
                    <div key={item.id}>
                        <article className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors bg-white">
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                <div className={`${hideNameColumn && !hasWasteCode ? 'flex-1' : 'w-40'} truncate text-center ${textStyle}`}>{item.group}</div>

                                {/* Cột Mã CTNH */}
                                {hasWasteCode && (
                                    <>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <Tooltip title={item.codeWaste || '—'} placement="top" mouseEnterDelay={0.4}>
                                            <div className={`w-28 truncate text-center font-mono text-xs ${textStyle}`}>{item.codeWaste || '—'}</div>
                                        </Tooltip>
                                    </>
                                )}

                                {!hideNameColumn && (
                                    <>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <Tooltip title={item.name} placement="top" mouseEnterDelay={0.4}>
                                            <div className={`flex-1 truncate text-center ${textStyle}`}>{item.name}</div>
                                        </Tooltip>
                                    </>
                                )}

                                <span className="h-7 w-px bg-gray-300" />
                                <div className={`w-24 truncate text-center ${textStyle}`}>{item.quantity}</div>
                                <span className="h-7 w-px bg-gray-300" />
                                <div className={`w-32 truncate text-center ${textStyle}`}>{item.unit}</div>
                                <span className="h-7 w-px bg-gray-300" />
                                <Tooltip title={item.note} placement="top" mouseEnterDelay={0.4}>
                                    <div className={`flex-1 truncate text-center ${textStyle}`}>{item.note}</div>
                                </Tooltip>
                            </div>
                        </article>

                        {/* File đính kèm theo từng chất thải — chỉ hiện khi có */}
                        {item.attachments?.length > 0 && (
                            <div className="px-8 py-2 bg-gray-50/70 border-t border-dashed border-gray-200 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 shrink-0">Đính kèm:</span>
                                <div className="flex items-center gap-3 flex-wrap justify-end">
                                    {item.attachments.map((att, idx) => {
                                        const isImage = (att.mimeType || '').startsWith('image/');
                                        return isImage ? (
                                            <BillImageViewer
                                                key={idx}
                                                imageUrl={att.url}
                                                alt={att.originalName || `Ảnh ${idx + 1}`}
                                            />
                                        ) : (
                                            <a
                                                key={idx}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                title={att.originalName}
                                            >
                                                <FileText className="size-3.5" />
                                                <span className="max-w-[120px] truncate">{att.originalName || `File ${idx + 1}`}</span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Overall Bill Image for the Section */}
            {showBillImage && (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                        Hóa đơn đính kèm (cho toàn bộ mục này):
                    </span>
                    <div className="flex items-center gap-3">
                        {activeData.find(d => d.billImage)?.billImage ? (
                            <BillImageViewer
                                imageUrl={activeData.find(d => d.billImage)?.billImage}
                                alt={`Hóa đơn ${nameHeader.toLowerCase()}`}
                            />
                        ) : (
                            <span className="text-sm text-gray-500 italic">Chưa có hóa đơn</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportSectionTable;
