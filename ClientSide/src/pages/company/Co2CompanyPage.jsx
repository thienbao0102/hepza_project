import React, { useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useSummaryRecordByPeriodkey } from "@/features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";
import { useCompany } from "@/features/company/hooks/useCompanyQueries";
import { useHeader } from "@/components/common/Header/HeaderContext";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
    Sprout, Activity, Zap, Flame, Droplet, ArrowUpRight, TrendingUp, Info,
    Package, FlaskConical, Trash2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DonutChart from "@/components/ui/DonutChart";
import { formatSmallNumbers } from "@/components/dashboard/DashboardLogical";
import clsx from 'clsx';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";

dayjs.extend(customParseFormat);

// --- COMPONENTS ---

// Ultra Compact Detail Item
const DetailItem = ({ label, value, unit, icon: Icon, color, subText }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-emerald-100 hover:shadow-sm transition-all duration-200 group cursor-default shrink-0">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="size-5" strokeWidth={2} />
            </div>
            <div>
                <span className="text-gray-700 font-bold text-sm block mb-0.5">{label}</span>
                {subText && <span className="text-xs text-gray-400 block font-medium tracking-tight">{subText}</span>}
            </div>
        </div>
        <div className="text-right">
            <span className="block text-gray-900 font-extrabold text-xl font-mono tracking-tight">{value}</span>
            {unit && <span className="text-xs text-gray-500 font-semibold">{unit}</span>}
        </div>
    </div>
);

