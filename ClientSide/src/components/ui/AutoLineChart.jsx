import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import yAxisFormatter from '@utils/formatNumberShort';

const AutoLineChart = ({ dataByMonth = {}, currentMonth = null, unit = "" }) => {

    const { chartData, lineConfigs } = useMemo(() => {
        const linesMap = new Map();
        const chartDataArr = [];

        for (let m = 1; m <= 12; m++) {
            const monthStr = m.toString();
            const monthData = dataByMonth[m] || [];

            const row = { month: monthStr };

            monthData.forEach(item => {
                row[item.Name] = item.Value;
                if (!linesMap.has(item.Name)) {
                    linesMap.set(item.Name, item.Color);
                }
            });

            chartDataArr.push(row);
        }

        const lineConfigs = Array.from(linesMap.entries()).map(([name, color]) => ({
            name,
            color,
        }));

        return { chartData: chartDataArr, lineConfigs };
    }, [dataByMonth]);

    // ✅ Nếu không có dữ liệu nào
    const hasData = lineConfigs.length > 0 && chartData.some(d => {
        return Object.keys(d).some(k => k !== 'month' && d[k] !== undefined);
    });

    if (!hasData) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={chartData}
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                    dataKey="month"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={(value) => yAxisFormatter(value)}
                    tick={{ fill: '#9ca3af', fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                />

                <Tooltip
                    cursor={{ stroke: '#ccc', strokeDasharray: '3 3' }}
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '10px',
                    }}
                    labelStyle={{ fontWeight: 600 }}
                    labelFormatter={(label) => `Tháng ${label}`}
                    formatter={(value, name, props) => [`${value.toLocaleString()} ${unit}`, name]}
                />

                {/* ✅ Đánh dấu tháng hiện tại */}
                {currentMonth && (
                    <ReferenceLine
                        x={currentMonth.toString()}
                        stroke="#EF4444"
                        strokeDasharray="3 3"
                        label={{
                            position: 'top',
                            value: 'Tháng hiện tại',
                            fill: '#EF4444',
                            fontSize: 11,
                        }}
                    />
                )}

                {/* ✅ Render các đường line tự động */}
                {lineConfigs.map((line, idx) => (
                    <Line
                        key={idx}
                        type="monotone"
                        dataKey={line.name}
                        stroke={line.color}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false} // ⚡ Không lag khi nhiều chart
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

export default React.memo(AutoLineChart);
