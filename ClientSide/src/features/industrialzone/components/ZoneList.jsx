import { useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { IndustrialZoneCard } from "@components/common/Card.jsx";
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import { motion } from "framer-motion";

export const ZoneList = ({
    zones = [],
    totalItems = 0,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
    isRefetching = false,
    onShowMap,
    isMapVisible = false,
    scrollContainerRef,
    onDeleteClick, // ADDED
    isSelectMode = false, // ADDED
    selectedZones = [], // ADDED
    onToggleZoneSelection, // ADDED
    isTrashMode = false,
    onRestoreClick,
    onHardDeleteClick,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({ page: 1, limit: 9999 });

    // Use refs for scroll handler to avoid stale closures
    const hasMoreRef = useRef(hasMore);
    hasMoreRef.current = hasMore;
    const isLoadingMoreRef = useRef(isLoadingMore);
    isLoadingMoreRef.current = isLoadingMore;
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;

    const companiesByZone = useMemo(() => {
        const map = {};
        const companies = companiesData?.companies ?? [];
        for (const company of companies) {
            const zoneId = company.zone_id;
            if (!zoneId) continue;
            if (!map[zoneId]) {
                map[zoneId] = [];
            }
            map[zoneId].push(company.company_id);
        }
        return map;
    }, [companiesData]);

    const handleDetailClick = (zone) => {
        // In select mode, clicking anywhere might toggle selection, but let's keep details button distinct
        const path = location.pathname.toLowerCase();
        let basePath = '/industrialZone';

        if (path.startsWith('/admin')) {
            basePath = '/admin/industrialZone';
        } else if (path.startsWith('/manager')) {
            basePath = '/manager/industrialZone';
        }

        navigate(`${basePath}/${zone.zone_id}`, {
            state: { from: `${location.pathname}${location.search}` },
        });
    };

    // Scroll-based infinite loading using refs to avoid stale closures
    useEffect(() => {
        const container = scrollContainerRef?.current;
        if (!container) return;

        const handleScroll = () => {
            if (!hasMoreRef.current || isLoadingMoreRef.current) return;

            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 300) {
                onLoadMoreRef.current?.();
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        // Also check immediately in case content doesn't fill the container
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef, zones.length]); // Re-attach when zones change (new content loaded)

    const effectiveRefetching = isRefetching || isCompaniesLoading;

    if (zones.length === 0 && !effectiveRefetching) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-gray-500 text-lg font-medium mb-2">Không có dữ liệu</div>
                    <div className="text-gray-400">Chưa có khu công nghiệp nào được tạo</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className={`grid ${isMapVisible ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
                {zones.map((zone, index) => {
                    const isSelected = selectedZones.includes(zone.zone_id);
                    return (
                        <motion.div
                            key={zone.zone_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                        >
                            <IndustrialZoneCard
                                image={zone.image_url}
                                name={zone.zone_name}
                                zone_id={zone.zone_id}
                                activityType={zone.location}
                                field={zone.status}
                                companyIds={companiesByZone[zone.zone_id] ?? []}
                                onDetailClick={() => handleDetailClick(zone)}
                                onMapClick={() => onShowMap?.(zone)}
                                onDeleteClick={onDeleteClick ? () => onDeleteClick(zone) : undefined}
                                isSelectMode={isSelectMode}
                                isSelected={isSelected}
                                onSelect={() => onToggleZoneSelection?.(zone.zone_id)}
                                isTrashMode={isTrashMode}
                                onRestoreClick={onRestoreClick ? () => onRestoreClick(zone) : undefined}
                                onHardDeleteClick={onHardDeleteClick ? () => onHardDeleteClick(zone) : undefined}
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Loading indicator */}
            {hasMore && (
                <div className="flex justify-center py-6">
                    {isLoadingMore ? (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <div className="w-5 h-5 border-2 border-[#4E5BA6]/30 border-t-[#4E5BA6] rounded-full animate-spin" />
                            Đang tải thêm...
                        </div>
                    ) : (
                        <div className="text-gray-300 text-xs">Scroll xuống để xem thêm</div>
                    )}
                </div>
            )}

            {/* End of list indicator */}
            {!hasMore && zones.length > 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                    Đã hiển thị tất cả {totalItems} khu công nghiệp
                </div>
            )}
        </div>
    );
};
