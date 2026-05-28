import React, { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    Tooltip,
} from "@mui/material";
import { Pencil, Trash2, ArrowDownAZ, ArrowUpZA } from "lucide-react";
import Pagination from "./Pagination";

const ReuseableTable = ({
    columns,
    data = [],
    onEdit,
    onDelete,
    onSelectionChange,
    onSort,
    sortConfig = {},
    showCheckbox = false,
    showActions = true,
    showPagination = false,
    rowsPerPage = 10,
    loading = false
}) => {
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(data.length / rowsPerPage);
    const pageData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const safeSelected = useMemo(() => (Array.isArray(selected) ? selected : []), [selected]);

    const getCurrentPageSelectionStatus = () => {
        if (pageData.length === 0) return { isAllSelected: false, isIndeterminate: false };
        const pageIndices = pageData.map((_, idx) => page * rowsPerPage + idx);
        const isAllSelected = pageIndices.length > 0 && pageIndices.every(idx => safeSelected.includes(idx));
        const isIndeterminate = pageIndices.some(idx => safeSelected.includes(idx)) && !isAllSelected;
        return { isAllSelected, isIndeterminate };
    };

    const { isAllSelected, isIndeterminate } = getCurrentPageSelectionStatus();

    const handleSelectAllClick = (event) => {
        const pageIndices = pageData.map((_, idx) => page * rowsPerPage + idx);
        if (event.target.checked) {
            const newSelected = [...new Set([...safeSelected, ...pageIndices])];
            setSelected(newSelected);
            onSelectionChange?.(newSelected.map(i => data[i]));
        } else {
            const newSelected = safeSelected.filter(idx => !pageIndices.includes(idx));
            setSelected(newSelected);
            onSelectionChange?.(newSelected.map(i => data[i]));
        }
    };

    const handleSelectRow = (index) => {
        const isSel = safeSelected.includes(index);
        const newSelected = isSel
            ? safeSelected.filter(i => i !== index)
            : [...safeSelected, index];
        setSelected(newSelected);
        onSelectionChange?.(newSelected.map(i => data[i]));
    };

    const isSelected = (index) => safeSelected.includes(index);

    return (
        <div className="flex flex-col w-full h-full">
            <div className="overflow-x-auto flex-1">
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: '14px',
                        minWidth: '800px',
                        border: '1px solid #E5E7E9',
                        boxShadow: 'none',
                        height: '100%',
                        overflow: 'auto'
                    }}
                >
                    <Table size="medium" stickyHeader>
                        <TableHead sx={{ backgroundColor: '#FCFCFD' }}>
                            <TableRow>
                                {showCheckbox && (
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
                                )}
                                {columns.map((col, idx) => {
                                    const field = col.accessor;
                                    const sortOrder = sortConfig[field] || 0; // 1: asc, -1: desc, 0: none

                                    return (
                                        <TableCell
                                            key={idx}
                                            align="center"
                                            sx={{
                                                backgroundColor: '#FCFCFD',
                                                borderBottom: '1px solid #E5E7E9',
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px',
                                                color: '#475569',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                '&:hover': { backgroundColor: '#F3F4F6' }
                                            }}
                                            onClick={() => {
                                                const nextOrder = sortOrder === 1 ? -1 : sortOrder === -1 ? 0 : 1;
                                                onSort?.(field, nextOrder);
                                            }}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>{col.Header}</span>
                                                <div className="w-4 h-4 flex items-center justify-center">
                                                    {sortOrder === 1 && <ArrowDownAZ size={14} className="text-blue-500" />}
                                                    {sortOrder === -1 && <ArrowUpZA size={14} className="text-blue-500" />}
                                                    {sortOrder === 0 && <div className="size-3.5 border-2 border-slate-200 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                </div>
                                            </div>
                                        </TableCell>
                                    );
                                })}
                                {showActions && (
                                    <TableCell
                                        align="center"
                                        sx={{
                                            backgroundColor: '#FCFCFD',
                                            borderBottom: '1px solid #E5E7E9',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            fontSize: '13px',
                                            color: '#475569'
                                        }}
                                    >
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0)}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        <div className="flex items-center justify-center gap-2 text-slate-500">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                            <span>Đang tải dữ liệu...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : pageData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0)}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        <div className="text-slate-400">Không có dữ liệu để hiển thị</div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageData.map((row, idx) => {
                                    const index = page * rowsPerPage + idx;
                                    const rowSelected = isSelected(index);

                                    return (
                                        <TableRow
                                            key={row._id || row.id || index}
                                            hover
                                            selected={rowSelected}
                                            sx={{
                                                backgroundColor: rowSelected ? '#FAFAFA' : 'inherit',
                                                borderBottom: '1px solid #E5E7E9',
                                                '&:hover': {
                                                    backgroundColor: rowSelected ? 'rgba(25,118,210,0.12)' : 'rgba(0,0,0,0.04)',
                                                },
                                            }}
                                        >
                                            {showCheckbox && (
                                                <TableCell
                                                    padding="checkbox"
                                                    sx={{ borderBottom: '1px solid #E5E7E9' }}
                                                >
                                                    <Checkbox
                                                        checked={rowSelected}
                                                        onChange={() => handleSelectRow(index)}
                                                        sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                                                    />
                                                </TableCell>
                                            )}
                                            {columns.map((col, colIdx) => (
                                                <TableCell
                                                    key={colIdx}
                                                    align="center"
                                                    sx={{
                                                        borderBottom: '1px solid #E5E7E9',
                                                        whiteSpace: 'nowrap',
                                                        fontSize: '13px',
                                                        color: '#334155'
                                                    }}
                                                >
                                                    {col.render
                                                        ? col.render(row[col.accessor], row)
                                                        : row[col.accessor] || 'N/A'}
                                                </TableCell>
                                            ))}
                                            {showActions && (
                                                <TableCell
                                                    align="center"
                                                    sx={{ borderBottom: '1px solid #E5E7E9' }}
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Tooltip title="Chỉnh sửa" arrow>
                                                            <button
                                                                onClick={() => onEdit?.(row)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip title="Xóa" arrow>
                                                            <button
                                                                onClick={() => onDelete?.(row)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>

            {/* Pagination Component */}
            {showPagination && data.length > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
};

export default ReuseableTable;