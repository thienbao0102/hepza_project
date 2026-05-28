import React, { useState } from 'react';
import { useEffect } from 'react';
import { ExportToolbar, ExportHistoryTable } from './ExportHelper';
import { useExportEnterprise } from '@/features/enterprises/hooks/useExportEnterprise';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';

import { DeleteSelectedButton } from '@/components/ui/Button';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const ExportEnterprise = () => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const {
        selectedTabs,
        loading,
        selectedFilters,
        setSelectedFilters,
        tabs,
        handleTabClick,
        handleExport,
        exportHistory,
        handleDeleteHistory,
        handleBulkDeleteHistory,
        handleDownloadHistory,
        handleReExport,
        user,
        zones,
        companies
    } = useExportEnterprise();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const currentUser = user?.user || user || {};
    const isManager = currentUser?.role === 'manager';
    const { data: zoneData } = useZone(currentUser?.zone_id, { enabled: !!currentUser?.zone_id });
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: zoneData?.zone?.zone_name || currentUser?.zone_name,
        zoneId: currentUser?.zone_id,
        zones: zones || [],
    });
    // Local state for history selection (for bulk actions if needed later)
    const [selectedExports, setSelectedExports] = React.useState([]);

    // Sort State
    const [sortConfig, setSortConfig] = useState({ created_at: -1 });

    const handleSort = (key, direction) => {
        setSortConfig({ [key]: direction });
    };

    const sortedHistory = React.useMemo(() => {
        let sortableItems = [...exportHistory];
        const key = Object.keys(sortConfig)[0];
        const direction = sortConfig[key];

        if (key && direction) {
            sortableItems.sort((a, b) => {
                let aValue = a[key];
                let bValue = b[key];

                // Handle null/undefined
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // Specific handling for dates if needed, or string comparison
                if (key === 'created_at') {
                    const dateA = new Date(aValue).getTime();
                    const dateB = new Date(bValue).getTime();
                    return direction === 1 ? dateA - dateB : dateB - dateA;
                }

                if (typeof aValue === 'string') {
                    return direction === 1
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                if (aValue < bValue) {
                    return direction === 1 ? -1 : 1;
                }
                if (aValue > bValue) {
                    return direction === 1 ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [exportHistory, sortConfig]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Calculate Pagination
    const totalItems = sortedHistory.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedHistory = sortedHistory.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    useEffect(() => {
        setHeaderConfig({
            title: "Báo cáo dữ liệu doanh nghiệp",
            description: "Báo cáo dữ liệu doanh nghiệp theo bộ lọc tùy chọn",
            showWeather: false,
            showDatePicker: false,
        });
        setBreadcrumbItems([
            {
                key: 'business/export-enterprise',
                title: "Báo cáo"
            },
        ]);
    }, []);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Báo cáo", managerZoneLabel),
            description: `Báo cáo dữ liệu doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: false,
            showDatePicker: false,
        });
        setBreadcrumbItems([
            {
                key: 'business/export-enterprise',
                title: `Báo cáo | ${managerZoneLabel}`
            },
        ]);
    }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white rounded-[14px] shadow-sm border-[#94A3B830] border-[1px]">
            {/* --- TOP TOOLBAR --- */}
            <ExportToolbar
                tabs={tabs}
                selectedTabs={selectedTabs}
                handleTabClick={handleTabClick}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                handleExport={handleExport}
                loading={loading}
                user={user}
                zones={zones}
                companies={companies}
            />

            {/* --- HISTORY TABLE --- */}
            <div className="flex-1 overflow-hidden p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Lịch sử xuất dữ liệu</h3>

                    {/* Bulk Action Toolbar */}
                    {selectedExports.length > 0 && (
                        <>
                            <DeleteSelectedButton
                                selectedCount={selectedExports.length}
                                onClick={() => setIsDeleteModalOpen(true)}
                            />
                            <ConfirmationModal
                                open={isDeleteModalOpen}
                                onClose={() => setIsDeleteModalOpen(false)}
                                onConfirm={async () => {
                                    await handleBulkDeleteHistory(selectedExports);
                                    setSelectedExports([]);
                                }}
                                title="Xác nhận xóa"
                                content={`Bạn có chắc chắn muốn xóa ${selectedExports.length} mục đã chọn không? Hành động này không thể hoàn tác.`}
                                confirmText="Xóa"
                                cancelText="Hủy"
                                confirmType="danger"
                            />
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-hidden">
                    <ExportHistoryTable
                        data={paginatedHistory}
                        selected={selectedExports}
                        setSelected={setSelectedExports}
                        loading={loading}
                        onDelete={handleDeleteHistory}
                        onBulkDelete={handleBulkDeleteHistory}
                        onDownload={handleDownloadHistory}
                        onReExport={handleReExport}
                        sort={sortConfig}
                        onSort={handleSort}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ExportEnterprise;
