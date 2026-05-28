import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@features/company/hooks/useCompanyQueries';
import { useAuth } from '@app/providers/auth/AuthProvider';
import useZones from '@features/industrialzone/hooks/useZones';
import EnterpriseActionBar from '@features/enterprises/components/EnterpriseActionBar';
import EnterpriseTable from '@features/enterprises/components/EnterpriseTable';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { DataActions } from '@/components/ui/Button';
import industryGroups from '@features/enterprises/components/IndustrGroups';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';

const EnterpriseManager = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { setHeaderConfig } = useHeader();

    const [selected, setSelected] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState({ company_name: 1 });
    const [activeFilters, setActiveFilters] = useState({});

    const handleActions = {
        import: () => { navigate('/manager/business/import-enterprise'); },
        export: () => { navigate('/manager/reports'); },
    };

    // Fetch zones for filter
    const { data: zonesForFilter } = useZones({
        page: 1,
        limit: 100,
    });
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: user?.zone_name || user?.user?.zone_name,
        zoneId: user?.zone_id || user?.user?.zone_id,
        zones: zonesForFilter?.zones || [],
    });

    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý doanh nghiệp",
            description: "Tất cả doanh nghiệp thuộc khu công nghiệp",
            showWeather: false,
            rightContent: (
                <DataActions
                    onImport={handleActions.import}
                    onExport={handleActions.export}
                    showImport={user?.role === 'admin'}
                />
            ),
        });
    }, [user]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle('Doanh nghiệp', managerZoneLabel),
            description: `Danh sách doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: false,
            rightContent: (
                <DataActions
                    onImport={handleActions.import}
                    onExport={handleActions.export}
                    showImport={false}
                />
            ),
        });
    }, [managerZoneLabel, user]);

    // Bật cờ isManagedView để lấy danh sách rút gọn chỉ áp dụng cho KCN của Manager
    const { data, isLoading, error, isFetching, refetch } = useCompanies({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        filters: activeFilters,
        sort,
        debounceDelay: 500,
        isManagedView: true,
    });

    const companies = data?.companies || [];
    const totalItems = data?.totalItems || 0;
    const totalPages = data?.totalPages || 0;
    const currentPage = data?.currentPage || 1;

    const handlePageChange = useCallback((newPage) => {
        setSelected([]);
        setPagination(prev => ({ ...prev, page: newPage }));
    }, []);

    const handleSearch = useCallback((val) => {
        setSearchTerm(val);
        setPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const handleFilter = useCallback((newFilters) => {
        setActiveFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const handleSort = (columnKey, order) => {
        setSort({ [columnKey]: order });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const fieldLabels = {
        zone_name: 'Khu công nghiệp/ Khu chế xuất',
        company_type: 'Loại hình',
        industry_group: 'Nhóm ngành',
        industry: 'Ngành nghề',
    };

    const filterOptions = {
        company_type: ['Tư nhân', 'Nhà nước', 'Liên doanh', 'FDI', 'Hợp tác xã', 'Khác'],
        industry_group: Object.keys(industryGroups),
        industry: industryGroups,
    };

    return (
        <div className="flex flex-col gap-5 h-full w-full bg-gray-50 pt-2 overflow-hidden">
            <EnterpriseActionBar
                viewMode="active"
                onSearch={handleSearch}
                onFilter={handleFilter}
                filterOptions={filterOptions}
                fieldLabels={fieldLabels}
                showAddButton={false}
                zonesList={zonesForFilter?.zones || []}
                hideViewModeToggle={true}
                minimal={true}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {isLoading && !isFetching ? (
                    <LoadingSpinner tip="Đang tải doanh nghiệp..." wrapperClassName="h-full" />
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm border">
                            <div className="text-red-500 text-xl font-medium mb-2">⚠️ Lỗi tải dữ liệu</div>
                            <div className="text-gray-600 mb-4">{error.message || 'Không thể tải dữ liệu.'}</div>
                            <button
                                onClick={() => refetch()}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm border">
                            <div className="text-gray-600 text-lg font-medium mb-2">
                                Khu công nghiệp này chưa có doanh nghiệp nào
                            </div>
                        </div>
                    </div>
                ) : (
                    <EnterpriseTable
                        data={companies}
                        selected={selected}
                        setSelected={setSelected}
                        viewMode="active"
                        showActions={false}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={pagination.limit}
                        onPageChange={handlePageChange}
                        sort={sort}
                        onSort={handleSort}
                        loading={isFetching}
                        showSelection={false}
                    />
                )}
            </div>
        </div>
    );
};

export default EnterpriseManager;
