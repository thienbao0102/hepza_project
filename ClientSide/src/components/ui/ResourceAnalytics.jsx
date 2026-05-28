import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { Maximize2, SearchCheck, Download, FileSpreadsheet } from 'lucide-react';
import ChartDetailModal from './ChartDetailModal';
import { exportToStyledExcel } from '@utils/excelExport';
import dayjs from 'dayjs'; // Assuming dayjs is available for date formatting
import toast from '@/utils/toast';

const COLORS = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#8B5CF6', '#F43F5E'];

const EmptyState = ({ message }) => (
  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
    <SearchCheck className="size-8 opacity-50" />
    <span className="text-sm font-medium">{message}</span>
  </div>
);

const ResourceAnalytics = ({ chartData, config, onChartViewClick, exportFileName = 'ThongKe' }) => {
  const [isExporting, setIsExporting] = useState(false);

  // Dynamic fallback for pages that don't provide allTypes or allSources
  const getActualAllTypes = () => {
    if (chartData?.allTypes) return chartData.allTypes;
    if (chartData?.allSources) return chartData.allSources;
    if (chartData?.byTime?.length > 0) {
      const keys = Object.keys(chartData.byTime[0]).filter(k => k !== 'name' && k !== 'timestamp');
      if (keys.length > 1 && keys.includes('total')) return keys.filter(k => k !== 'total');
      return keys.length > 0 ? keys : ['total'];
    }
    return ['total'];
  };
  const actualAllTypes = getActualAllTypes();

  const formatDataForExport = (data, type) => {
    const unit = config.unit || 'kg';
    if (type === 'pie') {
      const total = data.reduce((sum, item) => sum + item.value, 0);
      return data.map(item => ({
        'HẠNG MỤC': item.name.charAt(0).toUpperCase() + item.name.slice(1),
        'SỐ LƯỢNG': item.value,
        'ĐƠN VỊ': unit.toUpperCase(),
        'TỶ TRỌNG (%)': total > 0 ? parseFloat(((item.value / total) * 100).toFixed(2)) : 0,
      }));
    } else if (type === 'bar') {
      if (data && Object.keys(data).length > 0 && !Array.isArray(data)) { // Dữ liệu phân nhóm (Grouped)
        const formattedData = [];
        Object.entries(data).forEach(([group, items]) => {
          const groupTotal = items.reduce((sum, item) => sum + item.value, 0);
          items.forEach(item => {
            formattedData.push({
              'PHÂN XƯỞNG/NHÓM': group.charAt(0).toUpperCase() + group.slice(1),
              'HẠNG MỤC': item.name.charAt(0).toUpperCase() + item.name.slice(1),
              'SỐ LƯỢNG': item.value,
              'ĐƠN VỊ': unit.toUpperCase(),
              'TỶ LỆ TRONG NHÓM (%)': groupTotal > 0 ? parseFloat(((item.value / groupTotal) * 100).toFixed(2)) : 0,
            });
          });
        });
        return formattedData;
      } else { // Dữ liệu phẳng (Flat data)
        const total = data.reduce((sum, item) => sum + item.value, 0);
        return data.map(item => ({
          'HẠNG MỤC': item.name.charAt(0).toUpperCase() + item.name.slice(1),
          'SỐ LƯỢNG': item.value,
          'ĐƠN VỊ': unit.toUpperCase(),
          'TỶ TRỌNG (%)': total > 0 ? parseFloat(((item.value / total) * 100).toFixed(2)) : 0,
        }));
      }
    } else if (type === 'trend') {
      return data.map(item => {
        const row = { 'THỜI GIAN': item.name };

        // Bỏ qua các cột không cần xuất như timestamp hoặc name
        const filteredTypes = actualAllTypes.filter(k => k !== 'timestamp' && k !== 'name');

        const rowTotal = filteredTypes.reduce((sum, typeStr) => sum + (item[typeStr] || 0), 0);

        filteredTypes.forEach(typeStr => {
          const val = item[typeStr] || 0;
          const displayTitle = typeStr.toUpperCase();
          row[displayTitle] = val; // Số liệu thực tế
          row[`% ${displayTitle}`] = rowTotal > 0 ? parseFloat(((val / rowTotal) * 100).toFixed(2)) : 0;
        });

        row['ĐƠN VỊ CHUNG'] = unit.toUpperCase();
        return row;
      });
    }
    return [];
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const cleanTitle = config.pageTitle.replace(/[\s/\\?*:"<>|]/g, '_');

      await exportToStyledExcel({
        sheets: [
          { sheetName: 'Theo_Phan_Bo', data: formatDataForExport(chartData.byTypeFull, 'pie') },
          { sheetName: 'Theo_Phan_Loai', data: formatDataForExport(chartData.byTypeGrouped || chartData.byTypeFull, 'bar') },
          { sheetName: 'Theo_Xu_Huong', data: formatDataForExport(chartData.byTime, 'trend') },
        ],
        fileName: `Tong_Hop_${cleanTitle}_${dayjs().format('DDMMYYYY')}.xlsx`,
      });
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      toast.error('Lỗi xuất file', 'Đã xảy ra lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    // The container does NOT have the exact height constraint as that's contextual,
    // but since CompanyMaterialResources used min-h-[200px] h-[28%] shrink-0, we can wrap this component in that, or keep it here.
    // I will keep it relatively transparent so it fits the container.
    <div className="w-full h-full flex flex-col relative">
      {/* Export Header */}
      {/* To avoid layout shifts, we place the absolute export button at the top right, relative to parent container usually.
                Wait, if it's absolute, it might overlap if there's no space.
                Let's put it in a flex header or absolute right.
            */}
      <div className="absolute -top-12 right-0 z-10">
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          disabled={isExporting}
          onClick={handleExport}
        >
          {isExporting ? (
            <div className="size-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          Xuất báo cáo Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-3 h-full">
        {/* Chart 1: Distribution */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${config.chart1.bgClass} rounded-lg`}>
                <config.chart1.icon className={`size-4 ${config.chart1.textClass}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 leading-tight">{config.chart1.title}</h3>
              </div>
            </div>
            <button
              className={'p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors'}
              title="Xem chi tiết"
              onClick={() => onChartViewClick('pie', chartData.byTypeFull, `Chi tiết ${config.chart1.title}`, config.unit, config.measure)}
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            {chartData.byType.length > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="35%"
                    cy="50%"
                    data={chartData.byType}
                    dataKey="value"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={5}
                  >
                    {chartData.byType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isOthers ? '#94A3B8' : COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [`${value.toLocaleString()} ${config.unit}`, <span className="capitalize truncate max-w-[200px] block" title={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>]}
                  />
                  <Legend
                    align="right"
                    formatter={(value) => <span className="text-[9px] text-slate-600 font-medium ml-1 truncate max-w-[70px] block" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>}
                    iconSize={6}
                    iconType="circle"
                    layout="vertical"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingLeft: '5px', fontSize: '9px', overflow: 'hidden' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Chưa có dữ liệu" />
            )}
          </div>
        </div>

        {/* Chart 2: By Type */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${config.chart2.bgClass} rounded-lg`}>
                <config.chart2.icon className={`size-4 ${config.chart2.textClass}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 leading-tight">{config.chart2.title}</h3>
              </div>
            </div>
            <button
              className={'p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors'}
              title="Xem chi tiết"
              onClick={() => onChartViewClick('bar', chartData.byTypeGrouped || chartData.byTypeFull, `Chi tiết ${config.chart2.title}`, config.unit, config.measure, [], [config.chart2.fillColor || '#8B5CF6'])}
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            {chartData.byType.length > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={chartData.byType}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis hide type="number" />
                  <YAxis
                    axisLine={false}
                    dataKey="name"
                    interval={0}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickFormatter={(value) => {
                      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                      return capitalized.length > 18 ? `${capitalized.substring(0, 18)}...` : capitalized;
                    }}
                    tickLine={false}
                    type="category"
                    width={120}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg text-xs max-w-[220px]">
                            <p className="font-semibold text-slate-700 mb-1 truncate" title={label}>{label.charAt(0).toUpperCase() + label.slice(1)}</p>
                            <p className={`${config.chart2.textClass} font-mono mb-1`}>
                              {payload[0].value.toLocaleString()} {config.unit}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    barSize={20}
                    dataKey="value"
                    fill={config.chart2.fillColor || '#8B5CF6'}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Chưa có dữ liệu" />
            )}
          </div>
        </div>

        {/* Chart 3: Trend Stacked Bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${config.chart3.bgClass} rounded-lg`}>
                <config.chart3.icon className={`size-4 ${config.chart3.textClass}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 leading-tight">{config.chart3.title}</h3>
              </div>
            </div>
            <button
              className={'p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors'}
              title="Xem chi tiết"
              onClick={() => onChartViewClick('stacked-bar', chartData.byTime, `Chi tiết ${config.chart3.title}`, config.unit, config.measure, actualAllTypes)}
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 w-full">
            {chartData.byTime.length > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    dy={10}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(val) => `${val / 1000}k`}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs max-w-[250px]">
                            <p className="font-semibold text-slate-700 mb-2">{label}</p>
                            <p className={`${config.chart3.textClass} font-mono font-medium mb-2`}>
                              Tổng: {total.toLocaleString()} {config.unit}
                            </p>
                            <div className="max-h-[120px] overflow-y-auto pr-1">
                              {payload.filter(p => p.value > 0).map((p, idx) => (
                                <div key={idx} className="flex justify-between text-[10px] py-0.5">
                                  <span className="text-slate-600 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                                    <span className="truncate max-w-[120px] block" title={p.name}>
                                      {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                                    </span>
                                  </span>
                                  <span className="text-slate-800 font-mono pl-2">{p.value.toLocaleString()} {config.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend formatter={(value) => <span className="truncate max-w-[90px] block" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  {actualAllTypes.map((type, idx) => (
                    <Bar key={type} barSize={32} dataKey={type} fill={COLORS[idx % COLORS.length]} name={type} radius={idx === actualAllTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={`Chưa có dữ liệu ${config.chart3.title.toLowerCase()}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceAnalytics;