// Combustion fuel detail sub-item
const FuelDetailItem = ({ label, co2Value, usageValue, usageUnit }) => {
    if (co2Value <= 0 && usageValue <= 0) return null;
    return (
        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-amber-50/50 transition-colors">
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <div className="text-right">
                <span className="text-xs font-bold text-gray-700 font-mono">{formatSmallNumbers(co2Value)}</span>
                <span className="text-[10px] text-gray-400 ml-1">Tấn CO₂</span>
                {usageValue > 0 && (
                    <span className="text-[10px] text-gray-400 block">({formatSmallNumbers(usageValue)} {usageUnit})</span>
                )}
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const Co2CompanyPage = () => {
    const navigate = useNavigate();
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    const companyId = user?.user?.company_id;
    const { setHeaderConfig, date } = useHeader();
    const userZoneId = user?.user?.zone_id;
    const { data: zoneData } = useZone(userZoneId, { enabled: !!userZoneId });

    // Date Logic
    const isAllYear = date?.startsWith("00/");
    const yearFromDate = isAllYear ? Number(date.split("/")[1]) : null;
    const selectedDate = isAllYear ? null : dayjs(date, "MM/YYYY", true);
    const selectedYear = isAllYear ? yearFromDate : (selectedDate?.isValid() ? selectedDate.year() : dayjs().year());
    const selectedPeriodKey = selectedDate?.isValid() ? Number(selectedDate.format("YYYYMM")) : Number(dayjs().format("YYYYMM"));

    const getDateDisplayText = () => {
        if (isAllYear) return `Năm ${selectedYear}`;
        if (selectedDate?.isValid()) return `Tháng ${selectedDate.format("MM/YYYY")}`;
        return `Tháng ${dayjs().format("MM/YYYY")}`;
    };

    useEffect(() => {
        setHeaderConfig({
            title: isAdmin ? "Quản lý Phát thải CO₂ tất cả khu công nghiệp" : (isManager ? "Quản lý Phát thải CO₂ của khu công nghiệp" : "Quản lý Phát thải CO₂"),
            description: isAdmin ? `Tổng quan tác động môi trường toàn thành phố - ${getDateDisplayText()}` : (isManager ? `Tổng quan tác động môi trường khu công nghiệp - ${getDateDisplayText()}` : `Tổng quan tác động môi trường - ${getDateDisplayText()}`),
            showWeather: true,
            showDatePicker: true,
        });
    }, [date, userRole, isAdmin, isManager]);

    const { data: company = [] } = useCompany(companyId, { enabled: !!companyId });
    // Dành cho Manager: Ưu tiên zone_id từ user profile
    const zoneId = isManager ? userZoneId : (companyId ? company?.company?.zone_id : userZoneId);
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: zoneData?.zone?.zone_name || user?.user?.zone_name,
        zoneId,
    });

    // Params for API
    let periodKeyStart, periodKeyEnd;
    if (isAllYear) {
        periodKeyStart = selectedYear * 100 + 1;
        periodKeyEnd = selectedYear * 100 + 12;
    } else if (selectedDate?.isValid()) {
        periodKeyStart = selectedPeriodKey;
        periodKeyEnd = selectedPeriodKey;
    } else {
        periodKeyStart = Number(dayjs().format("YYYYMM"));
        periodKeyEnd = periodKeyStart;
    }

    const summaryParams = {
        role: userRole,
        periodKeyStart,
        periodKeyEnd,
        include: [1, 2, 3, 4, 5, 6],
        ...(!isManager && !isAdmin && companyId && { companyId }), // Chỉ gửi companyId nếu là role Company
        ...(zoneId && { zoneId })
    };

    const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
    const { data: summaryRecords = [] } = useSummaryRecordByPeriodkey(summaryParams, { enabled: !!hasRequiredParams });

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Phát thải CO2", managerZoneLabel),
            description: `Tổng quan phát thải CO2 của ${managerZoneLabel} - ${getDateDisplayText()}`,
            showWeather: true,
            showDatePicker: true,
        });
    }, [date, isManager, managerZoneLabel, setHeaderConfig]);

    // --- DATA PROCESSING ---
    const { totalData, chartData } = useMemo(() => {
        const recordsArr = Array.isArray(summaryRecords) ? summaryRecords : (summaryRecords?.summaryRecord ?? []);

        // Chart Data Map (1..12)
        const byMonth = {};
        for (let i = 1; i <= 12; i++) byMonth[i] = { month: i, electricity: 0, combustion: 0, water: 0, total: 0 };

        const aggregated = {
            // === EMISSION — chỉ dùng field backend thực sự cung cấp ===
            total_co2: 0,
            // Điện lưới (Grid only — Renewable không phát thải)
            total_co2_from_grid_electricity: 0,
            // Nước
            total_co2_from_water: 0,
            // 7 loại nhiên liệu đốt
            total_co2_from_DO_oil: 0,
            total_co2_from_gasoline: 0,
            total_co2_from_FO_oil: 0,
            total_co2_from_biomass: 0,
            total_co2_from_charcoal: 0,
            total_co2_from_natural_gas: 0,
            total_co2_from_LPG: 0,
            // Tổng combustion (tính ở FE từ 7 loại trên)
            total_co2_from_combustion: 0,

            unit_co2: "Tấn CO₂tđ",

            // === RESOURCE USAGE (dữ liệu đầu vào — vẫn giữ đủ 6 nhóm) ===
            // Điện (kWh)
            usage_electricity: 0,
            usage_electricity_grid: 0,
            usage_electricity_renewable: 0,
            // Nước (m³)
            usage_water: 0,
            usage_water_tap: 0,
            usage_water_rain: 0,
            usage_water_well: 0,
            usage_water_recycle: 0,
            // Chất đốt (Tấn)
            usage_combustion: 0,
            usage_combustion_COL: 0,
            usage_combustion_BIO: 0,
            usage_combustion_PET: 0,
            usage_combustion_GASF: 0,
            usage_combustion_COTH: 0,
            // Nguyên liệu (Tấn)
            usage_materials: 0,
            // Hóa chất (Kg + L + m³)
            usage_chemicals_kg: 0,
            usage_chemicals_l: 0,
            usage_chemicals_m3: 0,
            // Chất thải (Tấn + m³)
            usage_waste_tan: 0,
            usage_waste_m3: 0,
            usage_waste_DO: 0,
            usage_waste_IND: 0,
            usage_waste_HA: 0,
            usage_waste_WWA: 0,
            usage_waste_GASW: 0,
        };

        recordsArr.forEach(record => {
            const m = Number(String(record.periodKey).slice(4));
            const e = record.emissions ?? {};
            const f = record.fuels ?? {};
            const mat = record.input_materials ?? {};
            const chem = record.input_chemicals ?? {};
            const w = record.waste ?? {};

            // === EMISSIONS (đúng field backend) ===
            const gridElec = e.total_co2_from_grid_electricity || 0;
            const waterCO2 = e.total_co2_from_water || 0;
            const doOil = e.total_co2_from_DO_oil || 0;
            const gasoline = e.total_co2_from_gasoline || 0;
            const foOil = e.total_co2_from_FO_oil || 0;
            const biomass = e.total_co2_from_biomass || 0;
            const charcoal = e.total_co2_from_charcoal || 0;
            const naturalGas = e.total_co2_from_natural_gas || 0;
            const lpg = e.total_co2_from_LPG || 0;
            const combustionTotal = doOil + gasoline + foOil + biomass + charcoal + naturalGas + lpg;

            aggregated.total_co2_from_grid_electricity += gridElec;
            aggregated.total_co2_from_water += waterCO2;
            aggregated.total_co2_from_DO_oil += doOil;
            aggregated.total_co2_from_gasoline += gasoline;
            aggregated.total_co2_from_FO_oil += foOil;
            aggregated.total_co2_from_biomass += biomass;
            aggregated.total_co2_from_charcoal += charcoal;
            aggregated.total_co2_from_natural_gas += naturalGas;
            aggregated.total_co2_from_LPG += lpg;
            aggregated.total_co2_from_combustion += combustionTotal;
            aggregated.total_co2 += (e.total_co2 || 0);

            // Update chart data
            if (byMonth[m]) {
                byMonth[m].electricity += gridElec;
                byMonth[m].combustion += combustionTotal;
                byMonth[m].water += waterCO2;
                byMonth[m].total += gridElec + combustionTotal + waterCO2;
            }

            // === RESOURCE USAGE (dữ liệu đầu vào) ===
            // Điện
            aggregated.usage_electricity += (f.total_electricity || 0);
            aggregated.usage_electricity_grid += (f.total_electricity_grid || 0);
            aggregated.usage_electricity_renewable += (f.total_electricity_renewable || 0);
            // Nước
            aggregated.usage_water += (f.total_water || 0);
            aggregated.usage_water_tap += (f.total_water_tap || 0);
            aggregated.usage_water_rain += (f.total_water_rain || 0);
            aggregated.usage_water_well += (f.total_water_well || 0);
            aggregated.usage_water_recycle += (f.total_water_recycle || 0);
            // Chất đốt
            aggregated.usage_combustion += (f.total_combustion || 0);
            aggregated.usage_combustion_COL += (f.total_combustion_COL || 0);
            aggregated.usage_combustion_BIO += (f.total_combustion_BIO || 0);
            aggregated.usage_combustion_PET += (f.total_combustion_PET || 0);
            aggregated.usage_combustion_GASF += (f.total_combustion_GASF || 0);
            aggregated.usage_combustion_COTH += (f.total_combustion_COTH || 0);
            // Nguyên liệu
            aggregated.usage_materials += (mat.total_materials || 0);
            // Hóa chất
            aggregated.usage_chemicals_kg += (chem.total_chemicals_kg || 0);
            aggregated.usage_chemicals_l += (chem.total_chemicals_l || 0);
            aggregated.usage_chemicals_m3 += (chem.total_chemicals_m3 || 0);
            // Chất thải
            aggregated.usage_waste_tan += (w.total_waste_tan || 0);
            aggregated.usage_waste_m3 += (w.total_waste_m3 || 0);
            aggregated.usage_waste_DO += (w.total_waste_DO || 0);
            aggregated.usage_waste_IND += (w.total_waste_IND || 0);
            aggregated.usage_waste_HA += (w.total_waste_HA || 0);
            aggregated.usage_waste_WWA += (w.total_waste_WWA || 0);
            aggregated.usage_waste_GASW += (w.total_waste_GASW || 0);

            if (e.unit_co2) aggregated.unit_co2 = e.unit_co2;
        });

        const chartDataArr = Object.values(byMonth);

        return { totalData: aggregated, chartData: chartDataArr };
    }, [summaryRecords]);

    // Metric Data
    const mainMetric = {
        title: "TỔNG PHÁT THẢI CO₂",
        value: formatSmallNumbers(totalData.total_co2),
        unit: totalData.unit_co2,
        trend: 0,
    };

    // Composition Data for Donut — chỉ 3 nguồn backend tính CO2
    const compositionData = [
        { Name: "Điện lưới", Value: totalData.total_co2_from_grid_electricity, Color: "#10b981", unit: "Tấn" },
        { Name: "Nhiên liệu đốt", Value: totalData.total_co2_from_combustion, Color: "#f59e0b", unit: "Tấn" },
        { Name: "Nước", Value: totalData.total_co2_from_water, Color: "#3b82f6", unit: "Tấn" },
    ].filter(i => i.Value > 0);


    return (
        <div className="flex flex-col h-full gap-2 overflow-hidden bg-gray-50/50">

            {/* TOP ROW: KPI & MAIN CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 gap-2 lg:gap-3 flex-1 min-h-0">

                {/* 1. LEFT: Main Stats & Breakdown (4 Cols) */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-2 h-full min-h-0">
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                        {/* Hero Card */}
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden shrink-0 group min-h-[180px] lg:min-h-[220px]">
                            <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                        <Sprout className="size-6 text-emerald-50" />
                                    </div>
                                    <span className={clsx("px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 uppercase tracking-wide",
                                        mainMetric.trend > 0 ? "bg-rose-500/20 text-rose-100" : "bg-emerald-400/20 text-emerald-100"
                                    )}>
                                        {getDateDisplayText()}
                                    </span>
                                </div>

                                <div>
                                    <h2 className="text-emerald-50 font-bold text-sm opacity-90 mb-1 tracking-wide uppercase">{mainMetric.title}</h2>
                                    <div className="flex items-baseline gap-2 min-w-0">
                                        <span className="font-extrabold tracking-tight text-white drop-shadow-sm leading-none truncate"
                                            style={{ fontSize: mainMetric.value.length > 10 ? 'clamp(1.25rem, 3.5vw, 2rem)' : 'clamp(1.75rem, 4.5vw, 3rem)' }}
                                        >
                                            {mainMetric.value}
                                        </span>
                                        <span className="text-emerald-200 font-bold text-base lg:text-lg shrink-0">{mainMetric.unit}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                                    <div>
                                        <p className="text-[10px] font-medium text-emerald-200 mb-0.5 uppercase">Điện lưới</p>
                                        <p className="text-sm font-bold text-white">{formatSmallNumbers(totalData.total_co2_from_grid_electricity)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-emerald-200 mb-0.5 uppercase">Nhiên liệu</p>
                                        <p className="text-sm font-bold text-white">{formatSmallNumbers(totalData.total_co2_from_combustion)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-emerald-200 mb-0.5 uppercase">Nước</p>
                                        <p className="text-sm font-bold text-white">{formatSmallNumbers(totalData.total_co2_from_water)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown: 3 nhóm phát thải CO₂ từ backend */}
                        <div className="grid gap-2 shrink-0">
                            <DetailItem
                                label="Từ Điện lưới"
                                subText={`Sử dụng: ${formatSmallNumbers(totalData.usage_electricity_grid)} kWh (Lưới) • ${formatSmallNumbers(totalData.usage_electricity_renewable)} kWh (Tái tạo) → EF: 0.6592 kg CO₂/kWh`}
                                value={formatSmallNumbers(totalData.total_co2_from_grid_electricity)}
                                unit="Tấn CO₂"
                                icon={Zap}
                                color="emerald"
                            />
                            <DetailItem
                                label="Từ Nước"
                                subText={`Sử dụng: ${formatSmallNumbers(totalData.usage_water)} m³ (Máy: ${formatSmallNumbers(totalData.usage_water_tap)} • Mưa: ${formatSmallNumbers(totalData.usage_water_rain)} • Giếng: ${formatSmallNumbers(totalData.usage_water_well)} • TC: ${formatSmallNumbers(totalData.usage_water_recycle)}) → EF: 0.177 kg CO₂/m³`}
                                value={formatSmallNumbers(totalData.total_co2_from_water)}
                                unit="Tấn CO₂"
                                icon={Droplet}
                                color="blue"
                            />
                            <DetailItem
                                label="Từ Đốt nhiên liệu"
                                subText={`Sử dụng: ${formatSmallNumbers(totalData.usage_combustion)} tấn → IPCC Emission Factors`}
                                value={formatSmallNumbers(totalData.total_co2_from_combustion)}
                                unit="Tấn CO₂"
                                icon={Flame}
                                color="amber"
                            />

                            {/* Chi tiết 7 loại nhiên liệu đốt */}
                            {totalData.total_co2_from_combustion > 0 && (
                                <div className="bg-white border border-amber-100 rounded-xl p-3 space-y-0.5">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Chi tiết nhiên liệu đốt</p>
                                    <FuelDetailItem label="Dầu DO" co2Value={totalData.total_co2_from_DO_oil} usageValue={totalData.usage_combustion_PET} usageUnit="tấn" />
                                    <FuelDetailItem label="Xăng" co2Value={totalData.total_co2_from_gasoline} usageValue={0} usageUnit="tấn" />
                                    <FuelDetailItem label="Dầu FO" co2Value={totalData.total_co2_from_FO_oil} usageValue={0} usageUnit="tấn" />
                                    <FuelDetailItem label="Sinh khối" co2Value={totalData.total_co2_from_biomass} usageValue={totalData.usage_combustion_BIO} usageUnit="tấn" />
                                    <FuelDetailItem label="Than đá" co2Value={totalData.total_co2_from_charcoal} usageValue={totalData.usage_combustion_COL} usageUnit="tấn" />
                                    <FuelDetailItem label="Khí tự nhiên" co2Value={totalData.total_co2_from_natural_gas} usageValue={totalData.usage_combustion_GASF} usageUnit="tấn" />
                                    <FuelDetailItem label="LPG" co2Value={totalData.total_co2_from_LPG} usageValue={0} usageUnit="tấn" />
                                </div>
                            )}
                        </div>

                        {/* Resource Usage (không có CO2) */}
                        <div className="bg-white border border-gray-100 rounded-xl p-3 shrink-0">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tài nguyên sử dụng (không phát thải trực tiếp)</p>
                            <div className="grid gap-1.5">
                                {totalData.usage_materials > 0 && (
                                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-violet-50/50">
                                        <div className="flex items-center gap-2">
                                            <Package className="size-3.5 text-violet-500" />
                                            <span className="text-xs text-gray-600 font-medium">Nguyên liệu</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 font-mono">{formatSmallNumbers(totalData.usage_materials)} <span className="text-gray-400 font-normal">Tấn</span></span>
                                    </div>
                                )}
                                {(totalData.usage_chemicals_kg > 0 || totalData.usage_chemicals_l > 0 || totalData.usage_chemicals_m3 > 0) && (
                                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-pink-50/50">
                                        <div className="flex items-center gap-2">
                                            <FlaskConical className="size-3.5 text-pink-500" />
                                            <span className="text-xs text-gray-600 font-medium">Hóa chất</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 font-mono">
                                            {totalData.usage_chemicals_kg > 0 && `${formatSmallNumbers(totalData.usage_chemicals_kg)} kg`}
                                            {totalData.usage_chemicals_l > 0 && ` • ${formatSmallNumbers(totalData.usage_chemicals_l)} L`}
                                            {totalData.usage_chemicals_m3 > 0 && ` • ${formatSmallNumbers(totalData.usage_chemicals_m3)} m³`}
                                        </span>
                                    </div>
                                )}
                                {(totalData.usage_waste_tan > 0 || totalData.usage_waste_m3 > 0) && (
                                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50/50">
                                        <div className="flex items-center gap-2">
                                            <Trash2 className="size-3.5 text-slate-500" />
                                            <span className="text-xs text-gray-600 font-medium">Chất thải</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 font-mono">
                                            {totalData.usage_waste_tan > 0 && `${formatSmallNumbers(totalData.usage_waste_tan)} Tấn`}
                                            {totalData.usage_waste_m3 > 0 && ` • ${formatSmallNumbers(totalData.usage_waste_m3)} m³`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CENTER: Stacked Area Chart (Trends) */}
                <div className="lg:col-span-5 xl:col-span-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full min-h-0">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <div>
                            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 mb-0.5">
                                <Activity className="size-4 text-gray-400" />
                                Xu hướng phát thải
                            </h3>
                            <p className="text-xs text-gray-400 font-medium tracking-tight">Phân tích theo nguồn phát sinh qua các tháng</p>
                        </div>
                        <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <Info className="size-4" />
                        </button>
                    </div>

                    <div className="flex-1 w-full relative -ml-2 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorComb" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    tickFormatter={(v) => `T${v}`}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '8px' }}
                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, padding: '1px 0' }}
                                    labelStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '5px', fontSize: '11px', fontWeight: 500 }} />
                                <Area
                                    type="monotone"
                                    dataKey="electricity"
                                    name="Điện lưới"
                                    stackId="1"
                                    stroke="#10b981"
                                    fill="url(#colorElec)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="combustion"
                                    name="Nhiên liệu đốt"
                                    stackId="1"
                                    stroke="#f59e0b"
                                    fill="url(#colorComb)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="water"
                                    name="Nước"
                                    stackId="1"
                                    stroke="#3b82f6"
                                    fill="url(#colorWater)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. RIGHT: Composition & Insights (3 Cols) */}
                <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-2 h-full min-h-0">
                    {/* Composition Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-1 min-h-0 flex flex-col">
                        <h3 className="font-bold text-gray-800 text-base mb-2 shrink-0">Cơ cấu phát thải</h3>
                        <div className="flex-1 relative w-full h-full min-h-0">
                            <DonutChart
                                data={compositionData}
                                totalValue={totalData.total_co2}
                                unit="Tấn"
                                showLegend={true}
                            />
                        </div>
                    </div>

                    {/* Quick Insights — % từng nguồn */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white shadow-lg flex flex-col justify-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[10px] tracking-wider">
                            <TrendingUp className="size-3.5" />
                            Tỷ lệ phát thải theo nguồn
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: "Điện lưới", value: totalData.total_co2_from_grid_electricity, color: "bg-emerald-400" },
                                { label: "Nhiên liệu đốt", value: totalData.total_co2_from_combustion, color: "bg-amber-400" },
                                { label: "Nước", value: totalData.total_co2_from_water, color: "bg-blue-400" },
                            ].filter(i => i.value > 0).map((item, idx) => {
                                const pct = totalData.total_co2 > 0 ? (item.value / totalData.total_co2) * 100 : 0;
                                const pctLabel = pct > 0 && pct < 0.1 ? '< 0.1' : pct.toFixed(1);
                                return (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></div>
                                        <span className="text-gray-400 text-[11px] font-medium flex-1">{item.label}</span>
                                        <span className="text-white font-bold text-xs font-mono">{pctLabel}%</span>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => {
                                if (isAdmin) navigate('/admin/resources');
                                else if (isManager) navigate('/manager/resources');
                                else navigate('/resources');
                            }}
                            className="bg-white/10 hover:bg-white/20 transition-colors text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mt-1"
                        >
                            Tối ưu tài nguyên <ArrowUpRight className="size-3.5" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Co2CompanyPage;
