import React, { useState, useCallback, useMemo } from 'react';
import {
    PieChart,
    Pie,
    ResponsiveContainer,
    Cell,
    Sector,
    Customized
} from 'recharts';
import { formatSmallNumbers } from '@/components/dashboard/DashboardLogical';

// Tính font size động dựa trên độ dài text và bán kính trong của donut
const getDynamicFontSize = (text, innerRadius, baseFactor = 0.28) => {
    const str = String(text || '');
    const len = str.length;
    const availableWidth = innerRadius * 2 * 0.85;
    const maxFontByWidth = availableWidth / (len * 0.6);
    const maxFontByHeight = innerRadius * baseFactor;
    return Math.max(10, Math.min(maxFontByWidth, maxFontByHeight, 22));
};

// 👉 Hàm custom hiển thị lát bánh khi hover
const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, unit } = props;
    const valueText = formatSmallNumbers(payload.Value);
    const fontSize = getDynamicFontSize(valueText, innerRadius);
    const unitFontSize = Math.max(9, fontSize * 0.6);

    return (
        <g>
            <text
                x={cx}
                y={cy - unitFontSize * 0.3}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111827"
                fontSize={fontSize}
                fontWeight={500}
                className="pointer-events-none select-none"
            >
                {valueText}
            </text>
            <text
                x={cx}
                y={cy + fontSize * 0.7}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#6b7280"
                fontSize={unitFontSize}
                className="pointer-events-none select-none"
            >
                {payload.unit}
            </text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius}
                startAngle={startAngle} endAngle={endAngle} cornerRadius={5} fill={fill} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle}
                innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} cornerRadius={5} fill={fill} />
        </g>
    );
};

// Component hiển thị text ở giữa donut khi không hover
const CenterText = ({ width, height, centerText, unit }) => {
    const cx = width / 2;
    const cy = height / 2;
    const estimatedInnerR = Math.min(cx, cy) * 0.80;
    const fs = getDynamicFontSize(centerText, estimatedInnerR);
    const unitFs = Math.max(9, fs * 0.6);

    return (
        <g>
            <text x={cx} y={cy - unitFs * 0.3} textAnchor="middle" dominantBaseline="middle"
                fill="#111827" fontSize={fs} fontWeight={500} className="pointer-events-none select-none">
                {centerText}
            </text>
            <text x={cx} y={cy + fs * 0.7} textAnchor="middle" dominantBaseline="middle"
                fill="#6b7280" fontSize={unitFs} className="pointer-events-none select-none">
                {unit}
            </text>
        </g>
    );
};

const DonutChartComponent = ({ data = [], totalValue = 0, unit = "", showLegend = true }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);
    const onPieLeave = useCallback(() => setActiveIndex(null), []);

    const chartData = useMemo(() => {
        return data.map((item) => ({
            ...item,
            name: item.Name,
            value: item.Value,
            unit: item.unit,
            fill: item.Color || '#ccc',
        }));
    }, [data]);

    const legendData = useMemo(() => {
        return chartData.map((item) => {
            const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
            return { ...item, percent };
        });
    }, [chartData, totalValue]);

    const centerText = useMemo(() => formatSmallNumbers(totalValue), [totalValue]);

    if (chartData.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-start gap-3">
            <div className="w-full h-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={(props) => renderActiveShape({ ...props, unit })}
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="80%"
                            outerRadius="93%"
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            cornerRadius={5}
                            paddingAngle={2}
                            isAnimationActive={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.Color || entry.fill}
                                    className="focus:outline-none" />
                            ))}
                        </Pie>

                        {/* Center text — dùng Customized để lấy width/height thực tế */}
                        {activeIndex === null && (
                            <Customized
                                component={(props) => (
                                    <CenterText {...props} centerText={centerText} unit={unit} />
                                )}
                            />
                        )}
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {showLegend && (
                <div className="w-fit sm:w-1/3 flex flex-col justify-center gap-2 text-xs pr-1">
                    {legendData.map((item, index) => (
                        <div key={`legend-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: item.Color || item.fill }}></div>
                                <span className="text-gray-600 truncate">{item.Name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DonutChart = React.memo(DonutChartComponent);
export default DonutChart;
