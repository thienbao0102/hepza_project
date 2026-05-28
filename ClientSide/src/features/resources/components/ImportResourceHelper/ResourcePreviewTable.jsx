import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { SHEET_CONFIGS, RESOURCE_COLORS } from './importResourceUtils';

import ImportEmptyState from '@/components/common/Import/ImportEmptyState';

const ResourcePreviewTable = ({ tableData, file, onCheckFile, isProcessing }) => {
    const [expandedSheets, setExpandedSheets] = useState({});

    // Group data by sheet name, expand electricity into separate usage rows
    const groupedData = useMemo(() => {
        const groups = {};
        tableData.forEach(item => {
            const sheetName = item.sheetName || 'Khác';
            if (!groups[sheetName]) {
                groups[sheetName] = [];
            }

            // Electricity: split into separate rows per usage type
            if (item.mainGroup === 'el' && (item.production > 0 || item.domestic > 0 || item.other > 0)) {
                if (item.production > 0) {
                    groups[sheetName].push({
                        ...item,
                        name: `${item.subGroupLabel || item.name}`,
                        usageLabel: 'Sản xuất',
                        quantity: item.production,
                        _isElectricExpanded: true
                    });
                }
                if (item.domestic > 0) {
                    groups[sheetName].push({
                        ...item,
                        name: `${item.subGroupLabel || item.name}`,
                        usageLabel: 'Sinh hoạt',
                        quantity: item.domestic,
                        _isElectricExpanded: true
                    });
                }
                if (item.other > 0) {
                    groups[sheetName].push({
                        ...item,
                        name: `${item.subGroupLabel || item.name}`,
                        usageLabel: 'Khác',
                        quantity: item.other,
                        _isElectricExpanded: true
                    });
                }
            } else {
                groups[sheetName].push(item);
            }
        });
        return groups;
    }, [tableData]);

    const toggleSheet = (sheetName) => {
        setExpandedSheets(prev => ({
            ...prev,
            [sheetName]: !prev[sheetName]
        }));
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'valid':
                return <CheckCircle2 size={16} className="text-green-500" />;
            case 'warning':
                return <AlertTriangle size={16} className="text-orange-500" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            valid: 'bg-green-100 text-green-800',
            warning: 'bg-orange-100 text-orange-800',
            error: 'bg-red-100 text-red-800'
        };
        const labels = {
            valid: 'Hợp lệ',
            warning: 'Cảnh báo',
            error: 'Lỗi'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    // Empty or not checked state
    if (tableData.length === 0 && !isProcessing) {
        return (
            <ImportEmptyState
                hasFile={!!file}
                isProcessing={isProcessing}
                onCheckFile={onCheckFile}
            />
        );
    }

    // Processing state
    if (isProcessing) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-10">
                <Loader2 size={48} className="animate-spin text-[#4E5BA6] mb-4" />
                <p className="text-lg font-medium text-gray-700">Đang xử lý file...</p>
                <p className="text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
            </div>
        );
    }

    // Data preview
    return (
        <div className="flex-1 overflow-auto">
            {Object.entries(groupedData).map(([sheetName, items]) => {
                const isExpanded = expandedSheets[sheetName] !== false; // Default expanded
                const config = SHEET_CONFIGS[sheetName];
                const colors = RESOURCE_COLORS[config?.mainGroup] || RESOURCE_COLORS.material;
                const validCount = items.filter(i => i.status === 'valid').length;
                const errorCount = items.filter(i => i.status === 'error').length;
                const isWasteSheet = config?.mainGroup === 'waste';
                const columnCount = 1 + (isWasteSheet ? 2 : 0) + 1 + 4;

                return (
                    <div key={sheetName} className={`mb-3 border rounded-lg overflow-hidden ${colors.border}`}>
                        {/* Sheet Header */}
                        <div
                            className={`${colors.bg} px-4 py-3 flex items-center justify-between cursor-pointer hover:opacity-90`}
                            onClick={() => toggleSheet(sheetName)}
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                <span className={`font-semibold ${colors.text}`}>{sheetName}</span>
                                <span className={`${colors.badge} px-2 py-0.5 rounded-full text-xs`}>
                                    {items.length} dòng
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    ✓ {validCount}
                                </span>
                                {errorCount > 0 && (
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                        ✗ {errorCount}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Sheet Content */}
                        {isExpanded && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">STT</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhóm phụ</th>
                                            {isWasteSheet && (
                                                <>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Mã CTNH</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Trạng thái</th>
                                                </>
                                            )}
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Kiểm tra</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.slice(0, 20).map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50 ${item.status === 'error' ? 'bg-red-50' : ''}`}>
                                                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                                <td className="px-3 py-2 font-medium">{item.subGroupLabel || item.subGroup}</td>
                                                {isWasteSheet && (
                                                    <>
                                                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.codeWaste || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-600">{item.wasteStatus || '—'}</td>
                                                    </>
                                                )}
                                                <td className="px-3 py-2">
                                                    {item._isElectricExpanded ? item.usageLabel : item.name}
                                                </td>
                                                <td className="px-3 py-2 font-mono">{item.quantity?.toLocaleString()}</td>
                                                <td className="px-3 py-2">{item.unit}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1">
                                                        {getStatusIcon(item.status)}
                                                        {item.status === 'error' && item.errors?.[0] && (
                                                            <span className="text-xs text-red-600 truncate max-w-[150px]" title={item.errors[0]}>
                                                                {item.errors[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length > 20 && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={columnCount} className="px-3 py-2 text-center text-gray-500 text-sm">
                                                    ... và {items.length - 20} dòng khác
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ResourcePreviewTable;
