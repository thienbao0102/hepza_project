import { useState, useCallback, lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import LoadingSpinner from "@components/ui/LoadingSpinner";
import { AddZoneButton, DataActions } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { ZoneList } from "@features/industrialzone/components/ZoneList";
import useZones from "@features/industrialzone/hooks/useZones";
import { useAuth } from "@app/providers/auth/AuthProvider";
import toast from "@/utils/toast";
import { useHeader } from "@/components/common/Header/HeaderContext";
import ConfirmDeleteDialog from "@components/common/ConfirmDeleteDialog";
import { useDeleteZones, usePreviewSoftDeleteZone } from "@features/industrialzone/hooks/useZoneMutations";

import ButtonFilter from "@components/ui/ButtonFilter";
import { Button } from "antd";
import { Trash2, MousePointer2, Activity, ArchiveX, Factory } from "lucide-react"; // ADDED for Batch Delete Icon
import { IconButton, Tooltip } from "@mui/material"; // ADDED For MUI buttons
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";
import { buildZoneLocationFilterOptions } from "@features/industrialzone/utils/locationFilterOptions";

const fieldLabels = {
    zone_name: 'Khu công nghiệp/ Khu chế xuất',
    status: 'Trạng thái',
    location: 'Khu vực',
};

const optionLabels = {
    status: {
        "Đang hoạt động": (
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#14A155]"></span>
                <span>Đang hoạt động</span>
            </div>
        ),
        "Ngưng hoạt động": (
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF4D4F]"></span>
                <span>Ngưng hoạt động</span>
            </div>
        ),
        "Active": (
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#14A155]"></span>
                <span>Đang hoạt động</span>
            </div>
        ),
        "Inactive": (
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF4D4F]"></span>
                <span>Ngưng hoạt động</span>
            </div>
        )
    }
};

const MapComponent = lazy(() =>
    import('@components/common/Map').then((m) => ({ default: m.MapComponent }))
);

// ========================= FIX CỨNG TỌA ĐỘ =========================
const zoneCoordinates = {
    "KCN An Hạ": { lat: 10.758, lon: 106.515 },
    "KCN Bình Chiểu": { lat: 10.874, lon: 106.741 },
    "KCN Cát Lái 2": { lat: 10.761, lon: 106.791 },
    "KCN Cơ Khí Ô tô": { lat: 11.018, lon: 106.541 },
    "KCN Đông Nam": { lat: 11.011, lon: 106.633 },
    "KCN Hiệp Phước": { lat: 10.644, lon: 106.721 },
    "KCN Lê Minh Xuân": { lat: 10.729, lon: 106.548 },
    "KCN Lê Minh Xuân 3": { lat: 10.718, lon: 106.529 },
    "KCN Tân Bình": { lat: 10.825, lon: 106.618 },
    "KCN Tân Phú Trung": { lat: 10.963, lon: 106.556 },
    "KCN Tân Tạo": { lat: 10.749, lon: 106.58 },
    "KCN Tân Thới Hiệp": { lat: 10.865, lon: 106.64 },
    "KCN Tây Bắc Củ Chi": { lat: 10.99, lon: 106.5 },
    "KCN Vĩnh Lộc": { lat: 10.822, lon: 106.58 },
    "KCX Linh Trung 1": { lat: 10.875, lon: 106.772 },
    "KCX Linh Trung 2": { lat: 10.887, lon: 106.764 },
    "KCX Tân Thuận": { lat: 10.742, lon: 106.731 },
};

