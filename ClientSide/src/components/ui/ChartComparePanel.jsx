import React, { useMemo } from 'react';
import { Modal } from 'antd';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, AreaChart, Area,
    LineChart, Line
} from 'recharts';
import { X, Trash2, BarChart3 } from 'lucide-react';

const CHART_COLORS = [
    '#8B5CF6', '#10B981', '#06B6D4', '#F43F5E', '#F59E0B',
    '#6366F1', '#3B82F6', '#EF4444', '#14B8A6', '#A855F7'
];

const ChartComparePanel = ({ open, onClose, charts = [], onRemove, onClearAll }) => {
    if (!open || charts.length === 0) return null;

    const colClass = charts.length === 1 ? 'grid-cols-1' : charts.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={charts.length === 1 ? 600 : charts.length === 2 ? 1000 : 1400}
            className="chart-compare-panel"
            closable={false}
            styles={{
                body: { padding: 0 },
                mask: { backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }
            }}
        >
            <div className="bg-white rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">So sánh biểu đồ</h2>
                            <p className="text-xs text-slate-400">{charts.length} biểu đồ đang so sánh</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClearAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa tất cả
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Chart Grid */}
                <div className={`grid ${colClass} gap-4 p-6`}>
                    {charts.map((chart) => (
                        <CompareCard key={chart.id} chart={chart} onRemove={onRemove} />
                    ))}
                </div>
            </div>
        </Modal>
    );
};

const CompareCard = ({ chart, onRemove }) => {
    const { title, chartType, data, unit, description, stackedKeys = [], colors = CHART_COLORS, xAxisKey = 'name' } = chart;

    const normalizedData = useMemo(() => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const groupedArray = [];
            Object.entries(data).forEach(([groupName, items]) => {
                if (Array.isArray(items)) {
                    items.forEach(item => groupedArray.push({ ...item, group: groupName }));
                }
            });
            return groupedArray;
        }
        return Array.isArray(data) ? data : [];
    }, [data]);

    const chartH = 240;

    const renderChart = () => {
        const c = colors || CHART_COLORS;

        switch (chartType) {
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={chartH}>
                        <PieChart>
                            <Pie data={normalizedData} cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={3} dataKey="value">
                                {normalizedData.map((_, i) => (
                                    <Cell key={i} fill={c[i % c.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                formatter={(v, name) => [`${v?.toLocaleString()} ${unit}`, name]}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11 }}
                            />
                            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'bar': {
                const isGrouped = normalizedData.length > 0 && normalizedData[0].group;
                return (
                    <ResponsiveContainer width="100%" height={chartH}>
                        <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey={isGrouped ? 'group' : xAxisKey} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11 }} />
                            <Bar dataKey="value" fill={c[0]} radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            }

            case 'stacked-bar':
                return (
                    <ResponsiveContainer width="100%" height={chartH}>
                        <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11 }} />
                            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            {stackedKeys.map((key, idx) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={c[idx % c.length]} radius={idx === stackedKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} barSize={20} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={chartH}>
                        <AreaChart data={normalizedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11 }} />
                            {stackedKeys.length > 0 ? stackedKeys.map((key, idx) => (
                                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={c[idx % c.length]} fill={c[idx % c.length]} fillOpacity={0.3} />
                            )) : (
                                <Area type="monotone" dataKey="value" stroke={c[0]} fill={c[0]} fillOpacity={0.3} strokeWidth={2} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={chartH}>
                        <LineChart data={normalizedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11 }} />
                            {stackedKeys.length > 0 ? stackedKeys.map((key, idx) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={c[idx % c.length]} strokeWidth={2} dot={{ r: 2 }} />
                            )) : (
                                <Line type="monotone" dataKey="value" stroke={c[0]} strokeWidth={2} dot={{ r: 2 }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                );

            default:
                return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loại biểu đồ không hỗ trợ</div>;
        }
    };

    // Calculate total
    const total = useMemo(() => {
        if (chartType === 'stacked-bar' && stackedKeys.length > 0) {
            return normalizedData.reduce((acc, curr) => {
                return acc + stackedKeys.reduce((sum, key) => sum + (curr[key] || 0), 0);
            }, 0);
        }
        return normalizedData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    }, [normalizedData, chartType, stackedKeys]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex-1 min-w-0 mr-2">
                    <h3 className="text-sm font-semibold text-slate-700 truncate">{title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 capitalize">{chartType}</span>
                        {unit && (
                            <>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] text-slate-400">Đơn vị: {unit}</span>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onRemove(chart.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Bỏ ghim"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Chart */}
            <div className="px-3 py-2">
                {normalizedData.length > 0 ? renderChart() : (
                    <div className="flex items-center justify-center h-[240px] text-slate-300 text-sm">Chưa có dữ liệu</div>
                )}
            </div>

            {/* Card Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/30">
                <span className="text-xs text-slate-500">
                    Tổng: <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> {unit}
                </span>
            </div>
        </div>
    );
};

export default ChartComparePanel;
