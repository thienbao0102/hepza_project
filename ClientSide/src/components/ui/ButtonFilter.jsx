import React, { useEffect, useState, useRef } from "react";
import { Dropdown, Badge, Button, Tooltip, DatePicker, Slider } from "antd";
import { FunnelPlotOutlined, DownOutlined, CheckOutlined, SearchOutlined, CalendarOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

// ... existing CustomMultiSelect ...

import locale from "antd/es/date-picker/locale/vi_VN";

const DateRangeSelect = ({
    value = {}, // { from: null, to: null }
    onChange,
    placeholder = "Chọn thời gian",
    className = "",
    label = "",
    size = "default"
}) => {
    const { RangePicker } = DatePicker;
    const [isOpen, setIsOpen] = useState(false);

    const handleQuickSelect = (type) => {
        if (isActive(type)) {
            onChange({});
            return;
        }

        const today = dayjs();
        let from, to;

        switch (type) {
            case 'today':
                from = today.startOf('day');
                to = today.endOf('day');
                break;
            case 'week':
                from = today.startOf('week');
                to = today.endOf('week');
                break;
            case 'month':
                from = today.startOf('month');
                to = today.endOf('month');
                break;
            default:
                break;
        }
        onChange({ from, to });
    };

    const handleRangeChange = (dates) => {
        if (dates && dates.length === 2) {
            onChange({ from: dates[0].startOf('day'), to: dates[1].endOf('day') });
        } else {
            onChange({});
        }
    };

    const heightClass = size === "small" ? "h-[40px]" : "h-[48px]";

    const customSuffixIcon = (
        <CalendarOutlined className="text-[#555E67] mr-[-6px] bg-[#EFEFEF] text-xs !rounded-[7px] p-[12px] border-none !border-[1px]" />
    );

    const isActive = (type) => {
        if (!value?.from || !value?.to) return false;
        const today = dayjs();
        const from = dayjs(value.from);
        const to = dayjs(value.to);

        switch (type) {
            case 'today':
                return from.isSame(today, 'day') && to.isSame(today, 'day');
            case 'week':
                return from.isSame(today.startOf('week'), 'day') && to.isSame(today.endOf('week'), 'day');
            case 'month':
                return from.isSame(today.startOf('month'), 'day') && to.isSame(today.endOf('month'), 'day');
            default:
                return false;
        }
    };

    const getButtonClass = (type) => {
        const active = isActive(type);
        return `flex-1 !rounded-lg !text-xs flex items-center justify-center gap-1 h-[48px] ${active
            ? '!border-[#4E5BA6] !text-[#4E5BA6] !font-medium bg-white'
            : '!border-gray-200 !text-gray-600 hover:!text-[#4E5BA6] hover:!border-[#4E5BA6]'
            }`;
    };

    const cellRender = (current, info) => {
        if (info.type !== 'date') return info.originNode;

        const from = value?.from ? dayjs(value.from) : null;
        const to = value?.to ? dayjs(value.to) : null;

        const isStart = from && current.isSame(from, 'day');
        const isEnd = to && current.isSame(to, 'day');
        const isRange = from && to && current.isAfter(from, 'day') && current.isBefore(to, 'day');

        let className = "ant-picker-cell-inner !w-8 !h-8 !leading-8 flex items-center justify-center relative z-10";

        if (isStart || isEnd) {
            className += " !bg-[#4E5BA6] !text-white !rounded-full";
        } else if (isRange) {
            className += " !bg-[#E0E5F2] !text-gray-700 !rounded-none";
        } else {
            className += " !text-gray-700 !rounded-full hover:!bg-gray-100";
        }

        // Add connecting bars for start/end if they are part of a range
        const isStartOfRange = isStart && to && current.isBefore(to, 'day');
        const isEndOfRange = isEnd && from && current.isAfter(from, 'day');

        return (
            <div className="relative w-full h-full flex items-center justify-center">
                {isStartOfRange && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#E0E5F2] z-0" />
                )}
                {isEndOfRange && (
                    <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#E0E5F2] z-0" />
                )}
                {isRange && (
                    <div className="absolute inset-0 bg-[#E0E5F2] z-0" />
                )}
                <div className={className}>
                    {current.date()}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {/* Hidden RangePicker to drive the logic */}
            <div className="relative h-0 w-full">
                <RangePicker
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    value={value?.from && value?.to ? [dayjs(value.from), dayjs(value.to)] : null}
                    onChange={handleRangeChange}
                    locale={locale}
                    cellRender={cellRender}
                    className="opacity-0 w-full h-px absolute top-0 left-0 pointer-events-none"
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1 cursor-pointer" onClick={() => setIsOpen(true)}>
                    <label className="text-xs text-gray-500 mb-1 block">Từ</label>
                    <div className={`flex items-center justify-between px-3 bg-[#FAFAFA] border border-[#ECEDF0] rounded-xl hover:border-[#4E5BA6] transition-colors ${heightClass}`}>
                        <span className={`text-sm ${value?.from ? 'text-[#555E67]' : 'text-gray-400'}`}>
                            {value?.from ? dayjs(value.from).format("DD/MM/YYYY") : "dd/mm/yyyy"}
                        </span>
                        {customSuffixIcon}
                    </div>
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => setIsOpen(true)}>
                    <label className="text-xs text-gray-500 mb-1 block">Đến</label>
                    <div className={`flex items-center justify-between px-3 bg-[#FAFAFA] border border-[#ECEDF0] rounded-xl hover:border-[#4E5BA6] transition-colors ${heightClass}`}>
                        <span className={`text-sm ${value?.to ? 'text-[#555E67]' : 'text-gray-400'}`}>
                            {value?.to ? dayjs(value.to).format("DD/MM/YYYY") : "dd/mm/yyyy"}
                        </span>
                        {customSuffixIcon}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button onClick={() => handleQuickSelect('today')} className={getButtonClass('today')}>
                    {isActive('today') && <CheckOutlined />} Hôm nay
                </Button>
                <Button onClick={() => handleQuickSelect('week')} className={getButtonClass('week')}>
                    {isActive('week') && <CheckOutlined />} Tuần này
                </Button>
                <Button onClick={() => handleQuickSelect('month')} className={getButtonClass('month')}>
                    {isActive('month') && <CheckOutlined />} Tháng này
                </Button>
            </div>
        </div>
    );
};

