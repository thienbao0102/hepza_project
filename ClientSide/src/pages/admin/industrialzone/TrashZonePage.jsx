import React, { useState, useCallback, Suspense, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { RefreshCw, Trash2, ArrowLeft, MousePointer2, Activity, ArchiveX, Factory } from 'lucide-react';
import { Tooltip, IconButton } from "@mui/material"; // ADDED For MUI buttons
import LoadingSpinner from '@components/ui/LoadingSpinner';
import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import { ZoneList } from '@features/industrialzone/components/ZoneList';
import useZones from '@features/industrialzone/hooks/useZones';
import { useAuth } from '@app/providers/auth/AuthProvider';
import toast from '@/utils/toast';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ConfirmDeleteDialog from "@components/common/ConfirmDeleteDialog";
import { useRestoreZones, useHardDeleteZones, usePreviewHardDeleteZone } from "@features/industrialzone/hooks/useZoneMutations";
import { buildZoneLocationFilterOptions } from "@features/industrialzone/utils/locationFilterOptions";

const MapComponent = React.lazy(() => import('@components/common/Map').then((m) => ({ default: m.MapComponent })));

// Hardcode coordinates
const zoneCoordinates = {
    "Vĩnh Lộc": { lat: 10.8231, lon: 106.5910 },
    "Tân Bình": { lat: 10.8142, lon: 106.6288 },
    "Vĩnh Lộc 3": { lat: 10.8523, lon: 106.5982 },
    "Lê Minh Xuân": { lat: 10.7486, lon: 106.5375 },
    "Lê Minh Xuân 2": { lat: 10.7391, lon: 106.5309 },
    "Lê Minh Xuân 3": { lat: 10.7408, lon: 106.5160 },
    "Tây Bắc Củ Chi": { lat: 10.9754, lon: 106.4912 },
    "Tân Phú Trung": { lat: 10.9231, lon: 106.5501 },
    "Tân Tạo": { lat: 10.7678, lon: 106.6025 },
    "Tân Tạo Mở Rộng": { lat: 10.7621, lon: 106.5912 },
    "Tân Thuận": { lat: 10.7583, lon: 106.7461 },
    "Hiệp Phước": { lat: 10.6384, lon: 106.7571 },
    "Cát Lái": { lat: 10.7656, lon: 106.7865 },
    "Bình Chiểu": { lat: 10.8872, lon: 106.7265 },
    "Đông Nam": { lat: 10.9575, lon: 106.6348 },
    "Cơ Khí Ô Tô Tp.hcm": { lat: 10.8441, lon: 106.5762 }
};

const fieldLabels = {
    zone_name: 'Khu công nghiệp/ Khu chế xuất',
    location: 'Khu vực',
};

const TrashZonePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const role = user?.role;
    const isAdmin = role === 'admin';

    // Trash page state
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedZones, setSelectedZones] = useState([]);
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const scrollContainerRef = useRef(null);
    const [selectedFilters, setSelectedFilters] = useState({});

    // Enforce isDisable: true for backend query
    const [queryParams, setQueryParams] = useState({
        page: 1,
        limit: 8,
        search: '',
        filters: { isDisable: true }, // IMPORTANT
    });

    const [dialogState, setDialogState] = useState({
        isOpen: false,
        actionType: null, // 'hard-delete' | 'restore'
        selectedIds: [],
    });

    // Mutations
    const restoreMutation = useRestoreZones();
    const previewHardDeleteMutation = usePreviewHardDeleteZone();
    const hardDeleteMutation = useHardDeleteZones();

    // Fetch data for list
    const { data, isLoading, error, isFetching, refetch } = useZones(queryParams);
    const { zones = [], totalItems = 0, totalPages = 0 } = data || {};

    // Fetch data for filters (get all disabled to populate options)
    const { data: allZonesData } = useZones({ page: 1, limit: 1000, filters: { isDisable: true } });
    const allZones = allZonesData?.zones || [];

    const filterOptions = useMemo(() => {
        const options = {
            zone_name: [],
            location: {}
        };

        if (allZones.length > 0) {
            options.zone_name = [...new Set(allZones.map(z => z.zone_name).filter(Boolean))];

                        options.location = buildZoneLocationFilterOptions(allZones);
        }
        return options;
    }, [allZones]);

    const displayedTotalItems = totalItems;

    // Infinite scroll state
    const [accumulatedZones, setAccumulatedZones] = useState([]);
    const prevParamsRef = useRef(null);

    useEffect(() => {
        if (!zones || zones.length === 0) return;

        const paramsKey = JSON.stringify({ search: queryParams.search, filters: queryParams.filters });
        if (prevParamsRef.current !== paramsKey) {
            prevParamsRef.current = paramsKey;
            setAccumulatedZones(zones);
        } else {
            setAccumulatedZones(prev => {
                const existingIds = new Set(prev.map(z => z.zone_id));
                const newZones = zones.filter(z => !existingIds.has(z.zone_id));
                if (newZones.length === 0) return prev;
                return [...prev, ...newZones];
            });
        }
    }, [zones, queryParams.search, queryParams.filters]);

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
            title: "khu công nghiệp Đã vô hiệu hóa",
            description: "Quản lý khu công nghiệp đã vô hiệu hóa",
            showWeather: false,
            showDatePicker: false,
            showTotalItem: true,
            totalItem: displayedTotalItems ? displayedTotalItems.toLocaleString() : '0',
            backUrl: "/admin/industrialZone",
        });

        setBreadcrumbItems([
            { key: '/industrialZone', title: "Khu công nghiệp" },
            { key: '/industrialZone/trash', title: "Đã vô hiệu hóa" },
        ]);
    }, [displayedTotalItems]);

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

    // Handlers
    const handleSearch = useCallback((search) => {
        setQueryParams(prev => ({ ...prev, search, page: 1 }));
        setAccumulatedZones([]);
    }, []);

    const handleFilter = useCallback((filters) => {
        setQueryParams(prev => ({
            ...prev,
            filters: { ...filters, isDisable: true }, // Keep isDisable: true
            page: 1
        }));
        setAccumulatedZones([]);
    }, []);

    const handleShowMap = useCallback((zone) => {
        setSelectedZone(getZoneWithCoords(zone));
        setIsMapVisible(true);
    }, [getZoneWithCoords]);

    const handleCloseMap = useCallback(() => {
        setIsMapVisible(false);
        setSelectedZone(null);
    }, []);

    const handleMapZoneChange = useCallback((zoneId) => {
        const newZone = zones.find((z) => z.zone_id === zoneId);
        setSelectedZone(getZoneWithCoords(newZone));
    }, [zones, getZoneWithCoords]);

    // Selection
    const toggleSelectMode = useCallback(() => {
        setIsSelectMode(prev => !prev);
        if (isSelectMode) setSelectedZones([]);
    }, [isSelectMode]);

    const handleSelectZone = useCallback((zoneId) => {
        setSelectedZones(prev =>
            prev.includes(zoneId)
                ? prev.filter(id => id !== zoneId)
                : [...prev, zoneId]
        );
    }, []);

    // Actions
    const handleRestoreClick = useCallback((zone) => {
        setDialogState({
            isOpen: true,
            actionType: 'restore',
            selectedIds: zone ? [zone.zone_id] : selectedZones,
        });
    }, [selectedZones]);

    const handleHardDeleteClick = useCallback((zone) => {
        setDialogState({
            isOpen: true,
            actionType: 'hard-delete',
            selectedIds: zone ? [zone.zone_id] : selectedZones,
        });
    }, [selectedZones]);

    const handleConfirmSuccess = useCallback(() => {
        const ids = dialogState.selectedIds;
        if (!ids || ids.length === 0) return;

        if (dialogState.actionType === 'restore') {
            toast.success("Khôi phục thành công", `Đã khôi phục ${ids.length} khu công nghiệp`);
        } else if (dialogState.actionType === 'hard-delete') {
            toast.success("Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} khu công nghiệp`);
        }

        // Reset selection and mode only if we acted on the selected items
        if (ids.length > 1 || (selectedZones.length === 1 && ids[0] === selectedZones[0])) {
            setSelectedZones([]);
            setIsSelectMode(false);
        }

        setAccumulatedZones([]);
        refetch();
    }, [dialogState.selectedIds, dialogState.actionType, selectedZones, refetch]);

    if (!isAdmin) {
        return <div className="p-4 text-center text-gray-500">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="flex flex-col gap-4 h-full max-h-full overflow-hidden bg-gray-50 pt-2">
            {/* SEARCH + ACTIONS */}
            <div className="flex gap-2 justify-between items-center w-full h-9">
                <div className="flex items-center gap-2">

                    <Button
                        onClick={toggleSelectMode}
                        icon={<MousePointer2 size={16} />}
                        type={isSelectMode ? "primary" : "default"}
                        className={isSelectMode ? "bg-blue-100 text-blue-700 border-blue-300 shadow-none font-medium text-sm rounded-lg" : "text-sm rounded-lg"}
                    >
                        {isSelectMode ? 'Hủy chọn' : 'Chọn'}
                    </Button>

                    {isSelectMode && selectedZones.length > 0 && (
                        <>
                            <Button
                                icon={<RefreshCw size={16} />}
                                onClick={() => handleRestoreClick()}
                                className="flex items-center gap-1 text-sm rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                            >
                                Khôi phục ({selectedZones.length})
                            </Button>
                            <Button
                                danger
                                icon={<Trash2 size={16} />}
                                onClick={() => handleHardDeleteClick()}
                                className="flex items-center gap-1 text-sm rounded-lg"
                            >
                                Xóa vĩnh viễn ({selectedZones.length})
                            </Button>
                        </>
                    )}

                    <Tooltip title="Danh sách khu công nghiệp">
                        <IconButton
                            onClick={() => navigate('/admin/industrialZone')}
                            sx={{ bgcolor: '#4E5BA6', color: 'white', '&:hover': { bgcolor: '#3a4480' }, width: 36, height: 36, borderRadius: '12px' }}
                        >
                            <Factory size={20} />
                        </IconButton>
                    </Tooltip>

                </div>

                <div className="flex items-center gap-2 justify-start ml-auto">
                    <ButtonFilter
                        onFilter={handleFilter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        selectedFilters={selectedFilters}
                        setSelectedFilters={setSelectedFilters}
                    />


                    <div className="w-64">
                        <SearchBox
                            placeholder="Tìm kiếm khu công nghiệp..."
                            onSearch={handleSearch}
                        />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-row gap-4 flex-grow min-h-0">
                <div ref={scrollContainerRef} className="relative transition-all duration-300 overflow-auto h-full flex-1">
                    {isLoading && !isFetching && accumulatedZones.length === 0 ? (
                        <LoadingSpinner tip="Đang tải dữ liệu..." wrapperClassName="h-[300px]" />
                    ) : error ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <div className="text-center">
                                <div className="text-red-500 text-lg font-medium mb-2">Lỗi tải dữ liệu</div>
                                <div className="text-gray-600 mb-4">{error?.message || "Đã có lỗi xảy ra"}</div>
                                <button onClick={() => refetch()} className="px-4 py-2 bg-blue-500 text-white rounded">Thử lại</button>
                            </div>
                        </div>
                    ) : (
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
                            isSelectMode={isSelectMode}
                            selectedZones={selectedZones}
                            onToggleZoneSelection={handleSelectZone}
                            isTrashMode={true}
                            onRestoreClick={isAdmin && !isSelectMode ? (zone) => handleRestoreClick(zone) : undefined}
                            onHardDeleteClick={isAdmin && !isSelectMode ? (zone) => handleHardDeleteClick(zone) : undefined}
                        />
                    )}
                </div>

                {/* MAP PANEL */}
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
                            <Suspense fallback={<LoadingSpinner tip="Đang tải bản đồ..." />}>
                                <MapComponent
                                    selectedZone={selectedZone}
                                    allZones={accumulatedZones.map((zone) => getZoneWithCoords(zone))}
                                    onZoneSelect={handleMapZoneChange}
                                    onClose={handleCloseMap}
                                />
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ACTION CONFIRMATION DIALOG */}
            <ConfirmDeleteDialog
                open={dialogState.isOpen}
                onClose={() => setDialogState(prev => ({ ...prev, isOpen: false, selectedIds: [] }))}
                onSuccess={handleConfirmSuccess}
                actionType={dialogState.actionType}
                selectedIds={dialogState.selectedIds || []}
                entityType="zone"
                previewMutation={dialogState.actionType === 'hard-delete' ? previewHardDeleteMutation : null}
                deleteMutation={dialogState.actionType === 'hard-delete' ? hardDeleteMutation : restoreMutation}
                columns={
                    dialogState.actionType === 'hard-delete' ? [
                        'Tên khu công nghiệp',
                        'Số lượng công ty ảnh hưởng',
                        'Số lượng tài khoản ảnh hưởng'
                    ] : []
                }
                renderRow={
                    dialogState.actionType === 'hard-delete' ? ((row) => (
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
                    )) : undefined
                }
            />
        </div>
    );
};

export default TrashZonePage;
