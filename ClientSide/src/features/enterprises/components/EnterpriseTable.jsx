import React, { useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, Tooltip,
} from '@mui/material';
import Pagination from '@components/common/Pagination';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpZA } from 'lucide-react';
import { ActionButtons } from '@components/ui/Button';

const getCompanyTypeColor = (type) => {
    const colors = {
        'Nhà nước': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        'Tư nhân': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        'Liên doanh': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        FDI: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        'Hợp tác xã': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
        Khác: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    };
    return colors[type] || colors['Khác'];
};

const getIndustryGroupColor = (group) => {
    const colors = {
        'Cơ khí, điện, điện tử': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        'Hoá dược, cao su, nhựa': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        'Chế biến lương thực, thực phẩm': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
        'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
        'May mặc, thuộc da, dệt nhuộm': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
        'Khác': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    };
    return colors[group] || colors['Khác'];
};

const EnterpriseTable = ({
    data = [],
    selected = [],
    setSelected = () => { },
    onEdit = () => { },
    onDelete = () => { },
    onRestore = () => { },
    viewMode = 'active',

    // ⛔ Ẩn cột hành động và mọi nút nếu false
    showActions = true,

    // Pagination / sort
    sort = {},
    onSort = () => { },
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 10,
    onPageChange = () => { },
    onItemsPerPageChange = () => { },
    loading = false,
    showSelection = true,
}) => {
    const { user } = useAuth();
    const location = useLocation();
    const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/manager';
    const currentPageData = Array.isArray(data) ? data : [];
    const safeSelected = useMemo(() => (Array.isArray(selected) ? selected : []), [selected]);

    const getCurrentPageSelectionStatus = () => {
        if (currentPageData.length === 0) return { isAllSelected: false, isIndeterminate: false };
        const ids = currentPageData.map(i => i.company_id).filter(Boolean);
        const isAllSelected = ids.length > 0 && ids.every(id => safeSelected.includes(id));
        const isIndeterminate = ids.some(id => safeSelected.includes(id)) && !isAllSelected;
        return { isAllSelected, isIndeterminate };
    };

    const { isAllSelected, isIndeterminate } = getCurrentPageSelectionStatus();

    const handleSelectAllClick = (e) => {
        const ids = currentPageData.map(i => i.company_id).filter(Boolean);
        if (e.target.checked) setSelected([...new Set([...safeSelected, ...ids])]);
        else setSelected(safeSelected.filter(id => !ids.includes(id)));
    };

    const handleSelectRow = (companyId) => {
        if (!companyId) return;
        const isSel = safeSelected.includes(companyId);
        setSelected(isSel ? safeSelected.filter(id => id !== companyId) : [...safeSelected, companyId]);
    };

    // Headers (ẩn cột actions nếu showActions = false)
    const baseHeaders = [
        { key: 'company_name', label: 'Tên doanh nghiệp' },
        { key: 'company_type', label: 'Loại hình' },
        { key: 'address', label: 'Địa chỉ' },
        { key: 'zone_name', label: 'Khu công nghiệp' },
        { key: 'founded_year', label: 'Năm thành lập' },
        { key: 'total_workers', label: 'Số công nhân' },
        { key: 'industry_group', label: 'Nhóm ngành' },
        { key: 'industry', label: 'Ngành nghề' },
    ];
    const tableHeaders = showActions
        ? [...baseHeaders, { key: 'actions', label: viewMode === 'active' ? 'Tuỳ chọn' : 'Tuỳ chọn' }]
        : baseHeaders;

    const formatArrayValue = (value) => {
        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : 'N/A';
        }
        return value || 'N/A';
    };

    const formatArrayTooltip = (value) => {
        if (Array.isArray(value)) {
            if (value.length === 0) return 'N/A';
            return value.join('\n');
        }
        return value || 'N/A';
    };

    const renderChips = (items, renderItem) => {
        if (!Array.isArray(items) || items.length === 0) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                    N/A
                </span>
            );
        }

        const visibleItems = items.slice(0, 2);
        const remainingCount = items.length - visibleItems.length;

        return (
            <span className="flex flex-wrap justify-center gap-1">
                {visibleItems.map((item, index) => renderItem(item, index))}
                {remainingCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                        +{remainingCount}
                    </span>
                )}
            </span>
        );
    };

    const renderTableRows = () => {
        if (currentPageData.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={tableHeaders.length + (showSelection ? 1 : 0)} align="center" sx={{ py: 4 }}>
                        <div className="text-gray-500">Không có dữ liệu để hiển thị</div>
                    </TableCell>
                </TableRow>
            );
        }

        return currentPageData.map((row, idx) => {
            const companyId = row.company_id;
            const isSelected = companyId ? safeSelected.includes(companyId) : false;
            const typeColors = getCompanyTypeColor(row.company_type);
            const industryGroups = Array.isArray(row.industry_group_names)
                ? row.industry_group_names
                : (Array.isArray(row.industry_group) ? row.industry_group : row.industry_group ? [row.industry_group] : []);
            const industries = Array.isArray(row.industry_names)
                ? row.industry_names
                : (Array.isArray(row.industry) ? row.industry : row.industry ? [row.industry] : []);
            const uniqueKey = `row-${companyId || idx}`;

            return (
                <TableRow
                    key={uniqueKey}
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
                    {showSelection && (
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #E5E7E9' }}>
                            <Checkbox
                                checked={isSelected}
                                onChange={() => handleSelectRow(companyId)}
                                sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                                disabled={!companyId}
                            />
                        </TableCell>
                    )}

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', overflow: 'hidden', minWidth: '400px', width: '400px', maxWidth: '400px' }}>
                        <Tooltip title={row.company_name || 'N/A'} arrow placement="top">
                            {viewMode === 'active' ? (
                                <Link to={`${basePath}/business/${companyId}`} className="inline-block max-w-full">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors truncate block">
                                        {row.company_name || 'N/A'}
                                    </span>
                                </Link>
                            ) : (
                                <span className="inline-block max-w-full">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 truncate block">
                                        {row.company_name || 'N/A'}
                                    </span>
                                </span>
                            )}
                        </Tooltip>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', width: '120px' }}>
                        <Tooltip title={row.company_type || 'N/A'} arrow placement="top">
                            <span className="text-gray-700 text-xs font-medium px-2.5">
                                {row.company_type || 'N/A'}
                            </span>
                        </Tooltip>
                    </TableCell>

                    <TableCell sx={{
                        borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 200
                    }}>
                        <Tooltip title={`Xem trên Google Maps: ${row.address || 'N/A'}`} arrow placement="top">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 hover:text-blue-600 hover:underline"
                            >
                                <span className="cursor-pointer truncate block">{row.address || 'N/A'}</span>
                            </a>
                        </Tooltip>
                    </TableCell>

                    {/* ❌ Bỏ Link sang chi tiết ở zone_name */}
                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', width: '120px' }}>
                        <Tooltip title={row.zone_name || 'N/A'} arrow placement="top">
                            <span className="flex justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                {row.zone_name || 'N/A'}
                            </span>
                        </Tooltip>
                    </TableCell>

                    <TableCell align="center" sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', width: '120px' }}>
                        <Tooltip title={row.founded_year || 'N/A'} arrow placement="top">
                            <span className="font-medium text-gray-700">{row.founded_year || 'N/A'}</span>
                        </Tooltip>
                    </TableCell>

                    <TableCell align="center" sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', width: '120px' }}>
                        <Tooltip title={row.total_workers?.toLocaleString() || '0'} arrow placement="top">
                            <span className="font-medium text-gray-700">{row.total_workers?.toLocaleString() || '0'}</span>
                        </Tooltip>
                    </TableCell>

                    <TableCell align="center" sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', minWidth: '300px', width: '300px', maxWidth: '300px' }}>
                        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{formatArrayTooltip(industryGroups)}</span>} arrow placement="top">
                            <span className="flex justify-center items-center w-full">
                                {renderChips(industryGroups, (group, index) => {
                                    const colors = getIndustryGroupColor(group);
                                    return (
                                        <span
                                            key={`${group}-${index}`}
                                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border truncate ${colors.bg} ${colors.text} ${colors.border} cursor-help max-w-[180px]`}
                                        >
                                            {group}
                                        </span>
                                    );
                                })}
                            </span>
                        </Tooltip>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap', overflow: 'hidden', minWidth: '200px', width: '200px', maxWidth: '200px' }}>
                        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{formatArrayTooltip(industries)}</span>} arrow placement="top">
                            <span className="flex justify-center items-center w-full ">
                                {renderChips(industries, (industry, index) => (
                                    <span
                                        key={`${industry}-${index}`}
                                        className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 cursor-help truncate max-w-[160px]"
                                    >
                                        {industry}
                                    </span>
                                ))}
                            </span>
                        </Tooltip>
                    </TableCell>

                    {showActions && (
                        <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap' }} align="center">
                            {(user?.role === 'admin' || (user?.role === 'manager' && row.zone_id === user.zone_id)) && (
                                viewMode === 'active' ? (
                                    <ActionButtons
                                        onEdit={() => onEdit(companyId)}
                                        onDelete={() => onDelete(companyId)}
                                        isDeleteConfirm={false}
                                    />
                                ) : (
                                    <ActionButtons
                                        onRestore={() => onRestore(companyId)}
                                        onDelete={() => onDelete(companyId)}
                                        isDeleteConfirm={false}
                                    />
                                )
                            )}
                        </TableCell>
                    )}
                </TableRow>
            );
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-1 overflow-auto">
                <TableContainer
                    component={Paper}
                    sx={{ borderRadius: '14px', minWidth: '1000px', border: '1px solid #E5E7E9', boxShadow: 'none' }}
                    className="w-full shadow-none"
                >
                    <Table size="medium" stickyHeader>
                        <TableHead sx={{ backgroundColor: '#FCFCFD' }}>
                            <TableRow>
                                {showSelection && (
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
                                {tableHeaders.map((header) => (
                                    <TableCell
                                        key={header.key}
                                        align="center"
                                        sx={{
                                            backgroundColor: '#FCFCFD',
                                            borderBottom: '1px solid #E5E7E9',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <HeaderCell
                                            label={header.label}
                                            field={header.key}
                                            sortConfig={sort}
                                            onSort={onSort}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={tableHeaders.length + (showSelection ? 1 : 0)} align="center" sx={{ py: 4 }}>
                                        {/* <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span>Đang tải dữ liệu...</span>
                    </div> */}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                renderTableRows()
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
            <span className="font-bold">{label}</span>
            {sortOrder === 1 && <ArrowDownAZ size={16} className="text-blue-500" />}
            {sortOrder === -1 && <ArrowUpZA size={16} className="text-blue-500" />}
        </div>
    );
}

export default EnterpriseTable;