const PriceRangeSlider = ({
    value = [0, 10000000], // [min, max]
    onChange,
    min = 0,
    max = 10000000,
    step = 100000,
    label = "Giá tiền"
}) => {
    const formatter = (value) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}Tr`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return `${value}`;
    };

    const displayValue = (val) => {
        if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
        if (val >= 1000000) return `${(val / 1000000).toFixed(0)} Triệu`;
        return `${val.toLocaleString()}đ`;
    };

    return (
        <div className="flex flex-col gap-4 px-2">
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium font-inter mb-1">
                <span>{displayValue(value[0] || min)}</span>
                <span>{displayValue(value[1] || max)}</span>
            </div>
            <Slider
                range
                min={min}
                max={max}
                step={step}
                value={value.length === 2 ? value : [min, max]}
                onChange={onChange}
                tooltip={{ formatter }}
                styles={{
                    track: { background: '#4E5BA6' },
                    handle: { borderColor: '#4E5BA6', backgroundColor: '#fff' }
                }}
            />
            <div className="text-[11px] text-slate-400 text-center italic mt-[-5px]">
                Kéo để điều chỉnh khoảng giá mong muốn
            </div>
        </div>
    );
};

const QuantityRangeSlider = ({
    value = [0, 1000],
    onChange,
    min = 0,
    max = 1000,
    step = 1,
    label = "Số lượng"
}) => {
    const safeMin = Number(min) || 0;
    const safeMax = Number(max) || 0;
    const safeValue = Array.isArray(value) && value.length === 2
        ? [Number(value[0]) || safeMin, Number(value[1]) || safeMax]
        : [safeMin, safeMax];

    const formatter = (val) => `${(val || 0).toLocaleString()}`;

    return (
        <div className="flex flex-col gap-4 px-2">
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium font-inter mb-1">
                <span>{safeMin.toLocaleString()}</span>
                <span>{safeMax.toLocaleString()}</span>
            </div>
            <Slider
                range
                min={safeMin}
                max={safeMax}
                step={step}
                value={safeValue}
                onChange={onChange}
                tooltip={{ formatter }}
                styles={{
                    track: { background: '#4E5BA6' },
                    handle: { borderColor: '#4E5BA6', backgroundColor: '#fff' }
                }}
            />
            <div className="flex justify-between items-center mt-[-5px]">
                <span className="text-[12px] font-semibold text-[#4E5BA6] bg-[#4E5BA61A] px-2 py-0.5 rounded">{safeValue[0].toLocaleString()}</span>
                <span className="text-[12px] font-semibold text-[#4E5BA6] bg-[#4E5BA61A] px-2 py-0.5 rounded">{safeValue[1].toLocaleString()}</span>
            </div>
        </div>
    );
};

// ... CascadingSelect ...

// ... ButtonFilter ...


const CustomMultiSelect = ({
    options = [],
    value = [],
    onChange,
    placeholder = "Select...",
    className = "",
    label = "",
    size = "default", // "default" | "small"
    mode = "multiple" // "multiple" | "single"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(""); // Reset search when closing
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setSearchTerm("");
    };

    const handleOptionClick = (optionValue) => {
        if (mode === "single") {
            // In single mode, clicking selects the value and closes dropdown
            // If clicking the same value, it (optionally) deselects or stays selected. 
            // Usually single select enforces one value. Let's assume toggle behavior or simple select.
            // User said "chỉ được chọn 1 trong 2", implies exactly one or none.
            const newValue = value.includes(optionValue) ? [] : [optionValue];
            onChange(newValue);
            setIsOpen(false);
        } else {
            const newValue = value.includes(optionValue)
                ? value.filter((v) => v !== optionValue)
                : [...value, optionValue];
            onChange(newValue);
        }
    };

    const filteredOptions = options.filter(option => {
        const searchText = typeof option.label === 'string' ? option.label : String(option.value);
        return searchText.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const displayValue = value.length > 0
        ? (mode === "single"
            ? <span className="text-[#374151] font-medium">{options.find(o => o.value === value[0])?.label || value[0]}</span>
            : <span className="text-[#374151] font-medium flex items-center gap-[10px]">{label} <span className={`rounded-[13px] bg-[#14A155] text-white ${value.length > 9 ? "px-[3px]" : "px-[8px]"} h-[24px] flex items-center justify-center text-[14px]`}>{value.length > 9 ? "+9" : value.length}</span></span>
        )
        : <span className="text-gray-400">{placeholder}</span>;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className="flex items-center justify-between w-full h-[48px] px-[5px] bg-[#FAFAFA] border border-[#ECEDF0] rounded-xl cursor-pointer hover:border-[#4E5BA6] transition-colors"
                onClick={() => {
                    if (!isOpen) setIsOpen(true);
                }}
            >
                <div className="flex-1 pl-[6px] text-[12px] font-semibold !text-[#555E67] truncate mr-2 select-none flex items-center">
                    {isOpen ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-[#555E67] placeholder-gray-400"
                            placeholder={placeholder.replace("Chọn", "Tìm kiếm")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                        />
                    ) : (
                        displayValue
                    )}
                </div>
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggle();
                    }}
                    className="cursor-pointer"
                >
                    {isOpen ? (
                        <SearchOutlined className="text-[#555E67] bg-[#EFEFEF] text-xs !rounded-[7px] p-[12px] border-none !border-[1px]" />
                    ) : (
                        <DownOutlined className="text-[#555E67] bg-[#EFEFEF] text-xs !rounded-[7px] p-[12px] border-none !border-[1px]" />
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar p-[6px] flex flex-col gap-[5px]"
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-xl transition-colors ${isSelected ? "bg-[#4E5BA61A]" : "hover:bg-[#4E5BA61A]"}`}
                                        onClick={() => handleOptionClick(option.value)}
                                    >
                                        <span className={`text-sm select-none ${isSelected ? "font-medium text-[#4E5BA6]" : "text-gray-700"}`}>
                                            {option.label}
                                        </span>
                                        {isSelected && <CheckOutlined className="text-[#4E5BA6] text-sm" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">Không có dữ liệu</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selected Tags Display - Only for multiple mode */}
            {mode !== "single" && value.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {value.slice(0, 6).map((val) => {
                        const option = options.find(o => o.value === val);
                        const fullLabel = option?.label || val;
                        const shortLabel = typeof fullLabel === 'string'
                            ? fullLabel.replace(/^(Khu công nghiệp|Khu chế xuất|KCN|KCX)\s+/i, "")
                            : fullLabel;

                        return (
                            <div
                                key={val}
                                className="flex items-center gap-1 px-3 py-1 bg-white border border-[#4E5BA6] rounded-full text-sm text-gray-700"
                            >
                                <span>{shortLabel}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOptionClick(val);
                                    }}
                                    className="text-gray-400 hover:text-[#4E5BA6] ml-1 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                    {value.length > 6 && (
                        <Tooltip
                            title={
                                <div className="flex flex-col gap-1">
                                    {value.slice(6).map(val => {
                                        const option = options.find(o => o.value === val);
                                        const fullLabel = option?.label || val;
                                        const displayLabel = typeof fullLabel === 'string'
                                            ? fullLabel.replace(/^(Khu công nghiệp|Khu chế xuất|KCN|KCX)\s+/i, "")
                                            : fullLabel;
                                        return <span key={val}>{displayLabel}</span>
                                    })}
                                </div>
                            }
                        >
                            <div className="flex items-center px-3 py-1 bg-white border border-[#4E5BA6] rounded-full text-sm text-gray-600 cursor-help">
                                +{value.length - 6}...
                            </div>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
};

const CascadingSelect = ({
    options = {}, // { "Parent1": ["Child1", "Child2"], "Parent2": [] }
    value = [],
    onChange,
    placeholder = "Select...",
    className = "",
    label = "",
    size = "default"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeParent, setActiveParent] = useState(Object.keys(options)[0]);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!activeParent && Object.keys(options).length > 0) {
            setActiveParent(Object.keys(options)[0]);
        }
    }, [options, activeParent]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOptionClick = (childValue) => {
        const newValue = value.includes(childValue)
            ? value.filter((v) => v !== childValue)
            : [...value, childValue];
        onChange(newValue);
    };

    const displayValue = value.length > 0
        ? <span className="text-[#374151] font-medium flex items-center gap-[10px]">{label} <span className={`rounded-[13px] bg-[#14A155] text-white ${value.length > 9 ? "px-[3px]" : "px-[8px]"} h-[24px] flex items-center justify-center text-[14px]`}>{value.length > 9 ? "+9" : value.length}</span></span>
        : <span className="text-gray-400">{placeholder}</span>;

    const heightClass = size === "small" ? "h-[40px]" : "h-[48px]";

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`flex items-center justify-between w-full ${heightClass} px-[5px] bg-[#FAFAFA] border border-[#ECEDF0] rounded-xl cursor-pointer hover:border-[#4E5BA6] transition-colors`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1 pl-[6px] text-[12px] font-semibold !text-[#555E67] truncate mr-2 select-none">
                    {displayValue}
                </div>
                <DownOutlined className="text-[#555E67] bg-[#EFEFEF] text-xs !rounded-[7px] p-[12px] border-none !border-[1px]" />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex"
                    >
                        {/* Left Column: Parents */}
                        <div className="w-1/2 border-r border-gray-100 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-white">
                            {Object.keys(options).map((parent) => {
                                const hasSelection = options[parent]?.some(child => value.includes(child));
                                return (
                                    <div
                                        key={parent}
                                        className={`px-3 py-2 cursor-pointer rounded-lg text-sm mb-1 flex justify-between items-center ${activeParent === parent ? "bg-white hover:bg-[#4E5BA610] font-medium text-[#4E5BA6]" : "text-gray-600 hover:bg-gray-50"}`}
                                        onMouseEnter={() => setActiveParent(parent)}
                                    >
                                        <span>{parent}</span>
                                        {hasSelection && <div className="w-1.5 h-1.5 rounded-full bg-[#4E5BA6]"></div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right Column: Children */}
                        <div className="w-1/2 max-h-60 overflow-y-auto custom-scrollbar p-2">
                            {options[activeParent]?.map((child) => {
                                const isSelected = value.includes(child);
                                return (
                                    <div
                                        key={child}
                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-sm mb-1 ${isSelected ? "bg-[#4E5BA61A] text-[#4E5BA6] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                                        onClick={() => handleOptionClick(child)}
                                    >
                                        <span>{child}</span>
                                        {isSelected && <CheckOutlined className="text-[#4E5BA6] text-xs" />}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selected Tags Display */}
            {value.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {value.slice(0, 6).map((val) => (
                        <div
                            key={val}
                            className="flex items-center gap-1 px-3 py-1 bg-white border border-[#4E5BA6] rounded-full text-sm text-gray-700"
                        >
                            <span>{val}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOptionClick(val);
                                }}
                                className="text-gray-400 hover:text-[#4E5BA6] ml-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {value.length > 6 && (
                        <Tooltip title={value.slice(6).join(", ")}>
                            <div className="flex items-center px-3 py-1 bg-white border border-[#4E5BA6] rounded-full text-sm text-gray-600 cursor-help">
                                +{value.length - 6}...
                            </div>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
};

const ButtonFilter = ({
    onFilter,
    filterOptions,
    fieldLabels,
    optionLabels = {},
    setSelectedFilters,
    selectedFilters,
    className = "",
    singleSelectFields = []
}) => {
    const [open, setOpen] = useState(false);
    const [isTwoColumn, setIsTwoColumn] = useState(false);
    const [isSmallWidth, setIsSmallWidth] = useState(false);

    useEffect(() => {
        const checkLayout = () => {
            // Switch to 2 columns if height is small (< 900px) to prevent overflow,
            // but only on desktop screens (>= 768px)
            const shouldBeTwoColumn = window.innerHeight < 900 && window.innerWidth >= 768;
            setIsTwoColumn(shouldBeTwoColumn);
            setIsSmallWidth(window.innerWidth < 1570);
        };

        checkLayout();
        window.addEventListener('resize', checkLayout);
        return () => window.removeEventListener('resize', checkLayout);
    }, []);

    const latestSelectedFiltersRef = useRef(selectedFilters || {});

    useEffect(() => {
        latestSelectedFiltersRef.current = selectedFilters || {};
    }, [selectedFilters]);

    const handleSelectChange = (field, values) => {
        setSelectedFilters((prev) => {
            const nextFilters = { ...prev, [field]: values };
            latestSelectedFiltersRef.current = nextFilters;
            return nextFilters;
        });
    };

    const handleApply = () => {
        onFilter?.(latestSelectedFiltersRef.current);
        setOpen(false);
    };

    const handleClear = () => {
        latestSelectedFiltersRef.current = {};
        setSelectedFilters({});
        onFilter?.({});
        setOpen(false);
    };

    // đếm tổng số field có chọn ít nhất 1 option
    const activeFilterCount = Object.values(selectedFilters || {}).filter(
        (val) => Array.isArray(val) && val.length > 0
    ).length;

    const filterMenu = (
        <div
            className={`bg-white rounded-2xl border border-gray-200 p-6 pt-3 shadow-xl transition-all duration-300 ${isTwoColumn ? (isSmallWidth ? "w-[700px]" : "w-[800px]") : "w-[392px]"}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-center mb-6">
                <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
            </div>
            <h3 className="text-[12px] font-normal text-gray-600 mb-[24px]">Tùy chọn lọc:</h3>

            <div className={isTwoColumn ? "grid grid-cols-2 gap-6" : "flex flex-col gap-6"}>
                {Object.keys(filterOptions || {}).map((field) => {
                    let options = [];
                    if (field === "industry") {
                        if (selectedFilters?.industry_group?.length > 0) {
                            options = selectedFilters.industry_group
                                .flatMap(group => filterOptions.industry?.[group] || [])
                                .map((optionValue) => ({
                                    value: optionValue,
                                    label: optionLabels?.[field]?.[optionValue] || optionValue
                                }));
                        }
                    } else if (field === 'location') {
                        // Location is handled by CascadingSelect and options is an object, so we don't map it here
                        options = [];
                    } else if (field === 'date_range') {
                        options = [];
                    } else {
                        options = (Array.isArray(filterOptions?.[field]) ? filterOptions[field] : []).map((opt) => {
                            if (typeof opt === 'object' && opt !== null && opt.label) return opt;
                            return {
                                value: opt,
                                label: optionLabels?.[field]?.[opt] || opt
                            };
                        });
                    }

                    return (
                        <div key={field}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[14px] font-semibold text-gray-800">
                                    {fieldLabels?.[field]}
                                </label>
                                <button
                                    onClick={() => handleSelectChange(field, field === 'date_range' ? {} : [])}
                                    className="text-[14px] font-semibold text-[#4E5BA6] hover:text-[#3b4685]"
                                >
                                    Đặt lại
                                </button>
                            </div>
                            {field === 'location' ? (
                                <CascadingSelect
                                    options={filterOptions?.[field] || {}}
                                    value={selectedFilters?.[field] || []}
                                    onChange={(values) => handleSelectChange(field, values)}
                                    placeholder={`Chọn ${String(fieldLabels?.[field] || field).toLowerCase()}`}
                                    label={fieldLabels?.[field]}
                                    size={isTwoColumn ? "small" : "default"}
                                />
                            ) : field === 'date_range' ? (
                                <DateRangeSelect
                                    value={selectedFilters?.[field] || {}}
                                    onChange={(values) => handleSelectChange(field, values)}
                                    placeholder={`Chọn khoảng thời gian`}
                                    label={fieldLabels?.[field]}
                                    size={isTwoColumn ? "small" : "default"}
                                />
                            ) : field === 'price_range' ? (
                                <PriceRangeSlider
                                    value={selectedFilters?.[field] || [0, 10000000]}
                                    onChange={(values) => handleSelectChange(field, values)}
                                    label={fieldLabels?.[field]}
                                />
                            ) : field === 'quantity_range' ? (
                                <QuantityRangeSlider
                                    value={selectedFilters?.[field]}
                                    onChange={(values) => handleSelectChange(field, values)}
                                    label={fieldLabels?.[field]}
                                    min={Array.isArray(filterOptions?.[field]) ? filterOptions[field][0] : 0}
                                    max={Array.isArray(filterOptions?.[field]) ? filterOptions[field][1] : 1000}
                                />
                            ) : (
                                <CustomMultiSelect
                                    options={options}
                                    value={selectedFilters?.[field] || []}
                                    onChange={(values) => handleSelectChange(field, values)}
                                    placeholder={`Chọn ${String(fieldLabels?.[field] || field).toLowerCase()}`}
                                    label={fieldLabels?.[field]}
                                    size={isTwoColumn ? "small" : "default"}
                                    mode={singleSelectFields.includes(field) || field === 'status' ? "single" : "multiple"}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                <Button
                    onClick={handleClear}
                    className="flex-1 !h-12 !rounded-xl !bg-[#E0E5F2] !text-[#4E5BA6] !border-none hover:!bg-[#d0d6e8] font-semibold"
                >
                    Đặt lại tất cả
                </Button>
                <Button
                    type="primary"
                    onClick={handleApply}
                    className="flex-1 !h-12 !rounded-xl !bg-[#4E5BA6] hover:!bg-[#3b4685] !border-none font-semibold text-white"
                >
                    Áp dụng
                </Button>
            </div>
        </div>
    );

    return (
        <Dropdown
            popupRender={() => filterMenu}
            trigger={["click"]}
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
            className="inline-flex"
        >
            <Badge count={activeFilterCount} size="small" className="inline-flex items-stretch">
                <Button
                    type="default"
                    icon={<FunnelPlotOutlined className="!text-gray-600" />}
                    className={`inline-flex items-center gap-2
                      !h-9 !px-4 !rounded-2xl border
                      !border-gray-300 !text-gray-700 !bg-white
                      hover:border-[#4E5BA6]
          focus-within:border-[#4E5BA6]
                      ${className}`}
                >
                    Bộ lọc
                </Button>
            </Badge>
        </Dropdown>
    );
};

export default ButtonFilter;
