import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryDetail } from "@/features/resources/hooks/useSummaryRecords";
import { formatSmallNumbers, calculateTrend, formatCompactDashboard, formatFullNumber } from "@/components/dashboard/DashboardLogical";
import dayjs from "dayjs";
import {
    Trash2, Droplets, Wind, AlertTriangle, Activity,
    Recycle, Factory, Home, TestTube, Truck, Biohazard,
    ArrowUpRight
} from 'lucide-react';
import AutoLineChart from "@/components/ui/AutoLineChart";
import DonutChart from "@/components/ui/DonutChart";
import { EnterpriseMetricCard } from "@/components/dashboard/DashboardComponents";
import { Tooltip } from "antd";

// --- COMPONENTS ---
const DetailItem = ({ label, value, fullValue, unit, icon: Icon, color }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 transition-all duration-200 group">
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform`}>
                <Icon className="size-6" strokeWidth={2} />
            </div>
            <span className="text-gray-700 font-semibold text-base">{label}</span>
        </div>
        <div className="text-right">
            <Tooltip title={fullValue ? `${fullValue} ${unit || ''}` : null} color="#374151" placement="topRight">
                <span className={`block font-bold text-xl ${fullValue ? "cursor-help text-[#374151] hover:text-[#4E5BA6] underline decoration-dashed underline-offset-4 decoration-1 decoration-gray-300 transition-colors" : "text-gray-900"}`}>{value}</span>
            </Tooltip>
            {unit && <span className="text-sm text-gray-500 font-medium ml-1">{unit}</span>}
        </div>
    </div>
);

const CompanyWastesTab = ({ companyId, zoneId, role, selectedDate, isAllYear, selectedYear }) => {
    const navigate = useNavigate();

    // Use selectedDate from prop or fall back to current date
    const date = selectedDate || dayjs();
    const year = selectedYear || date.year();

    // Compute period key range based on isAllYear
    let periodKeyStart, periodKeyEnd;
    if (isAllYear) {
        periodKeyStart = year * 100 + 1;
        periodKeyEnd = year * 100 + 12;
    } else {
        const pk = Number(date.format("YYYYMM"));
        periodKeyStart = pk;
        periodKeyEnd = pk;
    }

    const dateLabel = isAllYear ? `Năm ${year}` : `Tháng ${date.format("MM/YYYY")}`;

    const { data: summaryRecords = {}, isLoading, isFetching } = useSummaryDetail({
        role, companyId, zoneId,
        periodKeyStart, periodKeyEnd,
        include: [6] // Only Waste (Group 6)
    }, { enabled: !!companyId, keepPreviousData: false });

    // Get raw waste data from WasteResource
    const wasteRawData = summaryRecords.WasteResource || summaryRecords.waste || [];

    // Helper to normalize main_group to waste type
    const normalizeWasteType = (mainGroup) => {
        const g = (mainGroup || '').toLowerCase();
        if (g.includes('sinh hoạt') || g === 'do') return 'DO';
        if (g.includes('công nghiệp') || g === 'ind') return 'IND';
        if (g.includes('nguy hại') || g === 'ha') return 'HA';
        if (g.includes('nước thải') || g === 'wwa') return 'WWA';
        if (g.includes('khí thải') || g === 'gasw') return 'GASW';
        return null;
    };

    const { cardData, wasteTotals } = useMemo(() => {
        const rawData = Array.isArray(wasteRawData) ? wasteRawData : [];

        // Aggregate totals from raw data
        const totals = { DO: 0, IND: 0, HA: 0, WWA: 0, GASW: 0 };

        rawData.forEach(item => {
            const wasteType = normalizeWasteType(item.main_group);
            const qty = Number(item.quantity) || 0;
            if (!wasteType || qty <= 0) return;
            totals[wasteType] += qty;
        });

        const getNum = (val) => Number(val) || 0;

        const cards = [
            {
                id: 'solid', title: "Chất thải Rắn", icon: Trash2, baseColor: "#10B981", to: `/waste/solid-waste`,
                mainMetrics: [
                    { label: "Tổng sinh hoạt", value: formatCompactDashboard(getNum(totals.DO)), fullValue: formatFullNumber(getNum(totals.DO)), unit: "Tấn", trend: null },
                    { label: "Tổng công nghiệp", value: formatCompactDashboard(getNum(totals.IND)), fullValue: formatFullNumber(getNum(totals.IND)), unit: "Tấn", trend: null },
                    { label: "Tổng nguy hại", value: formatCompactDashboard(getNum(totals.HA)), fullValue: formatFullNumber(getNum(totals.HA)), unit: "Tấn", trend: null }
                ]
            },
            {
                id: 'water', title: "Nước thải", icon: Droplets, baseColor: "#06B6D4", to: `/waste/wastewater`,
                mainMetrics: [{ label: "Tổng lượng", value: formatCompactDashboard(getNum(totals.WWA)), fullValue: formatFullNumber(getNum(totals.WWA)), unit: "m³", trend: null }]
            },
            {
                id: 'gas', title: "Khí thải", icon: Wind, baseColor: "#64748B", to: `/waste/gas-waste`,
                mainMetrics: [{ label: "Tổng lượng", value: formatCompactDashboard(getNum(totals.GASW)), fullValue: formatFullNumber(getNum(totals.GASW)), unit: totals.unit_gas_waste ?? "mg/l", trend: null }]
            }
        ];
        return { cardData: cards, wasteTotals: totals };
    }, [wasteRawData]);

    const [activeTab, setActiveTab] = useState('solid');

    const pieChartData = useMemo(() => {
        const getNum = (val) => Number(val) || 0;

        switch (activeTab) {
            case 'solid':
                return {
                    data: [
                        { Name: "Sinh hoạt", Value: getNum(wasteTotals.DO), Color: "#10B981" },
                        { Name: "Công nghiệp", Value: getNum(wasteTotals.IND), Color: "#34D399" },
                        { Name: "Nguy hại", Value: getNum(wasteTotals.HA), Color: "#F87171" },
                    ].filter(d => d.Value > 0),
                    total: getNum(wasteTotals.DO) + getNum(wasteTotals.IND) + getNum(wasteTotals.HA),
                    unit: "Tấn"
                };
            case 'water':
                return {
                    data: [
                        { Name: "Nước thải", Value: getNum(wasteTotals.WWA), Color: "#06B6D4" },
                    ].filter(d => d.Value > 0),
                    total: getNum(wasteTotals.WWA),
                    unit: "m³"
                };
            case 'gas':
                return {
                    data: [
                        { Name: "Khí thải", Value: getNum(wasteTotals.GASW), Color: "#94A3B8" },
                    ].filter(d => d.Value > 0),
                    total: getNum(wasteTotals.GASW),
                    unit: wasteTotals.unit_gas_waste ?? "mg/l"
                };
            default: return { data: [], total: 0, unit: "" };
        }
    }, [activeTab, wasteTotals]);

    const renderSideDetails = () => {
        const getNum = (val) => Number(val) || 0;

        switch (activeTab) {
            case 'solid':
                return (
                    <>
                        <DetailItem label="Sinh hoạt" value={formatCompactDashboard(getNum(wasteTotals.DO))} fullValue={formatFullNumber(getNum(wasteTotals.DO))} unit="Tấn" icon={Home} color="emerald" />
                        <DetailItem label="Công nghiệp" value={formatCompactDashboard(getNum(wasteTotals.IND))} fullValue={formatFullNumber(getNum(wasteTotals.IND))} unit="Tấn" icon={Factory} color="teal" />
                        <DetailItem label="Nguy hại" value={formatCompactDashboard(getNum(wasteTotals.HA))} fullValue={formatFullNumber(getNum(wasteTotals.HA))} unit="Tấn" icon={Biohazard} color="red" />
                    </>
                );
            case 'water':
                return (
                    <>
                        <DetailItem label="Tổng Nước thải" value={formatCompactDashboard(getNum(wasteTotals.WWA))} fullValue={formatFullNumber(getNum(wasteTotals.WWA))} unit="m³" icon={Droplets} color="cyan" />
                    </>
                );
            case 'gas':
                return (
                    <>
                        <DetailItem label="Tổng Khí thải" value={formatCompactDashboard(getNum(wasteTotals.GASW))} fullValue={formatFullNumber(getNum(wasteTotals.GASW))} unit={wasteTotals.unit_gas_waste ?? "mg/l"} icon={Wind} color="slate" />
                    </>
                );
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100">
                <Activity className="size-8 text-[#4E5BA6] animate-pulse mb-3" />
                <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu chất thải...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* 1. TOP SUMMARY CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0 p-1.75">
                {cardData.map((card) => (
                    <div
                        key={card.id}
                        onClick={(e) => { e.preventDefault(); setActiveTab(card.id); }}
                        className={`group/card cursor-pointer h-full transition-all duration-300 transform rounded-3xl overflow-hidden relative ${activeTab === card.id ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02] z-10' : 'hover:scale-[1.02] hover:shadow-lg opacity-80 hover:opacity-100'}`}
                    >
                        <div className="pointer-events-none h-full">
                            <EnterpriseMetricCard {...card} to={undefined} />
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. MAIN CONTENT SPLIT */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT: CHART AREA */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="size-5 text-gray-400" />
                            Tổng quan {dateLabel}
                        </h3>
                        <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                            {cardData.find(c => c.id === activeTab)?.title}
                        </span>
                    </div>

                    <div className="flex-1 w-full min-h-[350px] flex items-center justify-center relative">
                        {pieChartData.total > 0 ? (
                            <div className="h-full w-full">
                                <DonutChart
                                    data={pieChartData.data}
                                    totalValue={pieChartData.total}
                                    unit={pieChartData.unit}
                                    showLegend={true}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <div className="p-4 bg-gray-50 rounded-full mb-3">
                                    <Activity className="size-8 opacity-50" />
                                </div>
                                <p className="font-medium text-sm">Chưa có dữ liệu cho danh mục này</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: DETAILS PANEL */}
                <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[500px]">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                        <h3 className="text-lg font-bold text-gray-800">Chi tiết {cardData.find(c => c.id === activeTab)?.title}</h3>
                        <p className="text-sm text-gray-500">{dateLabel}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {renderSideDetails()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyWastesTab;
