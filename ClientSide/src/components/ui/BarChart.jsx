import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea,
} from "recharts";
import numberFormatter from "../../utils/formatThousandSeparator";
import formatNumberShort from "../../utils/formatNumberShort";

// Tooltip tuỳ chỉnh
const CustomTooltip = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                <p className="label text-sm font-semibold text-gray-800 mb-2">
                    Tháng {label}
                </p>
                {payload.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm gap-1">
                        <span className="text-gray-600">{item.name}:</span>
                        <span className="font-bold text-gray-800 flex gap-1">
                            {numberFormatter(item.value)} {unit}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomXAxisTick = ({ x, y, payload, currentMonth }) => {
    const month = payload.value;
    const isCurrent = month === currentMonth;

    return (
        <text
            x={x}
            y={y + 10}
            textAnchor="middle"
            style={{
                fontWeight: isCurrent ? "700" : "400", // 🎯 In đậm tháng hiện tại
                fill: isCurrent ? "#000" : "#9ca3af",   // 🎯 Tô đen rõ hơn
                fontSize: 13
            }}
        >
            {month}
        </text>
    );
};

const VerticalBarchart = ({ dataByMonth, currentMonth = new Date().getMonth() + 1, showLegend = false, unit }) => {
    // ✅ Chuẩn hoá dữ liệu: luôn có 12 tháng, tháng không có data sẽ có giá trị 0
    const chartData = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const entries = dataByMonth[month] || [];
            const item = { Tháng: month };

            entries.forEach(entry => {
                item[entry.Name] = entry.Value;
            });

            return item;
        });
    }, [dataByMonth]);

    // ✅ Lấy danh sách các loại nước & màu tương ứng từ toàn bộ data
    const categories = useMemo(() => {
        const allEntries = Object.values(dataByMonth).flat();
        const unique = Array.from(new Map(allEntries.map(item => [item.Name, item])).values());
        return unique.map(item => ({
            key: item.Name,
            color: item.Color
        }));
    }, [dataByMonth]);

    // Nếu hoàn toàn không có dữ liệu nào (12 tháng rỗng)
    const hasAnyData = categories.length > 0;

    if (!hasAnyData) {
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
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 10" vertical={false} />
                <XAxis
                    dataKey="Tháng"
                    tick={(props) => <CustomXAxisTick {...props} currentMonth={currentMonth} />}
                />
                <YAxis tick={{ fill: "#9ca3af" }} tickFormatter={formatNumberShort} fontSize={13} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {showLegend ?? <Legend />}

                {categories.map((cat) => (
                    <Bar
                        key={cat.key}
                        dataKey={cat.key}
                        fill={cat.color}
                        radius={8} // bo góc phía trên
                        barGap={4}
                        maxBarSize={30}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default React.memo(VerticalBarchart);
