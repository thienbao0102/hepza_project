import React, { useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, Tooltip, Chip, IconButton, CircularProgress
} from '@mui/material';
import { Popconfirm } from 'antd';
import Pagination from '@components/common/Pagination';
import { ArrowDownAZ, ArrowUpZA, Download, RefreshCw, Trash2, FileSpreadsheet } from 'lucide-react';
import dayjs from 'dayjs';
import { canDownloadExport, canReExport, getExportStatusLabel, getExportStatusStyle, isExportProcessing } from '../../utils/exportStatus';

const ExportHistoryTable = ({
    data = [],
    selected = [],
    setSelected = () => { },
    sort = {},
    onSort = () => { },
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    onPageChange = () => { },
    loading = false,
    onDelete = () => { },
    onDownload = () => { },
    onReExport = () => { },
}) => {
    const resolveCreatorLabel = (creator) => {
        const normalized = typeof creator === 'string' ? creator.trim() : '';
        return normalized || 'Tài khoản đã xóa';
    };

    // Ensure array data
    const currentPageData = Array.isArray(data) ? data : [];
    const safeSelected = useMemo(() => (Array.isArray(selected) ? selected : []), [selected]);

    // Selection Logic
    const getCurrentPageSelectionStatus = () => {
        if (currentPageData.length === 0) return { isAllSelected: false, isIndeterminate: false };
        const ids = currentPageData.map(i => i.export_id).filter(Boolean);
        const isAllSelected = ids.length > 0 && ids.every(id => safeSelected.includes(id));
        const isIndeterminate = ids.some(id => safeSelected.includes(id)) && !isAllSelected;
        return { isAllSelected, isIndeterminate };
    };

    const { isAllSelected, isIndeterminate } = getCurrentPageSelectionStatus();

    const handleSelectAllClick = (e) => {
        const ids = currentPageData.map(i => i.export_id).filter(Boolean);
        if (e.target.checked) setSelected([...new Set([...safeSelected, ...ids])]);
        else setSelected(safeSelected.filter(id => !ids.includes(id)));
    };

    const handleSelectRow = (id) => {
        if (!id) return;
        const isSel = safeSelected.includes(id);
        setSelected(isSel ? safeSelected.filter(i => i !== id) : [...safeSelected, id]);
    };

    const tableHeaders = [
        { key: 'created_at', label: 'Thời gian tạo' },
        { key: 'name', label: 'Tên dữ liệu tạo' },
        { key: 'creator', label: 'Người tạo' },
        { key: 'status', label: 'Tình trạng', align: 'center' },
        { key: 'actions', label: 'Tùy chọn', align: 'center' }
    ];

    const renderTableRows = () => {
        if (currentPageData.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={tableHeaders.length + 1} align="center" sx={{ py: 4 }}>
                        <div className="text-gray-500">Không có dữ liệu để hiển thị</div>
                    </TableCell>
                </TableRow>
            );
        }

        return currentPageData.map((row, idx) => {
            const isSelected = safeSelected.includes(row.export_id);
            return (
                <TableRow
                    key={row.export_id || idx}
                    hover
                    selected={isSelected}
                    sx={{
                        backgroundColor: isSelected ? '#FAFAFA' : 'inherit',
                        borderBottom: '1px solid #E5E7E9',
                        '&:hover': {
                            backgroundColor: isSelected ? 'rgba(25,118,210,0.12)' : 'rgba(0,0,0,0.04)',
                        },
                        tableLayout: "fixed",
                        width: "100%",
                    }}
                >
                    <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #E5E7E9' }} className="text-center">
                        <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectRow(row.export_id)}
                            sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                        />
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }} className="!text-center">
                        <span className="font-medium text-gray-900">{dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }} className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                            <FileSpreadsheet size={18} className="text-green-600" />
                            <Tooltip title={row.name} arrow placement="top">
                                <span className="font-medium text-gray-700 truncate max-w-[200px] block">{row.name}</span>
                            </Tooltip>
                        </div>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }} className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                            <span className="text-gray-700">{resolveCreatorLabel(row.creator)}</span>
                        </div>
                    </TableCell>

                    <TableCell align="center" sx={{ borderBottom: '1px solid #E5E7E9' }} className="text-center">
                        {(() => {
                            const styles = getExportStatusStyle(row.status);
                            return (
                                <Chip
                                    icon={isExportProcessing(row.status) ? <CircularProgress size={16} sx={{ color: styles.color }} /> : undefined}
                                    label={getExportStatusLabel(row.status)}
                                    size="small"
                                    sx={{
                                        backgroundColor: styles.bg,
                                        color: styles.color,
                                        fontWeight: 500,
                                        border: `1px solid ${styles.border}`,
                                        '& .MuiChip-icon': {
                                            marginLeft: '8px',
                                            marginRight: '-4px'
                                        }
                                    }}
                                />
                            );
                        })()}
                    </TableCell>

                    <TableCell align="center" sx={{ borderBottom: '1px solid #E5E7E9' }} className="text-center">
                        <div className="flex justify-center gap-1">
                            {/* <Tooltip title="Tải xuống">
                                <button
                                    onClick={() => onDownload(row)}
                                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all"
                                >
                                    <Download size={18} />
                                </button>
                            </Tooltip> */}
                            {canDownloadExport(row) && (
                                <Tooltip title="Tải xuống">
                                    <button
                                        onClick={() => onDownload && onDownload(row)}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all"
                                    >
                                        <Download size={18} />
                                    </button>
                                </Tooltip>
                            )}
                            {canReExport(row) && (
                                <Tooltip title="Xuất lại">
                                    <button
                                        onClick={() => onReExport && onReExport(row)}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip title="Xóa">
                                <div>
                                    <Popconfirm
                                        title="Bạn có chắc chắn muốn xóa?"
                                        onConfirm={() => onDelete(row.export_id)}
                                        okText="Có"
                                        cancelText="Không"
                                    >
                                        <button
                                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </Popconfirm>
                                </div>
                            </Tooltip>
                        </div>
                    </TableCell>
                </TableRow >
            );
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Bulk Action Toolbar Removed - Moved to Parent */}

            <div className="flex flex-1 overflow-auto">
                <TableContainer
                    component={Paper}
                    sx={{ borderRadius: '14px', minWidth: '1000px', border: '1px solid #E5E7E9', boxShadow: 'none' }}
                    className="w-full shadow-none"
                >
                    <Table size="medium" stickyHeader>
                        <TableHead sx={{ backgroundColor: '#FCFCFD' }}>
                            <TableRow>
                                <TableCell
                                    padding="checkbox"
                                    sx={{
                                        backgroundColor: '#FCFCFD',
                                        borderBottom: '1px solid #E5E7E9',
                                        fontWeight: 'bold',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 1,
                                    }}
                                >
                                    <Checkbox
                                        checked={isAllSelected}
                                        indeterminate={isIndeterminate}
                                        onChange={handleSelectAllClick}
                                        sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                                    />
                                </TableCell>
                                {tableHeaders.map((header) => (
                                    <TableCell
                                        key={header.key}
                                        align={header.align || 'left'}
                                        sx={{
                                            backgroundColor: '#FCFCFD',
                                            borderBottom: '1px solid #E5E7E9',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <HeaderCell label={header.label} field={header.key} sortConfig={sort} onSort={onSort} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {renderTableRows()}
                            {loading && currentPageData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={tableHeaders.length + 1} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={30} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>

            {totalItems > 0 && (
                <div className="flex-shrink-0">
                    <Pagination
                        currentPage={currentPage - 1}
                        totalPages={totalPages}
                        onPageChange={(page) => onPageChange(page + 1)}
                    />
                </div>
            )}
        </div>
    );
};

function HeaderCell({ label, field, sortConfig, onSort }) {
    const sortOrder = sortConfig[field] || 0;
    const handleSort = () => {
        const nextOrder = sortOrder === 1 ? -1 : 1;
        onSort?.(field, nextOrder);
    };
    return (
        <div className="relative flex items-center justify-center gap-1 cursor-pointer select-none" onClick={handleSort}>
            <span className="font-bold text-gray-700">{label}</span>
            {sortOrder === 1 && <ArrowDownAZ size={16} className="text-blue-500" />}
            {sortOrder === -1 && <ArrowUpZA size={16} className="text-blue-500" />}
        </div>
    );
}

export default ExportHistoryTable;
