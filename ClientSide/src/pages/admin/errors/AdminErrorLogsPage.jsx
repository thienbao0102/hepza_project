import React, { useState, useMemo } from 'react';
import { Tag, Button, Modal, Space, Tooltip as AntTooltip, Image } from 'antd';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, Tooltip
} from '@mui/material';
import Pagination from '@/components/common/Pagination';
import { ArrowDownAZ, ArrowUpZA } from 'lucide-react';
import { CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { RefreshButton, DeleteSelectedButton } from '@/components/ui/Button';
import dayjs from 'dayjs';
import { useErrorLog } from '@/hooks/useErrorLog';
import { useHeader } from '@/components/common/Header/HeaderContext';
import SearchBox from '@/components/ui/SearchBox';
import ButtonFilter from '@/components/ui/ButtonFilter';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

import toast from '@/utils/toast';

const AdminErrorLogsPage = () => {
    const { setHeaderConfig } = useHeader();
    const { errorLogs, isLoading, updateStatus, refetch, deleteLog } = useErrorLog();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [selectedError, setSelectedError] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({});
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateStatus({ id, status: newStatus });
            toast.success('Cập nhật thành công', 'Trạng thái báo cáo lỗi đã được thay đổi.');
        } catch (error) {
            toast.error('Cập nhật thất bại', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        }
    };

    // ... (rest of code)

    // Handle delete selected logs
    const handleDeleteSelected = async () => {
        if (selectedRowKeys.length === 0) return;

        try {
            // Delete each log sequentially to avoid overwhelming the server
            for (const id of selectedRowKeys) {
                await deleteLog(id);
            }
            toast.success('Xóa thành công', `Đã xóa ${selectedRowKeys.length} báo cáo lỗi.`);
            setSelectedRowKeys([]);
            await refetch();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Xóa thất bại', error?.response?.data?.message || 'Không thể xóa các báo cáo đã chọn.');
        }
    };

    const handleDeleteClick = () => {
        if (selectedRowKeys.length === 0) {
            toast.warning('Chưa chọn', 'Vui lòng chọn ít nhất một báo cáo lỗi để xóa.');
            return;
        }
        setIsDeleteModalVisible(true);
    };

    React.useEffect(() => {
        setHeaderConfig({
            title: 'Quản lý Báo cáo lỗi',
            description: 'Danh sách các lỗi và phản hồi từ người dùng',
            breadcrumbItems: [
                { title: 'Báo cáo lỗi', key: '/admin/error-logs' }
            ]
        });
    }, [setHeaderConfig]);

    // Column Definitions for HeaderCell mapping
    const tableHeaders = [
        { key: 'createdAt', label: 'Thời gian' },
        { key: 'message', label: 'Thông điệp lỗi' },
        { key: 'context', label: 'Trình duyệt/URL' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'action', label: 'Hành động' },
    ];

    const renderTableRows = () => {
        if (filteredData.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={tableHeaders.length + 1} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                        <div className="text-gray-500">Không có dữ liệu để hiển thị</div>
                    </TableCell>
                </TableRow>
            );
        }

        const startIndex = (pagination.current - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const currentPageData = filteredData.slice(startIndex, endIndex);

        return currentPageData.map((record) => {
            const uniqueKey = record._id;
            const isSelected = selectedRowKeys.includes(uniqueKey);
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
                    }}
                >
                    <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #E5E7E9' }}>
                        <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectRow(uniqueKey)}
                            sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                        />
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', whiteSpace: 'nowrap' }}>
                        {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9', maxWidth: '300px' }}>
                        <span className="font-medium text-red-600 truncate block" title={record.message}>
                            {record.message}
                        </span>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }}>
                        <div className="text-xs text-gray-500">
                            <AntTooltip title={record.browser}>
                                <div className="truncate max-w-[150px]">{record.browser}</div>
                            </AntTooltip>
                            <div className="text-blue-500 truncate max-w-[150px]">{record.url}</div>
                        </div>
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }}>
                        {(() => {
                            let color = 'gold';
                            let text = 'Chờ xử lý';
                            if (record.status === 'fixed') { color = 'green'; text = 'Đã sửa'; }
                            if (record.status === 'ignored') { color = 'default'; text = 'Bỏ qua'; }
                            return <Tag color={color} className="rounded-2xl">{text}</Tag>;
                        })()}
                    </TableCell>

                    <TableCell sx={{ borderBottom: '1px solid #E5E7E9' }}>
                        <Space size="small">
                            <Button
                                type="primary"
                                ghost
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => { setSelectedError(record); setIsModalVisible(true); }}
                            >
                                Xem
                            </Button>
                            <Button
                                type="dashed"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                disabled={record.status === 'fixed'}
                                onClick={() => handleStatusUpdate(record._id, 'fixed')}
                            >
                                Đã sửa
                            </Button>
                        </Space>
                    </TableCell>
                </TableRow>
            );
        });
    };

    const filterOptions = {
        status: ['pending', 'fixed', 'ignored'],
    };

    const fieldLabels = {
        status: 'Trạng thái',
    };

    const optionLabels = {
        status: {
            pending: 'Chờ xử lý',
            fixed: 'Đã sửa',
            ignored: 'Bỏ qua',
        },
    };

    const filteredData = useMemo(() => {
        return errorLogs.filter(item => {
            const matchesSearch = item.message.toLowerCase().includes(searchText.toLowerCase()) ||
                item.url?.toLowerCase().includes(searchText.toLowerCase());

            const matchesStatus = !selectedFilters.status || selectedFilters.status.length === 0 || selectedFilters.status.includes(item.status);

            return matchesSearch && matchesStatus;
        });
    }, [errorLogs, searchText, selectedFilters]);


    // Selection handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select all filtered data
            setSelectedRowKeys(filteredData.map(item => item._id));
        } else {
            setSelectedRowKeys([]);
        }
    };

    const handleSelectRow = (id) => {
        const newSelectedRowKeys = selectedRowKeys.includes(id)
            ? selectedRowKeys.filter(key => key !== id)
            : [...selectedRowKeys, id];
        setSelectedRowKeys(newSelectedRowKeys);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3">
                        {selectedRowKeys.length > 0 && (
                            <DeleteSelectedButton
                                selectedCount={selectedRowKeys.length}
                                onClick={handleDeleteClick}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <RefreshButton onClick={() => refetch()} loading={isLoading} />
                        <ButtonFilter
                            filterOptions={filterOptions}
                            fieldLabels={fieldLabels}
                            optionLabels={optionLabels}
                            selectedFilters={selectedFilters}
                            setSelectedFilters={setSelectedFilters}
                            onFilter={setSelectedFilters}
                        />
                        <SearchBox
                            placeholder="Tìm kiếm lỗi..."
                            onSearch={(value) => setSearchText(value)}
                            className="border-gray-200"
                            rootClassName="md:w-96"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
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
                                        }}
                                    >
                                        <Checkbox
                                            indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredData.length}
                                            checked={filteredData.length > 0 && selectedRowKeys.length === filteredData.length}
                                            onChange={handleSelectAll}
                                            sx={{ transform: 'scale(0.8)', borderRadius: '8px' }}
                                        />
                                    </TableCell>
                                    {tableHeaders.map((header) => (
                                        <TableCell
                                            key={header.key}
                                            align={header.key === 'action' ? 'center' : 'left'}
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
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={tableHeaders.length + 1} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                                            <LoadingSpinner tip="Đang tải dữ liệu..." wrapperClassName="h-[200px]" />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    renderTableRows()
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>

                <div className="flex-shrink-0">
                    <Pagination
                        currentPage={pagination.current - 1}
                        totalPages={Math.ceil(filteredData.length / pagination.pageSize) || 1}
                        onPageChange={(page) => setPagination({ ...pagination, current: page + 1 })}
                    />
                </div>
            </div>

            <Modal
                title="Chi tiết lỗi"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalVisible(false)}>Đóng</Button>,
                    <Button key="fix" type="primary" onClick={() => { handleStatusUpdate(selectedError._id, 'fixed'); setIsModalVisible(false); }}>
                        Đánh dấu đã sửa
                    </Button>
                ]}
                width={800}
            >
                {selectedError && (
                    <div className="space-y-4">
                        <div>
                            <span className="font-bold text-gray-700">Thông điệp:</span>
                            <div className="p-2 bg-red-50 text-red-700 rounded mt-1 border border-red-100 font-mono text-sm">
                                {selectedError.message}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold text-gray-700">Thời gian:</span>
                                <div>{dayjs(selectedError.createdAt).format('DD/MM/YYYY HH:mm:ss')}</div>
                            </div>
                            <div>
                                <span className="font-bold text-gray-700">URL:</span>
                                <div className="truncate text-blue-600">{selectedError.url}</div>
                            </div>
                        </div>

                        <div>
                            <span className="font-bold text-gray-700">Trình duyệt:</span>
                            <div className="text-xs text-gray-500">{selectedError.browser}</div>
                        </div>

                        {selectedError.stack && (
                            <div>
                                <span className="font-bold text-gray-700">Stack Trace:</span>
                                <div className="max-h-40 overflow-auto p-2 bg-gray-800 text-green-400 font-mono text-xs rounded mt-1">
                                    <pre>{selectedError.stack}</pre>
                                </div>
                            </div>
                        )}

                        {(() => {
                            // Support both legacy single screenshot and new screenshots array
                            const images = selectedError.screenshots?.length > 0
                                ? selectedError.screenshots
                                : selectedError.screenshot
                                    ? [selectedError.screenshot]
                                    : [];

                            if (images.length === 0) return null;

                            return (
                                <div>
                                    <span className="font-bold text-gray-700 block mb-2">Ảnh chụp màn hình ({images.length}):</span>
                                    <Image.PreviewGroup>
                                        <div className="grid grid-cols-3 gap-2">
                                            {images.map((src, idx) => (
                                                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <Image
                                                        src={src}
                                                        alt={`Screenshot ${idx + 1}`}
                                                        className="!w-full !h-32 object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </Image.PreviewGroup>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </Modal>

            <ConfirmationModal
                open={isDeleteModalVisible}
                onClose={() => setIsDeleteModalVisible(false)}
                onConfirm={handleDeleteSelected}
                title="Xác nhận xóa báo cáo lỗi"
                content={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} báo cáo lỗi đã chọn? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmType="danger"
            />
        </div>
    );
};

function HeaderCell({ label, field, sortConfig, onSort }) {
    // Simplified HeaderCell without sort logic for now, or could add it back if needed
    return (
        <div className="relative flex items-center gap-1 select-none">
            <span className="font-bold">{label}</span>
        </div>
    );
}

export default AdminErrorLogsPage;