const IndustrialZones = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const role = user?.role;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isCompany = role === 'company';
    const companyZoneId = user?.zone_id;
    const currentZoneId = user?.zone_id || '';
    const currentZoneName = user?.zone_name || '';
    const [showImport, setShowImport] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const scrollContainerRef = useRef(null);
    const [selectedFilters, setSelectedFilters] = useState({});
    const [queryParams, setQueryParams] = useState({
        page: 1,
        limit: 8,
        search: "",
        filters: {},
    });


    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedZones, setSelectedZones] = useState([]);

    const [dialogState, setDialogState] = useState({
        isOpen: false,
        actionType: null, // 'soft-delete' | 'hard-delete'
        selectedIds: [], // CHANGED from selectedId to support multiple
    });

    // Mutations for delete
    const previewSoftDeleteMutation = usePreviewSoftDeleteZone();
    const deleteMutation = useDeleteZones();

    // Fetch data for list
    const { data, isLoading, error, isFetching, refetch } = useZones(queryParams);
    const { zones = [], totalItems = 0, totalPages = 0, currentPage = 1 } =
        data || {};

    // Fetch data for filters (get all to populate options)
    const { data: allZonesData } = useZones({ page: 1, limit: 1000 });
    const allZones = allZonesData?.zones || [];

    const filterOptions = useMemo(() => {
        const options = {
            zone_name: [],
            status: [],
            location: {} // Changed to object for cascading data
        };

        if (allZones.length > 0) {
            options.zone_name = [...new Set(allZones.map(z => z.zone_name).filter(Boolean))];
            // Hardcode status options to ensure only valid values are shown
            options.status = ['Đang hoạt động', 'Ngưng hoạt động'];

                        options.location = buildZoneLocationFilterOptions(allZones);
        }

        return options;
    }, [allZones]);

    const resolvedManagerZoneName = useMemo(
        () => resolveManagerZoneLabel({
            zoneName: currentZoneName,
            zoneId: currentZoneId,
            zones: allZones,
        }),
        [allZones, currentZoneId, currentZoneName],
    );

    const filteredZones = useMemo(() => {
        return zones;
    }, [zones]);

    const displayedTotalItems = totalItems;

    // Infinite scroll: accumulate zones
    const [accumulatedZones, setAccumulatedZones] = useState([]);
    const prevParamsRef = useRef(null);
    const pageRef = useRef(queryParams.page);
    pageRef.current = queryParams.page;

    useEffect(() => {
        const paramsKey = JSON.stringify({ search: queryParams.search, filters: queryParams.filters });
        const safeZones = Array.isArray(zones) ? zones : [];

        if (prevParamsRef.current !== paramsKey) {
            prevParamsRef.current = paramsKey;
            setAccumulatedZones(safeZones);
            return;
        }

        if (queryParams.page === 1) {
            setAccumulatedZones(safeZones);
            return;
        }

        if (safeZones.length === 0) {
            return;
        }

        setAccumulatedZones(prev => {
            const existingIds = new Set(prev.map(z => z.zone_id));
            const newZones = safeZones.filter(z => !existingIds.has(z.zone_id));
            if (newZones.length === 0) return prev;
            return [...prev, ...newZones];
        });
    }, [zones, queryParams.filters, queryParams.page, queryParams.search]);

    // Use refs to avoid stale closures in scroll handler
    const hasMore = queryParams.page < totalPages;
    const hasMoreRef = useRef(hasMore);
    hasMoreRef.current = hasMore;
    const isFetchingRef = useRef(isFetching);
    isFetchingRef.current = isFetching;

    const isLoadingMore = isFetching && queryParams.page > 1;

    const handleLoadMore = useCallback(() => {
        if (hasMoreRef.current && !isFetchingRef.current) {
            setQueryParams(prev => ({ ...prev, page: prev.page + 1 }));
        }
    }, []);


    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý khu công nghiệp",
            description: "Thông tin tất cả khu công nghiệp",
            showWeather: true,
            showDatePicker: false,
            showTotalItem: true, // Nhớ bật cái này lên nếu mặc định là false
            totalItem: displayedTotalItems ? displayedTotalItems.toLocaleString() : '0',
        });

        setBreadcrumbItems([
            {
                key: '/industrialZone',
                title: "Quản lý Khu công nghiệp và Khu chế xuất"
            },
        ]);
        // 3. THÊM DEPENDENCY: Để khi displayedTotalItems thay đổi (load xong data), nó sẽ cập nhật lại Header
    }, [displayedTotalItems]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Khu công nghiệp", resolvedManagerZoneName),
            description: `Bạn đang xem khu công nghiệp thuộc phạm vi quản lý của ${resolvedManagerZoneName}.`,
            showWeather: true,
            showDatePicker: false,
            showTotalItem: true,
            totalItem: displayedTotalItems ? displayedTotalItems.toLocaleString() : '0',
        });

        setBreadcrumbItems([
            {
                key: '/manager/industrialZone',
                title: 'Khu công nghiệp'
            },
        ]);
    }, [displayedTotalItems, isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Khu công nghiệp", resolvedManagerZoneName),
            description: `Danh sách khu công nghiệp toàn hệ thống. Bạn đang quản lý ${resolvedManagerZoneName} và chỉ có thể xem chi tiết trong phạm vi được phân công.`,
            showWeather: true,
            showDatePicker: false,
            showTotalItem: true,
            totalItem: displayedTotalItems ? displayedTotalItems.toLocaleString() : '0',
        });

        setBreadcrumbItems([
            {
                key: '/manager/industrialZone',
                title: 'Khu công nghiệp'
            },
        ]);
    }, [displayedTotalItems, isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig]);
    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: "Khu công nghiệp",
            description: "Danh sách khu công nghiệp toàn hệ thống.",
            showWeather: true,
            showDatePicker: false,
            showTotalItem: true,
            totalItem: displayedTotalItems ? displayedTotalItems.toLocaleString() : '0',
        });

        setBreadcrumbItems([
            {
                key: '/manager/industrialZone',
                title: 'Khu công nghiệp'
            },
        ]);
    }, [displayedTotalItems, isManager, setBreadcrumbItems, setHeaderConfig]);

    // ========================= GET ZONE WITH COORDS =========================
    const getZoneWithCoords = useCallback((zone) => {
        if (!zone) return null;
        const coordinates = Object.entries(zoneCoordinates).find(([key]) =>
            zone.zone_name
                .toLowerCase()
                .includes(key.toLowerCase().replace("kcn ", "").replace("kcx ", ""))
        )?.[1];
        return {
            ...zone,
            latitude: coordinates?.lat,
            longitude: coordinates?.lon,
        };
    }, []);

    // ========================= HANDLERS =========================
    const handlePageChange = useCallback((newPage) => {
        setQueryParams((prev) => ({ ...prev, page: newPage }));
    }, []);

    const handleSearch = useCallback((search) => {
        setQueryParams((prev) => ({ ...prev, search, page: 1 }));
    }, []);

    const handleFilter = useCallback((filters) => {
        const processedFilters = { ...filters };
        // Backend might expect a single string for status, not an array
        if (processedFilters.status && Array.isArray(processedFilters.status) && processedFilters.status.length > 0) {
            const statusValue = processedFilters.status[0];
            // Map UI label to database value
            if (statusValue === 'Đang hoạt động') {
                processedFilters.status = 'active';
            } else if (statusValue === 'Ngưng hoạt động') {
                processedFilters.status = 'off';
            } else {
                processedFilters.status = statusValue;
            }
        }
        setQueryParams((prev) => ({ ...prev, filters: processedFilters, page: 1 }));
    }, []);

    const handleShowMap = useCallback(
        (zone) => {
            setSelectedZone(getZoneWithCoords(zone));
            setIsMapVisible(true);
        },
        [getZoneWithCoords]
    );

    const handleCloseMap = useCallback(() => {
        setIsMapVisible(false);
        setSelectedZone(null);
    }, []);

    const handleMapZoneChange = useCallback(
        (zoneId) => {
            const newZone = zones.find((z) => z.zone_id === zoneId);
            setSelectedZone(getZoneWithCoords(newZone));
        },
        [zones]
    );

    const handleActions = {
        import: isAdmin ? () => setShowImport(true) : undefined,
        export: isAdmin ? () => toast.info('Xuất dữ liệu', 'Tính năng đang phát triển.') : undefined,
        search: handleSearch,
        add: isAdmin ? () => navigate("/admin/industrialZone/create-zone") : undefined,
    };

    const handleDeleteClick = useCallback((zone) => {
        setDialogState({
            isOpen: true,
            actionType: 'soft-delete',
            selectedIds: [zone.zone_id],
        });
    }, []);

    const handleBatchDeleteClick = useCallback(() => {
        if (selectedZones.length === 0) return;
        setDialogState({
            isOpen: true,
            actionType: 'soft-delete',
            selectedIds: selectedZones,
        });
    }, [selectedZones]);

    const handleConfirmSuccess = useCallback(() => {
        if (dialogState.selectedIds?.length > 0) {
            toast({
                title: "Thành công",
                description: `Đã vô hiệu hóa ${dialogState.selectedIds.length} khu công nghiệp`,
                type: "success"
            });

            // Reset selection only if we acted on them
            if (dialogState.selectedIds.length > 1 || (selectedZones.length === 1 && dialogState.selectedIds[0] === selectedZones[0])) {
                setSelectedZones([]);
                setIsSelectMode(false);
            }
        }
        refetch();
    }, [dialogState.selectedIds, selectedZones, refetch]);

    const toggleSelectMode = useCallback(() => {
        setIsSelectMode(prev => !prev);
        if (isSelectMode) setSelectedZones([]); // Clear selection when exiting
    }, [isSelectMode]);

    const handleSelectZone = useCallback((zoneId) => {
        setSelectedZones(prev =>
            prev.includes(zoneId)
                ? prev.filter(id => id !== zoneId)
                : [...prev, zoneId]
        );
    }, []);

    // ========================= USE EFFECT =========================
    useEffect(() => {
        if (location.state?.notification) {
            toast({
                ...location.state.notification,
            });
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate]);

    // ========================= RENDER =========================
    return (
        <div className="flex flex-col gap-4 h-full max-h-full overflow-hidden bg-gray-50 pt-2">

            {/* ========================= SEARCH + ADD ========================= */}
            <div className="flex gap-2 justify-end items-stretch w-full h-9">


                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <Tooltip title={isSelectMode ? 'Hủy chọn' : 'Bật chế độ chọn để chọn nhiều KCN'}>
                            <Button
                                onClick={toggleSelectMode}
                                icon={<MousePointer2 size={16} />}
                                type={isSelectMode ? "primary" : "default"}
                                className={isSelectMode ? "bg-red-100 text-red-700 border-red-300 shadow-none font-medium text-sm rounded-lg" : "bg-white text-gray-700 font-medium text-sm rounded-lg"}
                            >
                                {isSelectMode ? 'Hủy chọn' : 'Chọn'}
                            </Button>
                        </Tooltip>

                        {isSelectMode && (
                            <Button
                                type="primary"
                                danger
                                disabled={selectedZones.length === 0}
                                icon={<Trash2 size={16} />}
                                onClick={handleBatchDeleteClick}
                                className="font-medium text-sm rounded-lg"
                            >
                                Xóa đã chọn ({selectedZones.length})
                            </Button>
                        )}

                        <Tooltip title="khu công nghiệp bị vô hiệu hóa">
                            <IconButton
                                onClick={() => navigate('/admin/industrialZone/trash')}
                                sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, width: 36, height: 36, borderRadius: '12px' }}
                            >
                                <ArchiveX size={20} />
                            </IconButton>
                        </Tooltip>
                    </div>
                )}

                <div className="w-full h-full max-w-xs ml-auto flex items-center gap-2">
                    <ButtonFilter
                        onFilter={handleFilter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        optionLabels={optionLabels}
                        selectedFilters={selectedFilters}
                        setSelectedFilters={setSelectedFilters}
                        singleSelectFields={['status']}
                    />
                    <SearchBox
                        placeholder="Tìm kiếm khu công nghiệp..."
                        onSearch={handleActions.search}
                    />
                </div>
                {isAdmin && <AddZoneButton onClick={handleActions.add} />}
            </div>

            {/* ========================= MAIN LAYOUT 2 CỘT ========================= */}
            <div className="flex flex-row gap-4 flex-grow min-h-0">
                <div
                    ref={scrollContainerRef}
                    className={`relative transition-all duration-300 overflow-auto h-full flex-1`}
                >
                    {isLoading && !isFetching ? (
                        <div>
                            <LoadingSpinner tip="Đang tải dữ liệu..." wrapperClassName="h-[300px]" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <div className="text-center">
                                <div className="text-red-500 text-lg font-medium mb-2">
                                    ⚠️ Lỗi tải dữ liệu
                                </div>
                                <div className="text-gray-600 mb-4">
                                    {error?.message || "Đã có lỗi xảy ra"}
                                </div>
                                <button
                                    onClick={() => refetch()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ZoneList
                                zones={accumulatedZones}
                                totalItems={displayedTotalItems}
                                hasMore={hasMore}
                                onLoadMore={handleLoadMore}
                                isLoadingMore={isLoadingMore}
                                isRefetching={isFetching && isLoading}
                                onShowMap={handleShowMap}
                                isMapVisible={isMapVisible}
                                scrollContainerRef={scrollContainerRef}
                                onDeleteClick={isAdmin ? handleDeleteClick : undefined}
                                isSelectMode={isSelectMode}
                                selectedZones={selectedZones}
                                onToggleZoneSelection={handleSelectZone}
                            />
                        </>
                    )}
                </div>

                {/* Cột phải: bản đồ */}
                <AnimatePresence>
                    {isMapVisible && (
                        <motion.div
                            key="map"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3 }}
                            className="hidden lg:block w-full flex-1 lg:w-1/2 bg-white rounded-xl shadow overflow-hidden"
                        >
                            <Suspense
                                fallback={
                                    <LoadingSpinner tip="Đang tải bản đồ..." />
                                }
                            >
                                <MapComponent
                                    selectedZone={selectedZone}
                                    allZones={zones.map((zone) => getZoneWithCoords(zone))}
                                    onZoneSelect={handleMapZoneChange}
                                    onClose={handleCloseMap}
                                />
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={dialogState.isOpen}
                onClose={() => setDialogState(prev => ({ ...prev, isOpen: false, selectedIds: [] }))}
                onSuccess={handleConfirmSuccess}
                actionType={dialogState.actionType}
                selectedIds={dialogState.selectedIds || []}
                entityType="zone"
                previewMutation={dialogState.actionType === 'soft-delete' ? previewSoftDeleteMutation : null} // Can add hard delete mutation later if needed
                deleteMutation={dialogState.actionType === 'soft-delete' ? deleteMutation : null}
                columns={[
                    'Tên khu công nghiệp',
                    'Số lượng công ty ảnh hưởng',
                    'Số lượng tài khoản ảnh hưởng'
                ]}
                renderRow={(row) => (
                    <>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                            {row.zone_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                            {row.affectedCompaniesCount || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                            {row.affectedUsersCount || 0}
                        </td>
                    </>
                )}
            />
        </div>
    );
};
export default IndustrialZones;
