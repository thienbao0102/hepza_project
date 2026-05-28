import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

const formatFileSize = (bytes) => {
    if (!bytes) return '0 Byte';
    const k = 1024;
    const sizes = ['Byte', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImportStatsCards = ({
    file,
    stats,
    onDownloadTemplate,
    templateName = 'Template_Import.xlsx',
    extraContent = null,
    isDownloadingTemplate = false,
    isPreparingTemplate = false,
}) => {
    const templateStatusText = file
        ? formatFileSize(file.size)
        : isDownloadingTemplate
            ? 'Đang tải file mẫu...'
            : isPreparingTemplate
                ? 'Đang chuẩn bị file mẫu...'
                : 'Tải mẫu Excel';

    const actionText = isDownloadingTemplate
        ? 'Đang tải'
        : isPreparingTemplate
            ? 'Đang chuẩn bị'
            : 'Bấm để tải';

    return (
        <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div
                    onClick={isDownloadingTemplate ? undefined : onDownloadTemplate}
                    className={`bg-[#129652]/10 border border-[#129652] rounded-lg p-3 flex items-center justify-between transition shadow-sm lg:col-span-2 ${
                        isDownloadingTemplate
                            ? 'cursor-wait opacity-80'
                            : 'cursor-pointer hover:bg-[#129652]/20'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="rounded bg-green-600 p-2 text-white">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <div
                                className="max-w-[200px] truncate text-xs font-semibold uppercase text-gray-700"
                                title={file ? file.name : templateName}
                            >
                                {file ? file.name : templateName}
                            </div>
                            <div className="text-xs text-gray-500">
                                {templateStatusText}
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold text-green-700">{actionText}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-b from-[#F9FAFB] to-[#F3F4FF] border border-[#E2E8F090] rounded-lg p-4 flex flex-col justify-between shadow-sm lg:col-span-1">
                    <span className="text-sm text-gray-500">Tổng dòng dữ liệu</span>
                    <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                </div>
                <div className="bg-gradient-to-b from-[#F9FAFB] to-[#ECFDF5] border border-[#E2E8F090] rounded-lg p-4 flex flex-col justify-between shadow-sm lg:col-span-1">
                    <span className="text-sm text-gray-500">Dòng hợp lệ</span>
                    <span className="text-3xl font-bold text-green-600">{stats.valid}</span>
                </div>
                <div className="bg-gradient-to-b from-[#F9FAFB] to-[#FEF2F2] border border-[#E2E8F090] rounded-lg p-4 flex flex-col justify-between shadow-sm lg:col-span-1">
                    <span className="text-sm text-gray-500">Lỗi / Cảnh báo</span>
                    <span className="text-3xl font-bold text-red-500">{stats.warning + stats.error}</span>
                </div>
            </div>

            {extraContent && (
                <div>
                    {extraContent}
                </div>
            )}
        </div>
    );
};

export default ImportStatsCards;
