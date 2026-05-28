import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { calcPercentageChange } from "./DashboardLogical";
import React from 'react';
import { IonIcon } from '@ionic/react';
import { library, chatbubbles, folder } from 'ionicons/icons';
import { ArrowDownRight, Minus } from "lucide-react";
import { Building2, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { chevronDown } from 'ionicons/icons';
import { useState } from "react";
import hexToRgb from "@/utils/hexToRGB";
import { Tooltip } from "antd";
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";


export const ResourceCard = ({ icon, title, data, unit }) => {
    return (
        <div className="flex gap-2 flex-1">
            <div className="flex">
                {icon}
            </div>
            <div className="flex flex-col flex-1 text-gray-600">
                <p className="truncate w-full overflow-visible">{title}</p>
                <span className="flex items-end gap-1">
                    <p className="text-2xl font-medium text-black leading-none">{data}</p>
                    <p>{unit}</p>
                </span>
            </div>
        </div>
    );
}

export const DataCard = ({ icon, title, value, className, unit, to, previousMonthData, currentMonthData }) => {
    const navigate = useNavigate();
    return (
        <div className={`bg-[#E4E8FF] flex text-[#242424] justify-between size-full p-3 2xl:p-4 rounded-xl z-10 cursor-pointer ${className}`}
            onClick={() => to && navigate(to)}
        >
            <div className="flex justify-between flex-col pt-2 gap-2">
                <p className="font-medium uppercase text-gray-700 text-nowrap">{title}</p>
                <span className="flex-col gap-0 flex px-2 flex-grow">
                    <p className="text-black font-medium text-2xl 2xl:text-3xl flex-grow">{value}</p>
                    <p className="text-gray-600">{unit}</p>
                </span>
                {calcPercentageChange({ previousMonthData: previousMonthData, currentMonthData: currentMonthData })}
            </div>
            <div className="flex flex-col shrink-0 justify-between">
                {icon}
                <span className="flex items-end gap-1 text-gray-500 text-sm leading-none">
                    <Building2 strokeWidth={1} />
                    <p>299</p>
                </span>
            </div>
        </div>
    );
};

export const ResourceCardContainer = ({ icon, title, children, className }) => {
    return (
        <div
            className={clsx(
                "flex flex-col w-full bg-white border border-black/20 rounded-2xl p-[10px] gap-3",
                className
            )}
        >
            {/* Header */}
            <div className="flex w-full overflow-visible h-fit text-gray-600 items-center gap-2">
                {icon}
                <p className="truncate overflow-visible">{title}</p>

            </div>

            {children}
        </div>
    );
};

export const QuickLink = ({ icon, title, url }) => {
    return (
        <Link
            to={url}
            className="flex items-center flex-1 min-w-0 p-3 gap-2 transition bg-white border border-black/20 rounded-2xl"
            title={`Đi đến trang ${title}`}
        >
            {icon}
            <span className="text-sm text-gray-800 truncate"
            >
                {title}
            </span>
        </Link>
    );
};

export const CardContainer = ({ icon, title, children, className, options = [], to, selectedOption, onOptionChange }) => {
    const navigate = useNavigate();
    const currentOption = options.find(opt => opt.value === selectedOption) || options[0] || null;

    const handleChange = (opt) => {
        if (onOptionChange) {
            onOptionChange(opt);
        }
    };

    return (
        <div
            className={clsx(
                "flex flex-col w-full bg-white border border-black/20 rounded-2xl p-[10px] gap-1",
                className
            )}
            onClick={() => to && navigate(to)}
        >
            {/* Header */}
            <div className="flex w-full overflow-visible h-fit text-gray-600 items-start gap-2 justify-between">
                <span className="flex overflow-visible h-fit text-gray-600 items-center gap-2">
                    {currentOption?.icon || icon}
                    <p className="truncate overflow-visible">
                        {currentOption?.title || title}
                    </p>
                </span>

                {options.length > 0 && (
                    <DropdownFilter
                        options={options}
                        onChange={handleChange}
                        selected={currentOption}
                    />
                )}
            </div>

            {/* Body content */}
            <div className="flex flex-grow w-full relative min-h-0">
                {children}
            </div>
        </div>
    );
};

function DropdownFilter({ options = [], onChange, selected }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block w-32 md:w-40 h-full select-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full items-center px-3 h-full rounded-lg border border-gray-300 bg-white flex justify-between ml-auto hover:bg-gray-50 transition"
            >
                <span>{selected?.label}</span>
                <span
                    className={`text-sm transition duration-300 h-full flex items-center ${isOpen ? "rotate-180" : "rotate-0"
                        }`}
                >
                    <IonIcon icon={chevronDown} />
                </span>
            </button>

            {isOpen && (
                <ul className="absolute left-0 flex flex-col gap-2 mt-2 w-full bg-white border border-gray-200 rounded-lg z-50 shadow-md overflow-hidden">
                    {options.map((item) => (
                        <li
                            key={item.label}
                            onClick={() => {
                                onChange(item); // Gửi object option lên CardContainer
                                setIsOpen(false);
                            }}
                            className={`px-3 2xl:py-1 cursor-pointer hover:bg-gray-100 transition ${selected?.label === item.label ? "bg-gray-100 font-medium" : ""
                                }`}
                        >
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export const ModernQuickLink = ({ icon, title, url, description, color = "#3b82f6", alert = false }) => {
    return (
        <Link to={url} className="flex group flex-1 h-full">
            <motion.div
                whileHover={{ y: -5, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative h-full w-full overflow-hidden bg-white rounded-2xl border border-gray-200 p-3 md:p-5 flex flex-col items-start justify-between gap-3 md:gap-4"
                style={{ '--hover-color': color }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
            >
                {/* Background Decoration */}
                <div
                    className="absolute -right-4 -top-4 blur-2xl w-24 h-24 rounded-full transition-all duration-500 ease-in-out opacity-20 group-hover:opacity-100 group-hover:scale-[2.1]"
                    style={{ backgroundColor: color }}
                />

                <div className="w-full flex justify-between items-start z-10">
                    <div className="relative">
                        <div
                            className="p-2 md:p-3 rounded-xl text-white shadow-lg"
                            style={{ backgroundColor: color }}
                        >
                            <span className="[&>svg]:size-5 md:[&>svg]:size-6">{icon}</span>
                        </div>
                        {alert && (
                            <Tooltip title="Chưa nộp Báo cáo Môi trường" placement="top">
                                <span className="absolute -top-1 -right-1 flex h-3 w-3 cursor-pointer">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                                </span>
                            </Tooltip>
                        )}
                    </div>

                    <motion.div
                        className="p-1.5 rounded-full text-gray-400 group-hover:text-gray-800 transition-colors"
                        whileHover={{ x: 3 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.div>
                </div>

                <div className="z-10 w-full overflow-hidden">
                    <Tooltip title={title} placement="top">
                        <h3 className="font-bold text-base md:text-lg text-gray-800 transition-colors truncate">
                            {title}
                        </h3>
                    </Tooltip>
                    {description && (
                        <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-1" title={description}>
                            {description}
                        </p>
                    )}
                </div>
            </motion.div>
        </Link>
    );
};

import EnterpriseDeclarationButton from "./EnterpriseDeclarationButton";

export const EnterpriseMetricCard = ({
    title,
    icon: Icon,
    mainMetrics = [],
    subMetrics = [],
    baseColor = "#3b82f6",
    companyCount,
    periodKey,
    date,
    resourceCategory,
    zoneId,
    to
}) => {
    const { user } = useIsAuthenticated();
    const role = user?.user?.role;
    const themeRgb = hexToRgb(baseColor);

    return (
        <a
            href={to}
            style={{
                '--theme-rgb': themeRgb,
                '--theme-color': baseColor
            }}
            className={clsx(
                // 1. Class cho container chính
                "group relative flex flex-col p-5 rounded-3xl h-full overflow-hidden",
                "border border-gray-200  transition-all duration-300",

                // 2. Nền mặc định (Rất nhạt hoặc trắng) - KHÔNG hover gradient ở đây
                "bg-white"
            )}
        >
            <div
                className="absolute inset-0 transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100"
                style={{
                    background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.2), white 60%)`
                }}
            />

            <div
                className="absolute inset-0 opacity-100"
                style={{
                    background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.3), white 99%)`
                }}
            />

            <div className="absolute inset-0 rounded-3xl border border-transparent transition-colors duration-300 group-hover:border-[rgba(var(--theme-rgb),0.5)] pointer-events-none z-20" />


            <div className="relative z-10 flex flex-col h-full justify-between">

                {/* Watermark Icon */}
                <Icon
                    className="absolute -bottom-6 -right-6 size-40 pointer-events-none transition-transform group-hover:scale-110 duration-700 opacity-10 text-[rgb(var(--theme-rgb))]"
                />

                {/* HEADER */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 bg-[rgb(var(--theme-rgb))] text-white">
                            <Icon className="size-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-medium text-lg leading-tight text-gray-800 transition-colors group-hover:text-[rgb(var(--theme-rgb))]">
                                {title}
                            </h3>
                        </div>
                    </div>
                    {/* COMPANY COUNT (Với Trigger cho Modal) */}
                    {role !== 'company' && companyCount !== undefined && (
                        <EnterpriseDeclarationButton
                            periodKey={periodKey}
                            date={date}
                            resourceCategory={resourceCategory}
                            zoneId={zoneId}
                            customTrigger={(openModal) => (
                                <Tooltip title="Chi tiết báo cáo doanh nghiệp">
                                    <div
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openModal();
                                        }}
                                        className="flex flex-col shrink-0 justify-between group/count hover:scale-105 transition-transform cursor-pointer relative z-50"
                                    >
                                        <span className="relative flex items-center gap-1 text-gray-500 text-sm leading-none bg-white/80 p-1.5 px-2.5 rounded-lg border border-[rgba(var(--theme-rgb),0.4)] group-hover/count:bg-white group-hover/count:shadow-sm transition-all">
                                            {/* Effect: Pinging dot */}
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--theme-rgb))] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[rgb(var(--theme-rgb))] shadow-sm"></span>
                                            </span>

                                            <Building2 strokeWidth={2} className="size-4 text-[rgb(var(--theme-rgb))]" />
                                            <p className="font-bold text-gray-700">{companyCount}</p>
                                        </span>
                                    </div>
                                </Tooltip>
                            )}
                        />
                    )}
                </div>

                {/* MAIN METRICS */}
                <div className={clsx("flex flex-col gap-2")}>
                    {mainMetrics.map((metric, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 p-1 px-2 rounded-2xl border backdrop-blur-md transition-colors hover:bg-white/60 bg-white/40 border-[rgba(var(--theme-rgb),0.1)]"
                        >
                            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-500 line-clamp-1 text-left">
                                {metric.label}
                            </span>

                            <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
                                <Tooltip title={metric.fullValue ? `${metric.fullValue} ${metric.unit}` : undefined} placement="top">
                                    <span
                                        className="font-bold flex items-center text-[rgb(var(--theme-rgb))] truncate cursor-default"
                                        style={{ fontSize: '1.4rem' }}
                                    >
                                        {metric.value}
                                    </span>
                                </Tooltip>
                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                    {metric.unit}
                                </span>
                            </div>

                            {/* <div className="shrink-0 flex items-center justify-end">
                                <TrendBadge value={metric.trend} inverse={metric.inverseTrend} compact={true} />
                            </div> */}
                        </div>
                    ))}
                </div>

                {/* SUB METRICS */}
                <div className="flex flex-col gap-2 flex-grow justify-end">
                    {subMetrics.length > 0 && <div className="border-t border-[rgba(var(--theme-rgb),0.2)] mb-2" />}
                    {subMetrics.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white/60 transition-colors">
                            <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                            <div className="flex items-center gap-2">
                                <Tooltip title={item.fullValue ? `${item.fullValue} ${item.unit}` : undefined} placement="left">
                                    <span className="text-sm font-bold text-gray-800 cursor-default">
                                        {item.value} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                                    </span>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrow Action */}
            <div className="absolute bottom-5 right-5 z-20 transition-all duration-300 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 text-[rgb(var(--theme-rgb))]">
                <ArrowUpRight className="size-5" />
            </div>
        </a>
    );
};

const TrendBadge = ({ value, inverse = false }) => {
    if (value === 0 || value === null || value === undefined) {
        return <span className="text-gray-400 opacity-70"><Minus className="size-4" /></span>;
    }

    if (value === 'NEW') {
        return (
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold text-blue-700 bg-blue-100/80 border-blue-200/60 backdrop-blur-sm">
                <span>Mới</span>
            </div>
        );
    }

    const numericValue = Math.abs(Number(value));
    const isPositive = Number(value) > 0;
    // inverse: true thì Tăng là xấu (đỏ), Giảm là tốt (xanh) - VD: Tỷ lệ lỗi
    const isGood = inverse ? !isPositive : isPositive;

    // Sử dụng màu đậm hơn một chút trên nền màu
    const colorClass = isGood
        ? "text-emerald-700 bg-emerald-100/80 border-emerald-200/60"
        : "text-rose-700 bg-rose-100/80 border-rose-200/60";

    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

    // Định dạng số gọn gàng (Multiplier System)
    let displayValue;
    if (isPositive && numericValue >= 100) {
        // Tăng >= 100% (gấp từ 2 lần trở lên)
        const multiplier = Math.round(numericValue / 100 + 1);
        displayValue = `x${Math.round(multiplier).toLocaleString('vi-VN')}`;
    } else {
        // Tăng < 100% hoặc Giảm
        displayValue = `${Math.round(numericValue).toLocaleString('vi-VN')}%`;
    }

    return (
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${colorClass} backdrop-blur-sm`}>
            <Icon className="size-3" strokeWidth={3} />
            <span>{displayValue}</span>
        </div>
    );
};
