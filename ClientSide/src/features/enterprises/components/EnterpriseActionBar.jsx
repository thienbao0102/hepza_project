import React, { useEffect, useRef, useState } from 'react';
import {
    DeleteSelectedButton,
    RestoreSelectedButton,
    AddCompanyButton,
} from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import { DownOutlined } from '@ant-design/icons';
import './EnterpriseActionBar.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const EnterpriseActionBar = ({
    selectedCount = 0,
    viewMode = 'active',
    onDeleteSelected,
    onRestoreSelected,
    onFilter,
    filterOptions = {},
    fieldLabels = {},
    onSearch,
    onAdd,
    onExport,
    onViewModeChange,
    zonesList = [],
    showAddButton = true,
    minimal = false,
    hideViewModeToggle = false,
    isManager = false,
}) => {
    const [filters, setFilters] = useState(() => (minimal || isManager ? {} : { zone_name: ['Tất cả'] }));

    const handleFilterChange = (newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    useEffect(() => {
        if (!onFilter) return;

        if (filters.zone_name?.includes('Tất cả')) {
            onFilter({ ...filters, zone_name: [] });
            return;
        }

        onFilter(filters);
    }, [filters, onFilter]);

    if (minimal) {
        return (
            <div className="w-full">
                <div className="grid grid-flow-col auto-cols-max justify-end gap-2 items-center">
                    <div className="shrink-0">
                        <ButtonFilter
                            onFilter={handleFilterChange}
                            filterOptions={filterOptions}
                            fieldLabels={fieldLabels}
                            selectedFilters={filters}
                            setSelectedFilters={setFilters}
                        />
                    </div>
                    <div className="min-w-[260px] md:w-[320px]">
                        <SearchBox placeholder="Tìm kiếm..." onSearch={onSearch} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-nowrap items-center w-full gap-2 h-9">
            {!isManager && (
                <div className="zonesFilter flex justify-center flex-1 min-w-0 h-9 shrink-0">
                    <CustomComboBox
                        zonesList={zonesList}
                        filters={filters}
                        setFilters={setFilters}
                    />
                </div>
            )}
            {isManager && <div className="flex-1" />}

            <div className="flex items-center h-full gap-2 justify-end min-w-0">
                <ButtonFilter
                    onFilter={handleFilterChange}
                    filterOptions={filterOptions}
                    fieldLabels={fieldLabels}
                    selectedFilters={filters}
                    setSelectedFilters={setFilters}
                />
                <div className="shrink-0 min-w-0 h-full">
                    <SearchBox placeholder="Tìm kiếm..." onSearch={onSearch} />
                </div>

                <div className="flex items-center h-9 shrink-0">
                    {selectedCount > 0 ? (
                        <>
                            {viewMode === 'active' && (
                                <DeleteSelectedButton
                                    selectedCount={selectedCount}
                                    onClick={onDeleteSelected}
                                />
                            )}
                            {viewMode === 'deleted' && (
                                <>
                                    <DeleteSelectedButton
                                        selectedCount={selectedCount}
                                        onClick={onDeleteSelected}
                                    />
                                    <RestoreSelectedButton
                                        selectedCount={selectedCount}
                                        onClick={onRestoreSelected}
                                    />
                                </>
                            )}
                        </>
                    ) : (
                        !hideViewModeToggle && (
                            <button
                                onClick={onViewModeChange}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[14px] hover:bg-gray-50 hover:border-[#4E5BA6] focus-within:border-[#4E5BA6] transition-all duration-200"
                            >
                                <DownOutlined />
                                <span>
                                    {viewMode === 'active'
                                        ? 'Xem mục đã xóa'
                                        : 'Xem mục đang hoạt động'}
                                </span>
                            </button>
                        )
                    )}
                </div>

                {showAddButton && <AddCompanyButton onClick={onAdd} />}
            </div>
        </div>
    );
};

function CustomComboBox({ zonesList = [], filters, setFilters }) {
    const selected = filters.zone_name || ['Tất cả'];
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const scrollRef = useRef(null);

    const toggleSelect = (zoneName) => {
        setFilters((prev) => {
            let newZones;
            if (zoneName === 'Tất cả') {
                newZones = ['Tất cả'];
            } else {
                const prevZones = prev.zone_name || ['Tất cả'];
                if (prevZones.includes('Tất cả')) {
                    newZones = [zoneName];
                } else if (prevZones.includes(zoneName)) {
                    newZones = prevZones.filter((name) => name !== zoneName);
                    if (newZones.length === 0) newZones = ['Tất cả'];
                } else {
                    newZones = [...prevZones, zoneName];
                }
            }
            return { ...prev, zone_name: newZones };
        });
    };

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    };

    const scrollByAmount = (amount) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        checkScroll();
    }, [zonesList]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, []);

    return (
        <div className="relative w-full h-full">
            {canScrollLeft && (
                <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent"></div>
            )}

            <div
                ref={scrollRef}
                className="flex gap-2 flex-nowrap overflow-x-hidden custom-scrollbar scroll-smooth px-8 h-full"
            >
                <label
                    key="Tất cả"
                    className={clsx(
                        'cursor-pointer px-4 py-2 rounded-2xl border transition shrink-0 flex items-center',
                        selected.includes('Tất cả')
                            ? 'text-[#4E5BA6] border-[#4E5BA6]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    )}
                >
                    <input
                        type="checkbox"
                        value="Tất cả"
                        checked={selected.includes('Tất cả')}
                        onChange={() => toggleSelect('Tất cả')}
                        className="hidden"
                    />
                    Tất cả
                </label>

                {zonesList.map((zone) => (
                    <label
                        key={zone._id}
                        className={clsx(
                            'cursor-pointer px-4 py-2 rounded-2xl border transition shrink-0 flex items-center',
                            selected.includes(zone.zone_name)
                                ? 'text-[#4E5BA6] border-[#4E5BA6]'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        )}
                    >
                        <input
                            type="checkbox"
                            value={zone.zone_name}
                            checked={selected.includes(zone.zone_name)}
                            onChange={() => toggleSelect(zone.zone_name)}
                            className="hidden"
                        />
                        {zone.zone_name}
                    </label>
                ))}
            </div>

            {canScrollRight && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-gray-50 via-gray-50/90 to-transparent"></div>
            )}

            <button
                onClick={() => scrollByAmount(-200)}
                className={clsx(
                    'absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/70 hover:bg-gray-200/70 p-1 shadow',
                    !canScrollLeft && 'opacity-50'
                )}
            >
                <ChevronLeft size={18} />
            </button>
            <button
                onClick={() => scrollByAmount(200)}
                className={clsx(
                    'absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/70 hover:bg-gray-200/70 p-1 shadow',
                    !canScrollRight && 'opacity-50'
                )}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}

export default EnterpriseActionBar;
