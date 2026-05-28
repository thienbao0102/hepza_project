// src/components/dashboard/EmissionsSection.jsx
import React, { useState } from 'react';
import { CardContainer, EnterpriseMetricCard } from './DashboardComponents';
import AutoLineChart from '../ui/AutoLineChart';
import AutoBarChart from '../ui/AutoBarChart';
import AutoAreaChart from '../ui/AutoAreaChart';
import { Trash2, CloudFog, Factory, ArrowUpRight, BarChart3, Activity, LineChart } from 'lucide-react';
import { calculateTrend, formatCompactDashboard, formatFullNumber } from './DashboardLogical';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const CompanyEmissionsSection = ({ data, options }) => {
    const {
        waste, emissions,
        previousMonthWaste, previousMonthEmissions,
        formatSmallNumbers, selectedMonth,
        userRole
    } = data;

    const getNum = (val) => Number(val) || 0;

    const [emissionsChartState, setEmissionsChartState] = useState('co2');
    const [activeTab, setActiveTab] = useState('cards');
    const [chartType, setChartType] = useState('line'); // line | bar | area
    const currentEmissionsOption = options.find(opt => opt.value === emissionsChartState);
    const currentMonthNumber = Number(selectedMonth.split("/")[0]);

    const basePath = userRole === 'admin' ? '/admin' : (userRole === 'manager' ? '/manager' : '');

    const EMISSIONS_DATA = [
        {
            title: "Phát thải CO₂",
            icon: CloudFog,
            baseColor: "#01874F",
            to: `${basePath}/CO2`,
            companyCount: emissions?.count_emissions || 0,
            resourceCategory: "emissions",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Tổng",
                    value: formatCompactDashboard(emissions?.total_co2 || 0),
                    fullValue: formatFullNumber(emissions?.total_co2 || 0),
                    unit: "Tấn",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        emissions?.total_co2,
                        previousMonthEmissions?.total_co2
                    ),
                    inverseTrend: true
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
            // subMetrics omitted
        },
        {
            title: "Chất thải",
            icon: Trash2,
            baseColor: "#866701",
            to: `${basePath}/waste`,
            companyCount: waste?.count_waste || 0,
            resourceCategory: "waste",
            // --- MAIN METRICS: Đưa 3 biến kg, l, m3 vào đây ---
            mainMetrics: [
                {
                    label: "Dạng rắn",
                    value: formatSmallNumbers(
                        getNum(waste?.total_waste_DO) +
                        getNum(waste?.total_waste_IND) +
                        getNum(waste?.total_waste_HA)
                    ),
                    fullValue: formatFullNumber(
                        getNum(waste?.total_waste_DO) +
                        getNum(waste?.total_waste_IND) +
                        getNum(waste?.total_waste_HA)
                    ),
                    unit: "Tấn",
                    // Tính trend dựa trên tháng trước
                    trend: calculateTrend(
                        getNum(waste?.total_waste_DO) + getNum(waste?.total_waste_IND) + getNum(waste?.total_waste_HA),
                        getNum(previousMonthWaste?.total_waste_DO) + getNum(previousMonthWaste?.total_waste_IND) + getNum(previousMonthWaste?.total_waste_HA)
                    ),
                    inverseTrend: true // Tăng hóa chất là Xấu (Đỏ)
                },
                {
                    label: "Nước thải",
                    value: formatSmallNumbers(getNum(waste?.total_waste_WWA)),
                    fullValue: formatFullNumber(getNum(waste?.total_waste_WWA)),
                    unit: "m³",
                    trend: calculateTrend(
                        getNum(waste?.total_waste_WWA),
                        getNum(previousMonthWaste?.total_waste_WWA)
                    ),
                    inverseTrend: true
                },
                {
                    label: "Khí thải",
                    value: formatSmallNumbers(getNum(waste?.total_waste_GASW)),
                    fullValue: formatFullNumber(getNum(waste?.total_waste_GASW)),
                    unit: "mg/l",
                    trend: calculateTrend(
                        getNum(waste?.total_waste_GASW),
                        getNum(previousMonthWaste?.total_waste_GASW)
                    ),
                    inverseTrend: true
                },
            ],

            // --- SUB METRICS: Các thông tin phụ (nếu có) ---
            // subMetrics omitted
        },
    ];

    const chunkArray = (arr, size) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    };

    const groupedData = chunkArray(EMISSIONS_DATA, 2);

    const [month, year] = selectedMonth ? selectedMonth.split('/') : ["", ""];
    const periodKey = year && month ? `${year}${month}` : "";

    return (
        <div className="w-full h-full flex flex-col gap-3 min-h-0 bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1 shrink-0">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Phát thải và Chất thải</h2>
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
                    /* Các thẻ số liệu - Vertical Stack */
                    <div className="flex flex-col gap-4 pb-4 h-full min-h-0">
                        {EMISSIONS_DATA.map((card, cardIndex) => (
                            <div key={`card-${cardIndex}`} className="w-full flex-1 flex flex-col h-full">
                                <EnterpriseMetricCard {...card} periodKey={periodKey} date={selectedMonth} />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Biểu đồ */
                    <div className="h-full w-full pb-2">
                        <CardContainer
                            options={options}
                            selectedOption={emissionsChartState}
                            onOptionChange={(option) => setEmissionsChartState(option.value)}
                            className="!w-full !h-full !shadow-none border border-black/10"
                        >
                            {chartType === 'line' && (
                                <AutoLineChart
                                    dataByMonth={currentEmissionsOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentEmissionsOption.unit}
                                />
                            )}
                            {chartType === 'bar' && (
                                <AutoBarChart
                                    dataByMonth={currentEmissionsOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentEmissionsOption.unit}
                                />
                            )}
                            {chartType === 'area' && (
                                <AutoAreaChart
                                    dataByMonth={currentEmissionsOption.data}
                                    currentMonth={currentMonthNumber}
                                    unit={currentEmissionsOption.unit}
                                />
                            )}
                        </CardContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyEmissionsSection;
