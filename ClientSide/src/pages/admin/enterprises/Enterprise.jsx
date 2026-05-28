import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeleteCompany, useRestoreCompany } from '@features/enterprises/hooks/useCompanyMutations';
import useZones from '@features/industrialzone/hooks/useZones';
import { handlerDeleteCompanies, handlerRestoreCompanies } from '@services/companyService';
import EnterpriseHeader from '@features/enterprises/components/EnterpriseHeader';
import EnterpriseActionBar from '@features/enterprises/components/EnterpriseActionBar';
import EnterpriseTable from '@features/enterprises/components/EnterpriseTable';
import Notification from '@components/common/Notifications';
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import industryGroups from '@features/enterprises/components/IndustrGroups';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import { useCompanies, useDeletedCompanies } from '@features/company/hooks/useCompanyQueries';
import { usePreviewSoftDeleteCompany, usePreviewHardDeleteCompany, useHardDeleteCompany, useHardDeleteCompanies } from '@features/enterprises/hooks/useCompanyMutations';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { DataActions } from '@/components/ui/Button';
import { TableCell } from '@mui/material';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
const fieldLabels = {
    zone_name: 'Khu công nghiệp/ Khu chế xuất',
    company_type: 'Loại hình',
    industry_group: 'Nhóm ngành',
    industry: 'Ngành nghề',
};

