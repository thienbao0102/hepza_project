import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import yAxisFormatter from '@utils/formatNumberShort';

const AutoBarChart = ({ dataByMonth = {}, currentMonth = null, unit = "" }) => {

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
            <BarChart
                data={chartData}
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

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
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '10px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
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

                {/* ✅ Render các cột tự động */}
                {lineConfigs.map((line, idx) => (
                    <Bar
                        key={idx}
                        dataKey={line.name}
                        fill={line.color}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default React.memo(AutoBarChart);
