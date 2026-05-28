import React, { useMemo, useState } from 'react';
import { useSummaryRecordByPeriodkey, useSummaryDetail } from "@/features/resources/hooks/useSummaryRecords";
import { formatCompactDashboard, formatFullNumber } from "@/components/dashboard/DashboardLogical";
import dayjs from "dayjs";
import { Activity, Zap, Droplets, Pickaxe, Flame, Trash2, Wind, FlaskConical, BarChart3, LineChart, AreaChart as AreaChartIcon, TrendingUp, Calendar, Sprout, AlertTriangle, ArrowRight } from 'lucide-react';
import AutoLineChart from "@/components/ui/AutoLineChart";
import AutoBarChart from "@/components/ui/AutoBarChart";
import AutoAreaChart from "@/components/ui/AutoAreaChart";
import { EnterpriseMetricCard, DataCard } from "@/components/dashboard/DashboardComponents";
import { useEnvReports } from "@/features/resources/hooks/useEnvironmentalReport";

const CompanyOverviewStats = ({ companyId, zoneId, role, selectedDate, isAllYear, selectedYear: propYear }) => {
    const [activeTab, setActiveTab] = useState('materials');
    const [chartType, setChartType] = useState('line');

    const date = selectedDate || dayjs();
    const currentYear = propYear || date.year();
    const currentMonth = isAllYear ? dayjs().month() + 1 : (date.month() + 1);
    const periodKeyStart = Number(`${currentYear}01`);
    const periodKeyEnd = Number(`${currentYear}12`);

    // Fetch data for the whole year to populate the trend map
    const { data: recordsRaw = [], isLoading } = useSummaryRecordByPeriodkey({
        role, companyId, zoneId,
        periodKeyStart, periodKeyEnd,
        include: [1, 2, 3, 4, 5, 6] // All groups: materials, chemicals, fuels, waste, emissions
    }, { enabled: !!companyId });

    // Fetch raw waste data from WasteResource documents (same source as CompanyWastesTab)
    const { data: wasteRawRecords = {} } = useSummaryDetail({
        role, companyId, zoneId,
        periodKeyStart, periodKeyEnd,
        include: [6] // 6 = Waste only
    }, { enabled: !!companyId });

    // Compute waste totals from raw data
    const rawWasteTotals = useMemo(() => {
        const rawData = Array.isArray(wasteRawRecords.WasteResource || wasteRawRecords.waste || wasteRawRecords)
            ? (wasteRawRecords.WasteResource || wasteRawRecords.waste || wasteRawRecords)
            : [];

        const totals = { solid: 0, water: 0, gas: 0 };
        const byMonth = {};

        rawData.forEach(item => {
            const g = (item.main_group || '').toLowerCase();
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) return;

            // Get month from periodKey
            const pk = item.periodKey || item.period_key;
            const m = pk ? Number(String(pk).slice(4)) : null;

            if (['do', 'ind', 'ha'].includes(g) || g.includes('sinh hoạt') || g.includes('công nghiệp') || g.includes('nguy hại')) {
                totals.solid += qty;
                if (m) {
                    if (!byMonth[m]) byMonth[m] = { solid: 0, water: 0, gas: 0 };
                    byMonth[m].solid += qty;
                }
            } else if (g === 'wwa' || g.includes('nước thải')) {
                totals.water += qty;
                if (m) {
                    if (!byMonth[m]) byMonth[m] = { solid: 0, water: 0, gas: 0 };
                    byMonth[m].water += qty;
                }
            } else if (g === 'gasw' || g.includes('khí thải')) {
                totals.gas += qty;
                if (m) {
                    if (!byMonth[m]) byMonth[m] = { solid: 0, water: 0, gas: 0 };
                    byMonth[m].gas += qty;
                }
            }
        });

        return { totals, byMonth };
    }, [wasteRawRecords]);

    const records = useMemo(() => {
        return Array.isArray(recordsRaw) ? recordsRaw : (recordsRaw?.summaryRecord || []);
    }, [recordsRaw]);

    // Aggregate data
    const { ytdTotals, currentMonthTotals, chartData } = useMemo(() => {
        const ytd = {
            materials: 0, energy: 0, water: 0, wasteSolid: 0, wasteWater: 0, wasteGas: 0, emissions: 0, chemicals: 0, combustion: 0
        };
        const curM = {
            materials: 0, energy: 0, water: 0, wasteSolid: 0, wasteWater: 0, wasteGas: 0, emissions: 0, chemicals: 0, combustion: 0
        };

        const byMonth = {};
        for (let m = 1; m <= 12; m++) byMonth[m] = {};

        records.forEach(record => {
            const m = Number(String(record.periodKey).slice(4));
            const isCurrentMonth = isAllYear || m === currentMonth;

            const mat = record.input_materials ?? {};
            const chem = record.input_chemicals ?? {};
            const fuel = record.fuels ?? {};
            const waste = record.waste ?? {};
            const emission = record.emissions ?? {};

            const getNum = (val) => Number(val) || 0;

            const tMat = getNum(mat.total_materials);
            const tChem = getNum(chem.total_chemicals_kg) + getNum(chem.total_chemicals_l) + getNum(chem.total_chemicals_m3);
            const tEnergy = getNum(fuel.total_electricity);
            const tWater = getNum(fuel.total_water);
            const tCombustion = getNum(fuel.total_combustion);
            // Waste: use raw data instead of summary record
            const rawMonthWaste = rawWasteTotals.byMonth[m] || { solid: 0, water: 0, gas: 0 };
            const tWasteSolid = rawMonthWaste.solid;
            const tWasteWater = rawMonthWaste.water;
            const tWasteGas = rawMonthWaste.gas;
            // Emissions: use fallback formulas when backend total_co2 = 0 (matching Co2CompanyPage logic)
            const elecCO2 = getNum(emission.total_co2_from_electricity);
            const combCO2 = getNum(emission.total_co2_from_combustion);
            const waterCO2 = getNum(emission.total_co2_from_water) > 0
                ? getNum(emission.total_co2_from_water)
                : (getNum(fuel.total_water) * 0.177) / 1000;
            const matCO2 = getNum(emission.total_co2_from_materials) > 0
                ? getNum(emission.total_co2_from_materials)
                : getNum(mat.total_materials) * 0.25;
            const chemCO2 = getNum(emission.total_co2_from_chemicals) > 0
                ? getNum(emission.total_co2_from_chemicals)
                : (getNum(chem.total_chemicals_kg) + getNum(chem.total_chemicals_l) + getNum(chem.total_chemicals_m3)) * 0.4;
            const wasteCO2 = getNum(emission.total_co2_from_waste) > 0
                ? getNum(emission.total_co2_from_waste)
                : (getNum(waste.total_waste_DO) * 0.45) + (getNum(waste.total_waste_IND) * 0.40) + (getNum(waste.total_waste_HA) * 0.70) + (getNum(waste.total_waste_WWA) * 0.50) + (getNum(waste.total_waste_GASW) * 0.50);

            const tEmiss = getNum(emission.total_co2) > 0
                ? getNum(emission.total_co2)
                : (elecCO2 + combCO2 + waterCO2 + matCO2 + chemCO2 + wasteCO2);

            ytd.materials += tMat;
            ytd.chemicals += tChem;
            ytd.energy += tEnergy;
            ytd.water += tWater;
            ytd.combustion += tCombustion;
            ytd.wasteSolid += tWasteSolid;
            ytd.wasteWater += tWasteWater;
            ytd.wasteGas += tWasteGas;
            ytd.emissions += tEmiss;

            if (isCurrentMonth) {
                curM.materials += tMat;
                curM.chemicals += tChem;
                curM.energy += tEnergy;
                curM.water += tWater;
                curM.combustion += tCombustion;
                curM.wasteSolid += tWasteSolid;
                curM.wasteWater += tWasteWater;
                curM.wasteGas += tWasteGas;
                curM.emissions += tEmiss;
            }

            // Populate chart data for trend lines
            if (m >= 1 && m <= 12) {
                byMonth[m] = {
                    energy: [
                        { Name: "Điện lưới", Value: getNum(fuel.total_electricity_grid), Color: "#f59e0b" },
                        { Name: "Điện tái tạo", Value: getNum(fuel.total_electricity_renewable), Color: "#22c55e" }
                    ],
                    water: [
                        { Name: "Nước cấp", Value: getNum(fuel.total_water_tap), Color: "#0ea5e9" },
                        { Name: "Nước tái tạo", Value: getNum(fuel.total_water_recycle), Color: "#14b8a6" }
                    ],
                    materials: [
                        { Name: "Tổng vật liệu", Value: tMat, Color: "#6366f1" }
                    ],
                    chemicals: [
                        { Name: "Dạng rắn", Value: getNum(chem.total_chemicals_kg), Color: "#8b5cf6" },
                        { Name: "Dạng lỏng", Value: getNum(chem.total_chemicals_l), Color: "#06b6d4" },
                        { Name: "Dạng khí", Value: getNum(chem.total_chemicals_m3), Color: "#22c55e" }
                    ],
                    combustion: [
                        { Name: "Than", Value: getNum(fuel.total_combustion_COL), Color: "#78716c" },
                        { Name: "Dầu", Value: getNum(fuel.total_combustion_PET), Color: "#f97316" },
                        { Name: "Khí đốt", Value: getNum(fuel.total_combustion_GASF), Color: "#3b82f6" }
                    ],
                    waste: [
                        { Name: "Chất thải rắn", Value: rawMonthWaste.solid, Color: "#10b981" },
                        { Name: "Nước thải", Value: rawMonthWaste.water, Color: "#06b6d4" },
                        { Name: "Khí thải", Value: rawMonthWaste.gas, Color: "#a855f7" }
                    ],
                    emissions: [
                        { Name: "Điện năng", Value: getNum(emission.total_co2_from_electricity), Color: "#f59e0b" },
                        { Name: "Chất đốt", Value: getNum(emission.total_co2_from_combustion), Color: "#ef4444" },
                        { Name: "Nước", Value: getNum(emission.total_co2_from_water), Color: "#3b82f6" }
                    ]
                };
            }
        });

        const flattenedChartData = {};
        for (let m = 1; m <= 12; m++) {
            flattenedChartData[m] = {
                energy: byMonth[m]?.energy || [],
                water: byMonth[m]?.water || [],
                materials: byMonth[m]?.materials || [],
                chemicals: byMonth[m]?.chemicals || [],
                combustion: byMonth[m]?.combustion || [],
                waste: byMonth[m]?.waste || [],
                emissions: byMonth[m]?.emissions || []
            };
        }

        return { ytdTotals: ytd, currentMonthTotals: curM, chartData: flattenedChartData };
    }, [records, currentMonth, isAllYear, rawWasteTotals]);

    const buildWasteMetrics = (totals) => ([
        {
            label: "Dạng rắn",
            value: formatCompactDashboard(totals.wasteSolid),
            fullValue: formatFullNumber(totals.wasteSolid),
            unit: "Tấn",
        },
        {
            label: "Nước thải",
            value: formatCompactDashboard(totals.wasteWater),
            fullValue: formatFullNumber(totals.wasteWater),
            unit: "m³",
        },
        {
            label: "Khí thải",
            value: formatCompactDashboard(totals.wasteGas),
            fullValue: formatFullNumber(totals.wasteGas),
            unit: "mg/l",
        }
    ]);

    const activeChartData = useMemo(() => {
        const res = {};
        for (let m = 1; m <= 12; m++) {
            res[m] = chartData[m]?.[activeTab] || [];
        }
        return res;
    }, [chartData, activeTab]);

    const tabConfig = {
        materials: { title: "Nguyên vật liệu", unit: "Tấn", icon: <Pickaxe size={24} /> },
        energy: { title: "Điện năng", unit: "kWh", icon: <Zap size={24} /> },
        water: { title: "Nước sử dụng", unit: "m³", icon: <Droplets size={24} /> },
        chemicals: { title: "Hóa chất", unit: "Tấn/L", icon: <FlaskConical size={24} /> },
        combustion: { title: "Chất đốt", unit: "Tấn", icon: <Flame size={24} /> },
        waste: { title: "Chất thải", unit: "Tấn", icon: <Trash2 size={24} /> },
        emissions: { title: "Phát thải CO2", unit: "Tấn", icon: <Sprout size={24} /> },
    };

    const cardData = [
        { id: 'materials', title: "Nguyên vật liệu", icon: Pickaxe, baseColor: "#4E5BA6", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.materials), fullValue: formatFullNumber(currentMonthTotals.materials), unit: "Tấn" }] },
        { id: 'energy', title: "Điện năng", icon: Zap, baseColor: "#FF9D00", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.energy), fullValue: formatFullNumber(currentMonthTotals.energy), unit: "kWh" }] },
        { id: 'water', title: "Nước sử dụng", icon: Droplets, baseColor: "#00A6FF", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.water), fullValue: formatFullNumber(currentMonthTotals.water), unit: "m³" }] },
        { id: 'chemicals', title: "Hóa chất", icon: FlaskConical, baseColor: "#9CB000", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.chemicals), fullValue: formatFullNumber(currentMonthTotals.chemicals), unit: "Tấn/L" }] },
        { id: 'combustion', title: "Chất đốt", icon: Flame, baseColor: "#FF4000", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.combustion), fullValue: formatFullNumber(currentMonthTotals.combustion), unit: "Tấn" }] },
        { id: 'waste', title: "Chất thải", icon: Trash2, baseColor: "#866701", mainMetrics: buildWasteMetrics(currentMonthTotals) },
        { id: 'emissions', title: "Phát thải CO2", icon: Sprout, baseColor: "#1D8651", mainMetrics: [{ value: formatCompactDashboard(currentMonthTotals.emissions), fullValue: formatFullNumber(currentMonthTotals.emissions), unit: "Tấn" }] }
    ];

    // Environmental report reminder (company only)
    const { data: envReports = [] } = useEnvReports(companyId, { enabled: !!companyId && role === 'company' });
    const hasCurrentYearEnvReport = envReports.some(r => r.year === currentYear);
    const showEnvReminder = role === 'company' && !isLoading && !hasCurrentYearEnvReport;

    if (isLoading) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100">
                <Activity className="size-8 text-[#4E5BA6] animate-pulse mb-3" />
                <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu tổng quan...</p>
            </div>
        );
    }

    // Chart Switcher UI
    const renderChart = () => {
        const props = {
            dataByMonth: activeChartData,
            currentMonth: currentMonth,
            unit: tabConfig[activeTab]?.unit
        };
        switch (chartType) {
            case 'bar': return <AutoBarChart {...props} />;
            case 'area': return <AutoAreaChart {...props} fillOpacity={0.4} />;
            case 'line':
            default: return <AutoLineChart {...props} />;
        }
    };

    return (
        <div className="flex flex-col h-full gap-2 lg:gap-3 overflow-hidden">
            {/* 0. ENV REPORT REMINDER BANNER */}
            {showEnvReminder && (
                <div className="shrink-0 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 shadow-sm">
                    <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">
                            Chưa nộp Báo cáo Môi trường năm {currentYear}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Vui lòng vào mục <strong>Thông tin chung</strong> để tải lên báo cáo môi trường hàng năm.
                        </p>
                    </div>
                </div>
            )}

            {/* 1. TOP SUMMARY CARDS (7 categories) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3 shrink-0 p-1">
                {cardData.map((card) => (
                    <div
                        key={card.id}
                        onClick={(e) => { e.preventDefault(); setActiveTab(card.id); }}
                        className={`group/card cursor-pointer h-full transition-all duration-300 transform rounded-3xl overflow-hidden relative
                            ${activeTab === card.id ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02] z-10' : 'hover:scale-[1.02] hover:shadow-lg opacity-80 hover:opacity-100'}`}
                    >
                        <div className="pointer-events-none h-full">
                            <EnterpriseMetricCard {...card} to={undefined} />
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. MAIN CONTENT SPLIT */}
            <div className="flex-1 min-h-[400px] grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
                {/* LEFT: CHART AREA */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <TrendingUp className="size-5 text-gray-400" />
                            Biểu đồ {tabConfig[activeTab]?.title.toLowerCase()} năm {currentYear}
                        </h3>

                        {/* CHART TYPE SWITCHER */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setChartType('line')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${chartType === 'line' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                            >
                                <LineChart className="w-4 h-4" /> Đường
                            </button>
                            <button
                                onClick={() => setChartType('bar')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${chartType === 'bar' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                            >
                                <BarChart3 className="w-4 h-4" /> Cột
                            </button>
                            <button
                                onClick={() => setChartType('area')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${chartType === 'area' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                            >
                                <AreaChartIcon className="w-4 h-4" /> Miền
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 w-full relative min-h-[300px]">
                        {renderChart()}
                    </div>
                </div>

                {/* RIGHT: DETAILS PANEL */}
                <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-white shrink-0">
                        <h3 className="text-lg font-bold text-gray-800">Báo cáo tóm tắt</h3>
                        <p className="text-sm text-gray-500">Phân tích chi tiết {tabConfig[activeTab]?.title}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        <div className="relative group/card transition-all duration-300 transform rounded-3xl overflow-hidden hover:shadow-lg hover:scale-[1.02] border border-gray-100">
                            <EnterpriseMetricCard
                                title={isAllYear ? `Cả năm ${currentYear}` : `Tháng ${currentMonth}/${currentYear}`}
                                icon={Calendar}
                                baseColor="#10B981"
                                mainMetrics={activeTab === 'waste'
                                    ? buildWasteMetrics(currentMonthTotals)
                                    : [{ value: formatCompactDashboard(currentMonthTotals[activeTab]), fullValue: formatFullNumber(currentMonthTotals[activeTab]), unit: tabConfig[activeTab]?.unit }]}
                            />
                        </div>

                        <div className="relative group/card transition-all duration-300 transform rounded-3xl overflow-hidden hover:shadow-lg hover:scale-[1.02] border border-gray-100">
                            <EnterpriseMetricCard
                                title={`Cả năm ${currentYear}`}
                                icon={Activity}
                                baseColor="#6366F1"
                                mainMetrics={activeTab === 'waste'
                                    ? buildWasteMetrics(ytdTotals)
                                    : [{ value: formatCompactDashboard(ytdTotals[activeTab]), fullValue: formatFullNumber(ytdTotals[activeTab]), unit: tabConfig[activeTab]?.unit }]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyOverviewStats;