const Enterprise = () => {
    const { setHeaderConfig } = useHeader();
    const navigate = useNavigate();
    const location = useLocation();
    const { pathname } = location;

    const { data: user } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || '';
    const currentZoneName = user?.zone_name || user?.user?.zone_name || '';
    const isManager = currentRole === 'manager';
    const { data: zonesForFilter } = useZones({
        page: 1,
        limit: 100, // Lấy tất cả các khu để làm filter
    });
    const zoneNames = zonesForFilter?.zones?.map(zone => zone.zone_name || zone.name) || [];
    const resolvedManagerZoneName = currentZoneName || zonesForFilter?.zones?.find(
        (zone) => String(zone.zone_id || zone.id) === String(currentZoneId || '')
    )?.zone_name || currentZoneId;

    const handleActions = {
        import: () => {
            const basePath = pathname.startsWith('/admin') ? '/admin' : '/manager';
            navigate(`${basePath}/business/import-enterprise`);
        },
        export: () => {
            const basePath = pathname.startsWith('/admin') ? '/admin' : '/manager';
            navigate(`${basePath}/reports`);
        },
    };

    useEffect(() => {
        setHeaderConfig({
            title: isManager
                ? `Doanh nghiệp | ${resolvedManagerZoneName || currentZoneId || 'KCN được phân công'}`
                : "Quản lý doanh nghiệp",
            description: isManager
                ? `Bạn đang thao tác trên dữ liệu doanh nghiệp thuộc ${resolvedManagerZoneName || currentZoneId || 'khu công nghiệp được phân công'}`
                : "Tất cả doanh nghiệp thuộc tất cả các khu chế xuất /khu công nghiệp",
            showWeather: false,
            rightContent: (
                <DataActions
                    onImport={handleActions.import}
                    onExport={handleActions.export}
                    showImport={true}
                />
            ),
        });
    }, [currentZoneId, isManager, navigate, pathname, resolvedManagerZoneName, setHeaderConfig]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: `Doanh nghiệp | ${resolvedManagerZoneName || currentZoneId || 'KCN được phân công'}`,
            description: `Bạn đang quản lý doanh nghiệp thuộc ${resolvedManagerZoneName || currentZoneId || 'khu công nghiệp được phân công'}`,
            showWeather: false,
            rightContent: (
                <DataActions
                    onImport={handleActions.import}
                    onExport={handleActions.export}
                    showImport={true}
                />
            ),
        });
    }, [currentZoneId, isManager, pathname, resolvedManagerZoneName, setHeaderConfig]);

    const [filterOptions, setFilterOptions] = useState({
        zone_name: [],
        company_type: ['Tư nhân', 'Nhà nước', 'Liên doanh', 'FDI', 'Hợp tác xã', 'Khác'],
        market: ['Xuất khẩu', 'Nội địa', 'Cả hai'],
        industry: industryGroups,
        industry_group: Object.keys(industryGroups),
    });

    const currentFilterOptions = useMemo(() => {
        const options = {
            ...(!isManager && { zone_name: zoneNames }), // Hide KCN filter option if user is manager
            company_type: ['Tư nhân', 'Nhà nước', 'Liên doanh', 'FDI', 'Hợp tác xã', 'Khác'],
            industry_group: Object.keys(industryGroups),
            industry: industryGroups,
        };
        return options;
    }, [zoneNames, isManager, industryGroups]);

    const [sort, setSort] = useState({ company_name: 1 });

    const handleSort = (columnKey, order) => {
        setSort(prev => {
            // Nếu bấm cột khác, reset cột trước, giữ cột mới với order vừa toggle
            if (!prev[columnKey]) return { [columnKey]: order };
            return { [columnKey]: order }; // cột hiện tại toggle giữa 1 và -1
        });

        setPagination(prev => ({ ...prev, page: 1 })); // reset trang về 1 khi sort
    };

    // Effect to show notification from navigation state
    useEffect(() => {
        if (location.state?.notification) {
            setNotification({ ...location.state.notification, open: true });
            // Clear the state so the notification doesn't re-appear on refresh
            navigate(location.pathname, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    const [selected, setSelected] = useState([]);
    const [notification, setNotification] = useState({ open: false, type: '', title: '', description: '' });
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'deleted'
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(() => (isManager ? {} : { zone_name: [] }));
    const [pagination, setPagination] = useState({ page: 1, limit: 20 });

    // Dialog state for Deletion Previews
    const [deleteDialogConfig, setDeleteDialogConfig] = useState({
        isOpen: false,
        actionType: 'soft-delete', // 'soft-delete' | 'hard-delete' | 'restore'
        ids: []
    });

    const isDeletedView = viewMode === 'deleted';

    // Sử dụng TanStack Query hooks
    const baseQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        filters: filters,
        sort: sort,
        debounceDelay: 500,
        isManagedView: isManager || false
    };

    const activeCompaniesQuery = useCompanies({
        ...baseQueryParams,
        enabled: viewMode === 'active',
    });

    const deletedCompaniesQuery = useDeletedCompanies({
        ...baseQueryParams,
        enabled: viewMode === 'deleted',
    });

    const currentQuery = viewMode === 'deleted' ? deletedCompaniesQuery : activeCompaniesQuery;

    // Mutations
    const deleteCompanyMutation = useDeleteCompany();
    const restoreCompanyMutation = useRestoreCompany();

    const hardDeleteCompanyMutation = useHardDeleteCompany();
    const hardDeleteCompaniesMutation = useHardDeleteCompanies();

    const previewSoftDeleteMutation = usePreviewSoftDeleteCompany();
    const previewHardDeleteMutation = usePreviewHardDeleteCompany();


    const companies = viewMode === 'deleted'
        ? (deletedCompaniesQuery.data?.deletedCompanies || [])
        : (activeCompaniesQuery.data?.companies || []);
    const totalItems = viewMode === 'deleted'
        ? (deletedCompaniesQuery.data?.totalItems || 0)
        : (activeCompaniesQuery.data?.totalItems || 0);
    const totalPages = viewMode === 'deleted'
        ? (deletedCompaniesQuery.data?.totalPages || 0)
        : (activeCompaniesQuery.data?.totalPages || 0);
    const currentPage = viewMode === 'deleted'
        ? (deletedCompaniesQuery.data?.currentPage || 1)
        : (activeCompaniesQuery.data?.currentPage || 1);
    const loading = currentQuery.isLoading;
    const error = currentQuery.error?.message;
    const isRefetching = currentQuery.isFetching;

    const selectedCount = selected.length;

    const handleAddClick = () => {
        const basePath = pathname.startsWith('/admin') ? '/admin' : '/manager';
        navigate(`${basePath}/business/create-business`);
    };

    const handleEdit = (companyId) => {
        const basePath = pathname.startsWith('/admin') ? '/admin' : '/manager';
        navigate(`${basePath}/business/update-business/${companyId}`);
    };

    const handleDelete = (companyId) => {
        setDeleteDialogConfig({
            isOpen: true,
            actionType: viewMode === 'active' ? 'soft-delete' : 'hard-delete',
            ids: [companyId]
        });
    };

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        setDeleteDialogConfig({
            isOpen: true,
            actionType: viewMode === 'active' ? 'soft-delete' : 'hard-delete',
            ids: selected
        });
    };

    const handleConfirmSuccess = () => {
        const actionText = deleteDialogConfig.actionType === 'restore' ? 'khôi phục' : (deleteDialogConfig.actionType === 'soft-delete' ? 'vô hiệu hóa' : 'xóa vĩnh viễn');
        setNotification({
            open: true,
            type: 'success',
            title: 'Thành công',
            description: `Đã ${actionText} ${deleteDialogConfig.ids.length} doanh nghiệp thành công.`
        });

        // Chỉ xóa selection nếu các item đang được xóa/khôi phục nằm trong selection
        if (deleteDialogConfig.ids.length > 1 || (selected.length === 1 && deleteDialogConfig.ids[0] === selected[0])) {
            setSelected([]);
        }

        refetch();
    };

    const handleRestore = (companyId) => {
        setDeleteDialogConfig({
            isOpen: true,
            actionType: 'restore',
            ids: [companyId]
        });
    };

    const handleRestoreSelected = () => {
        if (selectedCount === 0) return;
        setDeleteDialogConfig({
            isOpen: true,
            actionType: 'restore',
            ids: selected
        });
    };

    // Handler functions for TanStack Query
    const handlePageChange = useCallback((newPage) => {
        setSelected([]);
        setPagination(prev => ({ ...prev, page: newPage }));
    }, []);

    const handleItemsPerPageChange = useCallback((newLimit, newPage = 1) => {
        setSelected([]);
        setPagination({ page: newPage, limit: newLimit });
    }, []);

    const handleSearch = useCallback((searchValue) => {
        setSearchTerm(searchValue);
        setPagination(prev => ({ ...prev, page: 1 }));
    }, []);
    const handleFilter = useCallback((filterValues) => {
        if (isManager) {
            const { zone_name, ...rest } = filterValues || {};
            setFilters(rest);
        } else {
            setFilters(filterValues);
        }
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [isManager]);

    const refetch = useCallback(() => {
        if (viewMode === 'deleted') {
            deletedCompaniesQuery.refetch();
        } else {
            activeCompaniesQuery.refetch();
        }
    }, [viewMode, activeCompaniesQuery, deletedCompaniesQuery]);

    return (
        <div className="flex flex-col gap-5 h-full w-full bg-gray-50 pt-2 overflow-hidden">

            <EnterpriseActionBar
                selectedCount={selectedCount}
                viewMode={viewMode}
                isManager={isManager}
                onDeleteSelected={handleDeleteSelected}
                onRestoreSelected={handleRestoreSelected}
                onFilter={handleFilter}
                filterOptions={currentFilterOptions}
                fieldLabels={fieldLabels}
                onSearch={handleSearch}
                onAdd={handleAddClick}
                onExport={() => {
                    const basePath = pathname.startsWith('/admin') ? '/admin' : '/manager';
                    navigate(`${basePath}/reports`);
                }}
                onViewModeChange={() => {
                    const newViewMode = viewMode === 'active' ? 'deleted' : 'active';
                    setViewMode(newViewMode);
                    setSelected([]); // Reset selection when switching views
                    // Force page reset by calling handlePageChange
                    handlePageChange(1);
                }}
                zonesList={zonesForFilter?.zones || []}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {loading && isRefetching ? (
                    <LoadingSpinner tip={`Đang tải ${viewMode === 'active' ? 'doanh nghiệp' : 'doanh nghiệp đã xóa'}...`} wrapperClassName="h-full" />
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm border">
                            <div className="text-red-500 text-xl font-medium mb-2">⚠️ Lỗi tải dữ liệu</div>
                            <div className="text-gray-600 mb-4">{error}</div>
                            <div className="text-sm text-gray-500 mb-4">
                                {viewMode === 'active' ? 'Không thể tải danh sách doanh nghiệp đang hoạt động' : 'Không thể tải danh sách doanh nghiệp đã xóa'}
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                ) : companies && companies.length && !loading && !isRefetching === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm border">
                            <div className="text-gray-400 text-6xl mb-4">
                                {viewMode === 'active' ? '🏢' : '🗑️'}
                            </div>
                            <div className="text-gray-600 text-lg font-medium mb-2">
                                {viewMode === 'active' ? 'Chưa có doanh nghiệp nào' : 'Không có doanh nghiệp đã xóa'}
                            </div>
                            <div className="text-gray-500 text-sm">
                                {viewMode === 'active'
                                    ? 'Hãy thêm doanh nghiệp đầu tiên để bắt đầu quản lý'
                                    : 'Tất cả doanh nghiệp đều đang hoạt động'
                                }
                            </div>
                            {viewMode === 'active' && (
                                <button
                                    onClick={handleAddClick}
                                    className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Thêm doanh nghiệp
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <EnterpriseTable
                        // key={selected.length + viewMode} // Force re-render on selection or viewMode change
                        data={companies || []}
                        selected={selected}
                        setSelected={setSelected}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRestore={handleRestore} // Pass single restore handler
                        viewMode={viewMode} // Pass viewMode to table
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={pagination.limit}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        sort={sort}
                        onSort={handleSort}
                        loading={isRefetching}
                    />
                )}
            </div>

            <Notification
                open={notification.open}
                type={notification.type}
                title={notification.title}
                description={notification.description}
                onClose={() => setNotification({ ...notification, open: false })}
            />

            <ConfirmDeleteDialog
                open={deleteDialogConfig.isOpen}
                onClose={() => setDeleteDialogConfig(prev => ({ ...prev, isOpen: false }))}
                onSuccess={handleConfirmSuccess}
                actionType={deleteDialogConfig.actionType}
                selectedIds={deleteDialogConfig.ids}
                previewMutation={deleteDialogConfig.actionType === 'hard-delete' ? previewHardDeleteMutation : (deleteDialogConfig.actionType === 'soft-delete' ? previewSoftDeleteMutation : null)}
                deleteMutation={
                    deleteDialogConfig.ids.length > 1
                        ? (deleteDialogConfig.actionType === 'hard-delete'
                            ? hardDeleteCompaniesMutation
                            : (deleteDialogConfig.actionType === 'restore'
                                ? {
                                    mutate: async (ids, options) => {
                                        try {
                                            await handlerRestoreCompanies(ids);
                                            options?.onSuccess?.();
                                        } catch (e) {
                                            options?.onError?.(e);
                                        }
                                    },
                                    isLoading: restoreCompanyMutation.isPending,
                                    reset: () => { }
                                }
                                : {
                                    mutate: async (ids, options) => {
                                        try {
                                            await handlerDeleteCompanies(ids);
                                            options?.onSuccess?.();
                                        } catch (e) {
                                            options?.onError?.(e);
                                        }
                                    },
                                    isLoading: false,
                                    reset: () => { }
                                }))
                        : (deleteDialogConfig.actionType === 'hard-delete' ? hardDeleteCompanyMutation : (deleteDialogConfig.actionType === 'restore' ? restoreCompanyMutation : deleteCompanyMutation))
                }
                columns={['Doanh nghiệp', 'Tài khoản người dùng/ Đại diện']}
                renderRow={(item, idx) => {
                    const companyName = item.company_name || item.name || 'Không xác định';
                    const affectedUsers = item.affectedUsers || [];
                    const userNames = affectedUsers.length > 0
                        ? affectedUsers.map((u) => u.full_name || u.email || 'Không có tên').join(', ')
                        : 'Không có';

                    return (
                        <>
                            <TableCell sx={{ borderBottom: '1px solid #f0f0f0' }}>{companyName}</TableCell>
                            <TableCell sx={{ borderBottom: '1px solid #f0f0f0' }}>{userNames}</TableCell>
                        </>
                    );
                }}
            />

        </div>
    );
};

export default Enterprise;
