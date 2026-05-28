import React, { useCallback, useMemo, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpZA, KeyRound } from 'lucide-react';
import { ActionButtons } from '@components/ui/Button';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import Pagination from '@components/common/Pagination';
import ConfirmationModal from '@components/common/ConfirmationModal';
import { useDeleteUser, useAdminResetPassword } from '@features/admin/hooks/useUserQueries';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
import toast from '@/utils/toast';

function HeaderCell({ label, field, sortConfig, onSort }) {
    const sortOrder = sortConfig[field] || 0;
    const handleSort = () => {
        const nextOrder = sortOrder === 1 ? -1 : 1;
        onSort?.(field, nextOrder);
    };

    return (
        <div className="group relative flex cursor-pointer select-none items-center justify-center gap-1" onClick={handleSort}>
            <span className="font-bold">{label}</span>
            {sortOrder === 1 && <ArrowDownAZ size={16} className="text-blue-500" />}
            {sortOrder === -1 && <ArrowUpZA size={16} className="text-blue-500" />}
            {sortOrder === 0 && <ArrowDownAZ size={16} className="text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />}
        </div>
    );
}

const statusStyle = {
    'Đang Hoạt Động': 'flex justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 mx-auto max-w-fit min-w-[120px]',
    'Ngưng Hoạt Động': 'flex justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 mx-auto max-w-fit min-w-[120px]',
};

export default function UserTable({
    type = 'company',
    data = [],
    loading = false,
    page = 1,
    pageSize = 10,
    total = 0,
    onPageChange,
    selected = [],
    onSelectionChange,
    sort = {},
    onSort,
    isDeletedView = false,
    onDeleteUser,
    onRestoreUser,
}) {
    const navigate = useNavigate();
    const deleteUserMutation = useDeleteUser();
    const resetPasswordMutation = useAdminResetPassword();
    const [resetTarget, setResetTarget] = useState(null);
    const { data: authUser } = useAuthenticatedUser();
    const currentRole = authUser?.role || authUser?.user?.role;
    const basePath = currentRole === 'manager' ? '/manager' : '/admin';
    const isManagerSeatAccount = useCallback((row) => row?.role === 'manager', []);

    const handleEdit = useCallback((userId) => {
        navigate(`${basePath}/user/update/${userId}`);
    }, [basePath, navigate]);

    const handleDelete = useCallback((userId) => {
        deleteUserMutation.mutate(userId, {
            onSuccess: () => {
                toast.success('Xóa tài khoản thành công', 'Tài khoản đã được xóa khỏi hệ thống.');
            },
            onError: (error) => {
                const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản.';
                toast.error('Xóa tài khoản thất bại', errorMessage);
            },
        });
    }, [deleteUserMutation]);

    const handleResetPassword = useCallback(async () => {
        if (!resetTarget?.user_id) return;

        try {
            const data = await resetPasswordMutation.mutateAsync(resetTarget.user_id);
            toast.success('Thành công', data?.message || 'Mật khẩu đã được đặt lại');
        } catch (error) {
            toast.error('Lỗi', error?.response?.data?.message || error?.message || 'Không thể đặt lại mật khẩu');
            throw error;
        }
    }, [resetPasswordMutation, resetTarget]);

    const renderStatus = useCallback((row) => {
        if (isDeletedView) {
            return (
                <span className={statusStyle['Ngưng Hoạt Động'] || 'bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs'}>
                    Đã vô hiệu hóa
                </span>
            );
        }

        return (
            <span className={statusStyle[row.status] || 'bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs'}>
                {row.status || 'N/A'}
            </span>
        );
    }, [isDeletedView]);

    const renderActions = useCallback((row) => {
        if (isManagerSeatAccount(row)) {
            if (isDeletedView) {
                return (
                    <span className="mx-auto inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Theo KCN
                    </span>
                );
            }

            return (
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setResetTarget({ user_id: row.user_id, full_name: row.full_name, email: row.email });
                        }}
                        title="Đặt lại mật khẩu"
                        className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50"
                    >
                        <KeyRound size={16} />
                    </button>
                    <ActionButtons onEdit={() => handleEdit(row.user_id)} />
                </div>
            );
        }

        if (isDeletedView) {
            return (
                <ActionButtons
                    onRestore={onRestoreUser ? () => onRestoreUser(row.user_id) : undefined}
                    onDelete={onDeleteUser ? () => onDeleteUser(row.user_id) : undefined}
                />
            );
        }

        return (
            <div className="flex items-center justify-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setResetTarget({ user_id: row.user_id, full_name: row.full_name, email: row.email });
                    }}
                    title="Đặt lại mật khẩu"
                    className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50"
                >
                    <KeyRound size={16} />
                </button>
                <ActionButtons
                    onEdit={() => handleEdit(row.user_id)}
                    onDelete={onDeleteUser ? () => onDeleteUser(row.user_id) : () => handleDelete(row.user_id)}
                    isDeleteConfirm={!onDeleteUser}
                    deleteConfirmTitle="Xác nhận xóa"
                    deleteConfirmDescription="Bạn có chắc chắn muốn xóa tài khoản này?"
                />
            </div>
        );
    }, [handleDelete, handleEdit, isDeletedView, isManagerSeatAccount, onDeleteUser, onRestoreUser]);

    const columns = useMemo(() => {
        const userCode = {
            label: 'Mã tài khoản',
            key: 'user_id',
            render: (row) => <span className="cursor-pointer font-semibold text-[#3065C7]">{row.user_id}</span>,
        };
        const name = { label: 'Họ tên', key: 'full_name' };
        const email = {
            label: 'Email',
            key: 'email',
            render: (row) => (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{row.email}</span>
            ),
        };
        const companyName = {
            label: 'Doanh nghiệp',
            key: 'company_name',
            render: (row) => (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{row.company_name || 'N/A'}</span>
            ),
        };
        const zoneName = { label: 'Khu công nghiệp', key: 'zone_name' };
        const status = { label: 'Trạng thái', key: 'status', render: renderStatus };
        const actions = { label: 'Tùy chọn', key: 'actions', render: renderActions };

        return {
            company: [userCode, name, email, companyName, zoneName, status, actions],
            manager: [userCode, name, email, zoneName, status, actions],
            admin: [userCode, name, email, zoneName, status, actions],
            superadmin: [userCode, name, email, zoneName, status, actions],
        };
    }, [renderActions, renderStatus]);

    const cols = useMemo(() => columns[type] || [], [columns, type]);

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = data
                .filter((row) => !isManagerSeatAccount(row))
                .map((row) => row.user_id || row.id)
                .filter(Boolean);
            onSelectionChange?.(newSelected);
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleClick = (event, row) => {
        event.stopPropagation();
        if (isManagerSeatAccount(row)) return;
        const rowId = row.user_id || row.id;
        if (!rowId) return;

        let newSelected = [];
        if (selected.includes(rowId)) {
            newSelected = selected.filter((id) => id !== rowId);
        } else {
            newSelected = [...selected, rowId];
        }
        onSelectionChange?.(newSelected);
    };

    const isSelected = (id) => selected.includes(id);
    const selectableRows = useMemo(() => data.filter((row) => !isManagerSeatAccount(row)), [data, isManagerSeatAccount]);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex flex-grow flex-col overflow-x-auto">
                <TableContainer
                    component={Paper}
                    sx={{
                        minWidth: '1000px',
                        border: '1px solid #E5E7E9',
                        borderRadius: '14px',
                        boxShadow: 'none',
                    }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" sx={{ background: '#FCFCFD' }}>
                                    <Checkbox
                                        color="primary"
                                        checked={selectableRows.length > 0 && selected.length === selectableRows.length}
                                        indeterminate={selected.length > 0 && selected.length < selectableRows.length}
                                        onChange={handleSelectAllClick}
                                        disabled={selectableRows.length === 0}
                                    />
                                </TableCell>
                                {cols.map((col, i) => (
                                    <TableCell
                                        key={i}
                                        align="center"
                                        sx={{
                                            background: '#FCFCFD',
                                            whiteSpace: 'nowrap',
                                            maxWidth: col.key === 'address' ? '200px' : '150px',
                                            fontWeight: 'bold',
                                            color: '#101828',
                                        }}
                                    >
                                        <HeaderCell label={col.label} field={col.key} sortConfig={sort} onSort={onSort} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={cols.length + 1} align="center">
                                        <LoadingSpinner inline size="small" tip="Đang tải dữ liệu người dùng..." />
                                    </TableCell>
                                </TableRow>
                            ) : data.length > 0 ? (
                                data.map((row) => {
                                    const isItemSelected = isSelected(row.user_id || row.id);
                                    const handleRowClick = () => {
                                        if (type === 'management') {
                                            navigate(`${basePath}/user/management/${row.user_id || row.id}`);
                                        }
                                    };

                                    return (
                                        <TableRow
                                            hover
                                            key={row.user_id || row.id}
                                            selected={isItemSelected}
                                            onClick={handleRowClick}
                                            sx={{
                                                cursor: 'pointer',
                                                '&.Mui-selected': { backgroundColor: '#FAFAFA' },
                                            }}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    checked={isItemSelected}
                                                    disabled={isManagerSeatAccount(row)}
                                                    onClick={(e) => handleClick(e, row)}
                                                />
                                            </TableCell>
                                            {cols.map((col, i) => (
                                                <TableCell key={i} align="center">
                                                    {col.render ? col.render(row) : row[col.key]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={cols.length + 1} align="center">
                                        <span className="text-gray-500">Chưa có tài khoản nào được tạo. Vui lòng tạo tài khoản mới.</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>

            <Pagination
                currentPage={Math.max(0, (page || 1) - 1)}
                totalPages={total || 0}
                onPageChange={(next) => onPageChange?.(next + 1)}
            />

            <ConfirmationModal
                open={!!resetTarget}
                onClose={() => setResetTarget(null)}
                onConfirm={handleResetPassword}
                onAfterConfirm={() => setResetTarget(null)}
                title="Đặt lại mật khẩu"
                content={(
                    <div className="space-y-3 text-left">
                        <p>
                            Email đặt lại mật khẩu sẽ được gửi tới <b>{resetTarget?.email || 'tài khoản này'}</b>.
                        </p>
                        <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm font-medium text-[#1D4ED8]">
                            Người dùng sẽ nhận mật khẩu mới qua email và phải đổi lại mật khẩu ở lần đăng nhập tiếp theo.
                        </div>
                    </div>
                )}
                confirmText="Gửi email đặt lại"
                loadingText="Đang gửi email..."
                confirmType="info"
                isLoading={resetPasswordMutation.isPending}
                disableClose={resetPasswordMutation.isPending}
            />
        </div>
    );
}
