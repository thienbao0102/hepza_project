import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryRecordByPeriodkey } from "@/features/resources/hooks/useSummaryRecords";
import { formatSmallNumbers, calculateTrend, formatCompactDashboard, formatFullNumber } from "@/components/dashboard/DashboardLogical";
import dayjs from "dayjs";
import {
    Pickaxe, FlaskConical, Zap, Droplets, Flame,
    Box, Layers, Archive, TreePine, Recycle,
    Activity, Atom, Cloud, Fuel, Wheat, CircleDot,
    Hammer, Cylinder, Leaf, Wind, ArrowUpRight
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

const CompanyResourcesTab = ({ companyId, zoneId, role, selectedDate, isAllYear, selectedYear }) => {
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

    const { data: records = [], isLoading } = useSummaryRecordByPeriodkey({
        role, companyId, zoneId,
        periodKeyStart, periodKeyEnd,
        include: [2, 3, 4] // 2=Materials, 3=Chemicals, 4=Fuels(electricity+water+combustion)
    }, { enabled: !!companyId });

    // Aggregate all records (handles both single month and full year)
    const currentData = useMemo(() => {
        const recordsArr = Array.isArray(records) ? records : (records?.summaryRecord ?? []);
        if (recordsArr.length === 0) return {};
        if (recordsArr.length === 1) return recordsArr[0];

        // Start with first record structure to preserve unit strings
        const first = recordsArr[0];
        const agg = {
            input_materials: { ...(first.input_materials ?? {}) },
            input_chemicals: { ...(first.input_chemicals ?? {}) },
            fuels: { ...(first.fuels ?? {}) }
        };

        // Sum numeric fields from remaining records
        const addNumericFields = (target, source) => {
            for (const key of Object.keys(source)) {
                if (typeof source[key] === 'number') {
                    target[key] = (Number(target[key]) || 0) + source[key];
                }
            }
        };

        for (let i = 1; i < recordsArr.length; i++) {
            addNumericFields(agg.input_materials, recordsArr[i].input_materials ?? {});
            addNumericFields(agg.input_chemicals, recordsArr[i].input_chemicals ?? {});
            addNumericFields(agg.fuels, recordsArr[i].fuels ?? {});
        }
        return agg;
    }, [records]);

    // Data for Metric Cards
    const { cardData } = useMemo(() => {
        const getNum = (val) => Number(val) || 0;
        const curMat = currentData.input_materials ?? {};
        const curChem = currentData.input_chemicals ?? {};
        const curFuel = currentData.fuels ?? {};

        // Mocking trend to 0 since we only fetch current month here
        const cards = [
            {
                id: 'materials', title: "Nguyên Vật liệu", icon: Pickaxe, baseColor: "#4E5BA6", to: `/resources/materialResources`,
                mainMetrics: [{ label: "Tổng", value: formatCompactDashboard(getNum(curMat.total_materials)), fullValue: formatFullNumber(getNum(curMat.total_materials)), unit: curMat.unit_material ?? "Tấn", trend: 0 }]
            },
            {
                id: 'energy', title: "Điện năng tiêu thụ", icon: Zap, baseColor: "#FF9D00", to: `/resources/electricalResources`,
                mainMetrics: [
                    { label: "Tổng công suất", value: formatCompactDashboard(getNum(curFuel.total_electricity)), fullValue: formatFullNumber(getNum(curFuel.total_electricity)), unit: curFuel.unit_fuel_el ?? "kWh", trend: 0 },
                    { label: "Điện lưới", value: formatCompactDashboard(getNum(curFuel.total_electricity_grid)), fullValue: formatFullNumber(getNum(curFuel.total_electricity_grid)), unit: curFuel.unit_fuel_el ?? "kWh", trend: 0 },
                    { label: "Tái tạo", value: formatCompactDashboard(getNum(curFuel.total_electricity_renewable)), fullValue: formatFullNumber(getNum(curFuel.total_electricity_renewable)), unit: curFuel.unit_fuel_el ?? "kWh", trend: 0 }
                ]
            },
            {
                id: 'water', title: "Nước sử dụng", icon: Droplets, baseColor: "#00A6FF", to: `/resources/waterResources`,
                mainMetrics: [{ label: "Tổng", value: formatCompactDashboard(getNum(curFuel.total_water)), fullValue: formatFullNumber(getNum(curFuel.total_water)), unit: curFuel.unit_fuel_wa ?? "m³", trend: 0 }]
            },
            {
                id: 'chemicals', title: "Hóa chất sử dụng", icon: FlaskConical, baseColor: "#9CB000", to: `/resources/chemicalResources`,
                mainMetrics: [
                    { label: "Tổng Tấn", value: formatCompactDashboard(getNum(curChem.total_chemicals_kg)), fullValue: formatFullNumber(getNum(curChem.total_chemicals_kg)), unit: "Tấn", trend: 0 },
                    { label: "Tổng m³", value: formatCompactDashboard(getNum(curChem.total_chemicals_m3)), fullValue: formatFullNumber(getNum(curChem.total_chemicals_m3)), unit: "m³", trend: 0 }
                ]
            },
            {
                id: 'combustion', title: "Chất đốt", icon: Flame, baseColor: "#FF4000", to: `/resources/combustionResources`,
                mainMetrics: [{ label: "Tổng", value: formatCompactDashboard(getNum(curFuel.total_combustion)), fullValue: formatFullNumber(getNum(curFuel.total_combustion)), unit: curFuel.unit_fuel_co ?? "Tấn", trend: 0 }]
            }
        ];
        return { cardData: cards };
    }, [currentData]);

    const [activeTab, setActiveTab] = useState('materials');

    const pieChartData = useMemo(() => {
        const getNum = (val) => Number(val) || 0;
        const mat = currentData?.input_materials ?? {};
        const chem = currentData?.input_chemicals ?? {};
        const fuel = currentData?.fuels ?? {};

        switch (activeTab) {
            case 'materials':
                return {
                    data: [
                        { Name: "Gỗ", Value: getNum(mat.total_materials_WOOD), Color: "#f59e0b" },
                        { Name: "Kim loại", Value: getNum(mat.total_materials_MET), Color: "#64748b" },
                        { Name: "Phi kim", Value: getNum(mat.total_materials_NMET), Color: "#a855f7" },
                        { Name: "Nhựa", Value: getNum(mat.total_materials_POL), Color: "#ec4899" },
                        { Name: "Giấy & Carton", Value: getNum(mat.total_materials_PAC), Color: "#f97316" },
                        { Name: "Vải & Sợi", Value: getNum(mat.total_materials_TEX), Color: "#f43f5e" },
                        { Name: "Thực phẩm", Value: getNum(mat.total_materials_AGRI), Color: "#10b981" },
                    ].filter(d => d.Value > 0),
                    total: getNum(mat.total_materials),
                    unit: "Tấn"
                };
            case 'chemicals': {
                const chemCats = [
                    { key: 'HAZD', label: 'Hóa chất nguy hiểm', color: '#ef4444' }, // red-500
                    { key: 'ACD', label: 'Axit', color: '#f43f5e' }, // rose-500
                    { key: 'BAS', label: 'Bazơ/Kiềm', color: '#6366f1' }, // indigo-500
                    { key: 'SLT', label: 'Muối', color: '#14b8a6' }, // teal-500
                    { key: 'SOL', label: 'Dung môi', color: '#a855f7' }, // purple-500
                    { key: 'GAS', label: 'Khí & bay hơi', color: '#0ea5e9' }, // sky-500
                    { key: 'ADD', label: 'Phụ gia', color: '#f97316' }, // orange-500
                    { key: 'REDOX', label: 'Chất khử', color: '#f59e0b' }, // amber-500
                    { key: 'CHOT', label: 'Hóa chất khác', color: '#6b7280' }, // gray-500
                ];
                
                const cData = [];
                let cTotal = 0;
                chemCats.forEach(cat => {
                    const kg = getNum(chem[`total_chemicals_${cat.key}_kg`]);
                    const m3 = getNum(chem[`total_chemicals_${cat.key}_m3`]);
                    if (kg > 0) { cData.push({ Name: `${cat.label} (Tấn)`, Value: kg, Color: cat.color }); cTotal += kg; }
                    if (m3 > 0) { cData.push({ Name: `${cat.label} (m³)`, Value: m3, Color: cat.color }); cTotal += m3; }
                });

                return {
                    data: cData,
                    total: cTotal,
                    unit: "Tổng"
                };
            }
            case 'energy':
                return {
                    data: [
                        { Name: "Điện lưới", Value: getNum(fuel.total_electricity_grid), Color: "#f59e0b" },
                        { Name: "Điện tái tạo", Value: getNum(fuel.total_electricity_renewable), Color: "#22c55e" },
                    ].filter(d => d.Value > 0),
                    total: getNum(fuel.total_electricity),
                    unit: "kWh"
                };
            case 'water':
                return {
                    data: [
                        { Name: "Nước cấp", Value: getNum(fuel.total_water_tap), Color: "#0ea5e9" },
                        { Name: "Nước tái tạo", Value: getNum(fuel.total_water_recycle), Color: "#14b8a6" },
                        { Name: "Nước mưa", Value: getNum(fuel.total_water_rain), Color: "#6366f1" },
                        { Name: "Nước giếng", Value: getNum(fuel.total_water_well), Color: "#3b82f6" },
                    ].filter(d => d.Value > 0),
                    total: getNum(fuel.total_water),
                    unit: "m³"
                };
            case 'combustion': {
                const combCats = [
                    { key: 'COL', label: 'Than', color: '#78716c' },
                    { key: 'BIO', label: 'Biomass', color: '#84cc16' },
                    { key: 'PET', label: 'Nhiên liệu dầu mỏ', color: '#f97316' },
                    { key: 'GASF', label: 'Chất đốt dạng khí', color: '#3b82f6' },
                    { key: 'COTH', label: 'Chất đốt khác', color: '#64748b' },
                ];
                return {
                    data: combCats.map(cat => ({
                        Name: cat.label,
                        Value: getNum(fuel[`total_combustion_${cat.key}`]),
                        Color: cat.color
                    })).filter(d => d.Value > 0),
                    total: getNum(fuel.total_combustion),
                    unit: fuel.unit_fuel_co || "Tấn"
                };
            }
            default: return { data: [], total: 0, unit: "" };
        }
    }, [activeTab, currentData]);

    const renderSideDetails = () => {
        const getNum = (val) => Number(val) || 0;
        const mat = currentData.input_materials ?? {};
        const chem = currentData.input_chemicals ?? {};
        const fuel = currentData.fuels ?? {};

        console.log("DEBUG_FUELS ==>", fuel);

        switch (activeTab) {
            case 'materials':
                return (
                    <>
                        <DetailItem label="Gỗ" value={formatCompactDashboard(getNum(mat.total_materials_WOOD))} fullValue={formatFullNumber(getNum(mat.total_materials_WOOD))} unit="Tấn" icon={TreePine} color="amber" />
                        <DetailItem label="Kim loại" value={formatCompactDashboard(getNum(mat.total_materials_MET))} fullValue={formatFullNumber(getNum(mat.total_materials_MET))} unit="Tấn" icon={Hammer} color="slate" />
                        <DetailItem label="Phi kim" value={formatCompactDashboard(getNum(mat.total_materials_NMET))} fullValue={formatFullNumber(getNum(mat.total_materials_NMET))} unit="Tấn" icon={CircleDot} color="purple" />
                        <DetailItem label="Nhựa" value={formatCompactDashboard(getNum(mat.total_materials_POL))} fullValue={formatFullNumber(getNum(mat.total_materials_POL))} unit="Tấn" icon={Cylinder} color="pink" />
                        <DetailItem label="Giấy & Carton" value={formatCompactDashboard(getNum(mat.total_materials_PAC))} fullValue={formatFullNumber(getNum(mat.total_materials_PAC))} unit="Tấn" icon={Archive} color="orange" />
                        <DetailItem label="Vải & Sợi" value={formatCompactDashboard(getNum(mat.total_materials_TEX))} fullValue={formatFullNumber(getNum(mat.total_materials_TEX))} unit="Tấn" icon={Layers} color="rose" />
                        <DetailItem label="Thực phẩm" value={formatCompactDashboard(getNum(mat.total_materials_AGRI))} fullValue={formatFullNumber(getNum(mat.total_materials_AGRI))} unit="Tấn" icon={Wheat} color="emerald" />
                    </>
                );
            case 'chemicals':
                const chemCategories = [
                    { key: 'HAZD', label: 'Hóa chất nguy hiểm', icon: FlaskConical, color: 'red' },
                    { key: 'ACD', label: 'Axit', icon: FlaskConical, color: 'rose' },
                    { key: 'BAS', label: 'Bazơ/Kiềm', icon: FlaskConical, color: 'indigo' },
                    { key: 'SLT', label: 'Muối', icon: FlaskConical, color: 'teal' },
                    { key: 'SOL', label: 'Dung môi', icon: FlaskConical, color: 'purple' },
                    { key: 'GAS', label: 'Khí & bay hơi', icon: Wind, color: 'sky' },
                    { key: 'ADD', label: 'Phụ gia', icon: FlaskConical, color: 'orange' },
                    { key: 'REDOX', label: 'Chất khử', icon: FlaskConical, color: 'amber' },
                    { key: 'CHOT', label: 'Hóa chất khác', icon: FlaskConical, color: 'gray' },
                ];

                return (
                    <div className="flex flex-col gap-2">
                        {chemCategories.map(cat => {
                            const kg = getNum(chem[`total_chemicals_${cat.key}_kg`]);
                            const m3 = getNum(chem[`total_chemicals_${cat.key}_m3`]);
                            
                            if (kg === 0 && m3 === 0) {
                                return <DetailItem key={cat.key} label={cat.label} value="0" fullValue="0" unit="Tấn" icon={cat.icon} color={cat.color} />;
                            }

                            return (
                                <React.Fragment key={cat.key}>
                                    {kg > 0 && <DetailItem label={cat.label} value={formatCompactDashboard(kg)} fullValue={formatFullNumber(kg)} unit="Tấn" icon={cat.icon} color={cat.color} />}
                                    {m3 > 0 && <DetailItem label={cat.label} value={formatCompactDashboard(m3)} fullValue={formatFullNumber(m3)} unit="m³" icon={cat.icon} color={cat.color} />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                );
            case 'energy':
                return (
                    <>
                        <DetailItem label="Tổng cộng" value={formatCompactDashboard(getNum(fuel.total_electricity))} fullValue={formatFullNumber(getNum(fuel.total_electricity))} unit="kWh" icon={Zap} color="blue" />
                        <DetailItem label="Điện lưới" value={formatCompactDashboard(getNum(fuel.total_electricity_grid))} fullValue={formatFullNumber(getNum(fuel.total_electricity_grid))} unit="kWh" icon={Zap} color="amber" />
                        <DetailItem label="Tái tạo" value={formatCompactDashboard(getNum(fuel.total_electricity_renewable))} fullValue={formatFullNumber(getNum(fuel.total_electricity_renewable))} unit="kWh" icon={Leaf} color="green" />
                    </>
                );
            case 'water':
                return (
                    <>
                        <DetailItem label="Nước cấp" value={formatCompactDashboard(getNum(fuel.total_water_tap))} fullValue={formatFullNumber(getNum(fuel.total_water_tap))} unit="m³" icon={Droplets} color="sky" />
                        <DetailItem label="Nước tái tạo" value={formatCompactDashboard(getNum(fuel.total_water_recycle))} fullValue={formatFullNumber(getNum(fuel.total_water_recycle))} unit="m³" icon={Recycle} color="teal" />
                        <DetailItem label="Nước mưa" value={formatCompactDashboard(getNum(fuel.total_water_rain))} fullValue={formatFullNumber(getNum(fuel.total_water_rain))} unit="m³" icon={Cloud} color="indigo" />
                    </>
                );
            case 'combustion': {
                const combCategories = [
                    { key: 'COL', label: 'Than', icon: Box, color: 'gray' },
                    { key: 'BIO', label: 'Biomass', icon: Leaf, color: 'green' },
                    { key: 'PET', label: 'Nhiên liệu dầu mỏ', icon: Fuel, color: 'orange' },
                    { key: 'GASF', label: 'Chất đốt dạng khí', icon: Flame, color: 'blue' },
                    { key: 'COTH', label: 'Chất đốt khác', icon: Flame, color: 'slate' },
                ];
                return (
                    <div className="flex flex-col gap-2">
                        {combCategories.map(cat => {
                            const val = getNum(fuel[`total_combustion_${cat.key}`]);
                            return (
                                <DetailItem 
                                    key={cat.key} 
                                    label={cat.label} 
                                    value={formatCompactDashboard(val)} 
                                    fullValue={formatFullNumber(val)} 
                                    unit={fuel.unit_fuel_co || "Tấn"} 
                                    icon={cat.icon} 
                                    color={cat.color} 
                                />
                            );
                        })}
                    </div>
                );
            }
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100">
                <Activity className="size-8 text-[#4E5BA6] animate-pulse mb-3" />
                <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu tài nguyên...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* 1. TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 shrink-0 p-1.5">
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

export default CompanyResourcesTab;
