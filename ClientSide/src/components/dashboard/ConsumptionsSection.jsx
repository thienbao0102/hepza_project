// src/components/dashboard/ConsumptionSection.jsx
import React, { useState } from 'react';
import { CardContainer, EnterpriseMetricCard } from './DashboardComponents';
import AutoLineChart from '../ui/AutoLineChart';
import AutoBarChart from '../ui/AutoBarChart';
import AutoAreaChart from '../ui/AutoAreaChart';
import { Pickaxe, FlaskConical, Zap, Droplets, Flame, ArrowUpRight, BarChart3, Activity, LineChart } from 'lucide-react';
import { calculateTrend, formatCompactDashboard, formatFullNumber } from './DashboardLogical';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
// Fixed Enterprise DataCard with explicit color props for Tailwind compatibility

const ConsumptionSection = ({ data, options }) => {
    const {
        inputMaterials, inputChemicals, fuels,
        formatSmallNumbers, selectedMonth, previousMonthInputChemicals, previousMonthInputMaterials, previousMonthFuels, previousMonthWaste, previousMonthEmissions, userRole
    } = data;

    const [consumptionChartState, setConsumptionChartState] = useState('materials');
    const [activeTab, setActiveTab] = useState('cards');
    const [chartType, setChartType] = useState('line'); // line | bar | area
    const currentConsumptionOption = options.find(opt => opt.value === consumptionChartState);
    const currentMonthNumber = Number(selectedMonth.split("/")[0]);

    const basePath = userRole === 'admin' ? '/admin' : (userRole === 'manager' ? '/manager' : '');

    const RESOURCES_DATA = [
        {
            title: "Điện",
            icon: Zap,
            baseColor: "#FF9D00",
            to: `${basePath}/resources/electricalResources`,
            className: "md:col-span-3 md:order-4", // Hàng 2: Cùng Hóa chất
            companyCount: fuels?.count_electricity || 0,
            resourceCategory: "electricity",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Điện lưới",
                    value: formatCompactDashboard(fuels?.total_electricity_grid || 0),
                    fullValue: formatFullNumber(fuels?.total_electricity_grid || 0),
                    unit: "kWh",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        fuels?.total_electricity_grid,
                        previousMonthFuels?.total_electricity_grid
                    ),
                    inverseTrend: false // Tăng hóa chất là Xấu (Đỏ)
                },
                {
                    label: "Điện tái tạo",
                    value: formatCompactDashboard(fuels?.total_electricity_renewable || 0),
                    fullValue: formatFullNumber(fuels?.total_electricity_renewable || 0),
                    unit: "kWh",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        fuels?.total_electricity_renewable,
                        previousMonthFuels?.total_electricity_renewable
                    ),
                    inverseTrend: false // Tăng hóa chất là Xấu (Đỏ)
                },
                {
                    label: "Tổng",
                    value: formatCompactDashboard(fuels?.total_electricity || 0),
                    fullValue: formatFullNumber(fuels?.total_electricity || 0),
                    unit: "kWh",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        fuels?.total_electricity,
                        previousMonthFuels?.total_electricity
                    ),
                    inverseTrend: false // Tăng hóa chất là Xấu (Đỏ)
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
            // subMetrics: [
            //     {
            //         label: "Điện lưới",
            //         value: formatCompactDashboard(fuels?.total_electricity_grid || 0),
            fullValue: formatFullNumber(fuels?.total_electricity_grid || 0), // Ví dụ
            //         unit: "-",
            //         trend: calculateTrend(
            //             fuels?.total_electricity_grid,
            //             previousMonthFuels?.total_electricity_grid
            //         ),
            //     }
            // ]
        },
        {
            title: "Nước",
            icon: Droplets,
            baseColor: "#00A6FF",
            to: `${basePath}/resources/waterResources`,
            className: "md:col-span-2 md:order-1", // Hàng 1: Nước, Chất đốt, Nguyên vật liệu
            companyCount: fuels?.count_water || 0,
            resourceCategory: "water",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Tổng",
                    value: formatCompactDashboard(fuels?.total_water || 0),
                    fullValue: formatFullNumber(fuels?.total_water || 0),
                    unit: "m³",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        fuels?.total_water,
                        previousMonthFuels?.total_water
                    ),
                    inverseTrend: false // Tăng hóa chất là Xấu (Đỏ)
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
            // subMetrics: [
            //     {
            //         label: "Điện lưới",
            //         value: formatCompactDashboard(fuels?.total_electricity_grid || 0),
            fullValue: formatFullNumber(fuels?.total_electricity_grid || 0), // Ví dụ
            //         unit: "-",
            //         trend: calculateTrend(
            //             fuels?.total_electricity_grid,
            //             previousMonthFuels?.total_electricity_grid
            //         ),
            //     }
            // ]
        },
        {
            title: "Chất đốt",
            icon: Flame,
            baseColor: "#FF4000",
            to: `${basePath}/resources/combustionResources`,
            className: "md:col-span-2 md:order-2", // Hàng 1: Nước, Chất đốt, Nguyên vật liệu
            companyCount: fuels?.count_combustion || 0,
            resourceCategory: "combustion",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Tổng",
                    value: formatCompactDashboard(fuels?.total_combustion || 0),
                    fullValue: formatFullNumber(fuels?.total_combustion || 0),
                    unit: "Tấn",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        fuels?.total_combustion,
                        previousMonthFuels?.total_combustion
                    ),
                    inverseTrend: false // Tăng hóa chất là Xấu (Đỏ)
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
        },
        {
            title: "Nguyên Vật liệu",
            icon: Pickaxe,
            baseColor: "#4E5BA6",
            to: `${basePath}/resources/materialResources`,
            className: "md:col-span-2 md:order-3", // Hàng 1: Nước, Chất đốt, Nguyên vật liệu
            companyCount: inputMaterials?.count_materials || 0,
            resourceCategory: "materials",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Tổng",
                    value: formatCompactDashboard(inputMaterials?.total_materials || 0),
                    fullValue: formatFullNumber(inputMaterials?.total_materials || 0),
                    unit: "Tấn",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        inputMaterials?.total_materials,
                        previousMonthInputMaterials?.total_materials
                    ),
                    inverseTrend: false
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
        },
        {
            title: "Hóa chất sử dụng",
            icon: FlaskConical,
            baseColor: "#9CB000",
            to: `${basePath}/resources/chemicalResources`,
            className: "md:col-span-3 md:order-5", // Hàng 2: Cùng Điện
            companyCount: inputChemicals?.count_chemicals || 0,
            resourceCategory: "chemicals",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Tổng Tấn",
                    value: formatCompactDashboard(Number(inputChemicals?.total_chemicals_kg || 0)),
                    fullValue: formatFullNumber(Number(inputChemicals?.total_chemicals_kg || 0)),
                    unit: "Tấn",
                    trend: calculateTrend(
                        Number(inputChemicals?.total_chemicals_kg || 0),
                        Number(previousMonthInputChemicals?.total_chemicals_kg || 0)
                    ),
                    inverseTrend: false
                },
                {
                    label: "Tổng m³",
                    value: formatCompactDashboard(Number(inputChemicals?.total_chemicals_m3 || 0)),
                    fullValue: formatFullNumber(Number(inputChemicals?.total_chemicals_m3 || 0)),
                    unit: "m³",
                    trend: calculateTrend(
                        Number(inputChemicals?.total_chemicals_m3 || 0),
                        Number(previousMonthInputChemicals?.total_chemicals_m3 || 0)
                    ),
                    inverseTrend: false
                }
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
        },
    ];

    const chunkArray = (arr, size) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    };

    const groupedData = chunkArray(RESOURCES_DATA, 3);
    const largeGroupedData = chunkArray(RESOURCES_DATA, 5);

    const [month, year] = selectedMonth ? selectedMonth.split('/') : ["", ""];
    const periodKey = year && month ? `${year}${month}` : "";

    return (
        <div className="w-full h-full flex flex-col gap-3 min-h-0 bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1 shrink-0">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Tài nguyên tiêu thụ</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Chart Type Toggle (Chỉ hiện khi đang ở tab Biểu đồ) */}
                    {activeTab === 'charts' && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                title="Biểu đồ đường"
                                onClick={() => setChartType('line')}
                                className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <LineChart className="size-4" />
                            </button>
                            <button
                                title="Biểu đồ cột"
                                onClick={() => setChartType('bar')}
                                className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <BarChart3 className="size-4" />
                            </button>
                            <button
                                title="Biểu đồ miền"
                                onClick={() => setChartType('area')}
                                className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white text-[#4E5BA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Activity className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('cards')}
                            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'cards'
                                ? 'bg-white text-[#4E5BA6] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Thẻ số liệu
                        </button>
                        <button
                            onClick={() => setActiveTab('charts')}
                            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'charts'
                                ? 'bg-white text-[#4E5BA6] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Biểu đồ
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                {activeTab === 'cards' ? (
                    /* Các thẻ số liệu - 2-Row Perfect Grid Full Height */
                    <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-4 pb-4 h-full min-h-0">
                        {RESOURCES_DATA.map((card, cardIndex) => (
                            <div key={`card-${cardIndex}`} className={`w-full h-full flex flex-col ${card.className || ''}`}>
                                <EnterpriseMetricCard {...card} periodKey={periodKey} date={selectedMonth} />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Biểu đồ */
                    <div className="h-full w-full pb-2">
                        <CardContainer
                            options={options}
                            selectedOption={consumptionChartState}
                            onOptionChange={(option) => setConsumptionChartState(option.value)}
                            className="!w-full !h-full !shadow-none border border-black/10"
                        >
                            {chartType === 'line' && (
                                <AutoLineChart
                                    dataByMonth={currentConsumptionOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentConsumptionOption.unit}
                                />
                            )}
                            {chartType === 'bar' && (
                                <AutoBarChart
                                    dataByMonth={currentConsumptionOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentConsumptionOption.unit}
                                />
                            )}
                            {chartType === 'area' && (
                                <AutoAreaChart
                                    dataByMonth={currentConsumptionOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentConsumptionOption.unit}
                                />
                            )}
                        </CardContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsumptionSection;