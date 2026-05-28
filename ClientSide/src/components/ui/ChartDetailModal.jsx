import React, { useMemo, useState } from 'react';
import { exportToStyledExcel } from '@utils/excelExport';
import dayjs from 'dayjs';
import { Modal } from 'antd';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, AreaChart, Area,
  LineChart, Line,
} from 'recharts';
import { X, Download, Filter, Maximize2, Pin } from 'lucide-react';
import toast from '@/utils/toast';

const CHART_COLORS = [
  '#8B5CF6', '#10B981', '#06B6D4', '#F43F5E', '#F59E0B',
  '#6366F1', '#3B82F6', '#EF4444', '#14B8A6', '#A855F7',
];

const ChartDetailModal = ({
  open = false,
  onClose,
  title = 'Chi tiết biểu đồ',
  chartType = 'pie', // 'pie', 'bar', 'stacked-bar', 'area', 'line'
  data = [],
  colors = CHART_COLORS,
  unit = '',
  description = '',
  showExport = true,
  height = 500,
  width = 800,
  stackedKeys = [], // For stacked bar - array of dataKeys
  xAxisKey = 'name',
  chartId,
  onPin,
  isPinned = false,
}) => {
  const [selectedDataKeys, setSelectedDataKeys] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Transform grouped data (object with arrays) to flat array if needed
  const normalizedData = useMemo(() => {
    // If data is an object (grouped by category), flatten it
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const groupedArray = [];
      Object.entries(data).forEach(([groupName, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            groupedArray.push({
              ...item,
              group: groupName,
              fullName: `${groupName} - ${item.name}`,
            });
          });
        }
      });
      return groupedArray;
    }
    return data || [];
  }, [data]);

  // Initialize selected keys when data changes
  useMemo(() => {
    if (normalizedData.length > 0 && stackedKeys.length > 0) {
      setSelectedDataKeys(stackedKeys);
    }
  }, [normalizedData, stackedKeys]);

  // Helper to generate data for export
  const generateExportData = () => {
    if (!normalizedData || normalizedData.length === 0) return [];

    // Tìm các cột chứa dữ liệu số (loại trừ cột thời gian/hạng mục và timestamp)
    const dataKeys = Object.keys(normalizedData[0]).filter(k =>
      k !== xAxisKey &&
      k !== 'timestamp' &&
      typeof normalizedData[0][k] === 'number'
    );

    // Trường hợp 1: Biểu đồ đơn giản (chỉ có 1 cột số liệu, vd: Pie, Basic Bar)
    if (chartType === 'pie' || (chartType === 'bar' && dataKeys.includes('value'))) {
      const valKey = dataKeys.includes('value') ? 'value' : dataKeys[0];
      const total = normalizedData.reduce((sum, row) => sum + (Number(row[valKey]) || 0), 0);

      return normalizedData.map(row => {
        const val = Number(row[valKey]) || 0;
        const percent = total > 0 ? ((val / total) * 100).toFixed(2) : 0;
        return {
          'NHÓM / THỜI GIAN': row[xAxisKey],
          'SỐ LƯỢNG': val,
          'ĐƠN VỊ': (unit || '').toUpperCase(),
          'TỶ TRỌNG (%)': parseFloat(percent),
        };
      });
    }

    // Trường hợp 2: Biểu đồ phức tạp (Line nhiều đường, Stacked Bar)
    return normalizedData.map(row => {
      const newRow = { 'THỜI GIAN / HẠNG MỤC': row[xAxisKey] };

      const rowTotal = dataKeys.reduce((sum, k) => sum + (Number(row[k]) || 0), 0);

      dataKeys.forEach(k => {
        const val = Number(row[k]) || 0;
        const displayTitle = k.toUpperCase();
        newRow[displayTitle] = val; // Giá trị gốc

        // Thêm tỷ trọng của phần này so với tổng trong tháng / nhóm đó
        const percent = rowTotal > 0 ? ((val / rowTotal) * 100).toFixed(2) : 0;
        newRow[`% ${displayTitle}`] = parseFloat(percent);
      });

      newRow['ĐƠN VỊ CHUNG'] = (unit || 'Tùy chọn').toUpperCase();
      return newRow;
    });
  };

  // Export to Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const formattedData = generateExportData();
      const cleanTitle = title.replace(/[\s/\\?*:"<>|]/g, '_');

      await exportToStyledExcel({
        sheets: [{ sheetName: cleanTitle.substring(0, 31), data: formattedData }],
        fileName: `Chi_Tiet_${cleanTitle}_${dayjs().format('DDMMYYYY')}.xlsx`,
      });
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      toast.error('Lỗi xuất file', 'Đã xảy ra lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer height={height} width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey="value"
                innerRadius={60}
                label={({ name, percent }) => `${name.charAt(0).toUpperCase() + name.slice(1)} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}
                outerRadius={Math.min(width, height) / 2 - 40}
                paddingAngle={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                formatter={(value, name) => [`${value?.toLocaleString()} ${unit}`, <span className="capitalize truncate max-w-[200px] block" title={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>]}
              />
              <Legend
                align="right"
                formatter={(value) => <span className="text-sm text-slate-700 font-medium truncate max-w-[150px] block" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>}
                iconType="circle"
                layout="vertical"
                verticalAlign="middle"
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        // Check if we have grouped data (has 'group' property)
        const isGroupedData = normalizedData.length > 0 && normalizedData[0].group;

        return (
          <ResponsiveContainer height={height} width="100%">
            <BarChart data={normalizedData} {...commonProps}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                angle={isGroupedData ? -45 : 0}
                axisLine={{ stroke: '#E2E8F0' }}
                dataKey={isGroupedData ? 'fullName' : xAxisKey}
                height={isGroupedData ? 80 : 30}
                textAnchor={isGroupedData ? 'end' : 'middle'}
                tick={{ fill: '#64748B', fontSize: isGroupedData ? 10 : 12 }}
                tickFormatter={(value) => {
                  let text = value;
                  if (isGroupedData && value.includes(' - ')) {
                    const parts = value.split(' - ');
                    text = parts[1];
                  }
                  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
                  return capitalized.length > 18 ? capitalized.substring(0, 18) + '...' : capitalized;
                }}
              />
              <YAxis
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataItem = payload[0].payload;
                    const groupName = dataItem.group;
                    return (
                      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-sm max-w-[280px]">
                        {groupName && (
                          <p className="text-xs text-slate-500 mb-1">{groupName}</p>
                        )}
                        <p className="font-semibold text-slate-700 mb-1 capitalize truncate max-w-[220px]" title={dataItem.name}>
                          {dataItem.name.charAt(0).toUpperCase() + dataItem.name.slice(1)}
                        </p>
                        <p className="text-indigo-600 font-mono mb-2">
                          {payload[0].value?.toLocaleString()} {unit}
                        </p>
                        {dataItem.materials && dataItem.materials.length > 0 && (
                          <div className="border-t border-slate-100 pt-2">
                            <p className="text-xs text-slate-500 mb-1">Vật liệu trong loại ({dataItem.materials.length}):</p>
                            <div className="max-h-[150px] overflow-y-auto pr-1">
                              {dataItem.materials.map((m, idx) => (
                                <div key={idx} className="flex justify-between text-xs py-0.5 hover:bg-slate-50 px-1 rounded">
                                  <span className="text-slate-600 truncate max-w-[180px]">{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</span>
                                  <span className="text-slate-800 font-mono ml-2">{m.qty?.toLocaleString()} {unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: '#F1F5F9' }}
              />
              <Legend />
              <Bar
                barSize={isGroupedData ? 20 : 40}
                dataKey="value"
                fill={colors[0]}
                name={unit || 'Giá trị'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked-bar':
        return (
          <ResponsiveContainer height={height} width="100%">
            <BarChart data={normalizedData} {...commonProps}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                axisLine={{ stroke: '#E2E8F0' }}
                dataKey={xAxisKey}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
                    return (
                      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-sm max-w-[280px]">
                        <p className="font-semibold text-slate-700 mb-2">{label}</p>
                        <p className="text-indigo-600 font-mono font-medium mb-2">
                          Tổng: {total.toLocaleString()} {unit}
                        </p>
                        <div className="max-h-[150px] overflow-y-auto pr-1">
                          {payload.filter(p => p.value > 0).map((p, idx) => (
                            <div key={idx} className="flex justify-between text-xs py-0.5">
                              <span className="text-slate-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                                <span className="truncate max-w-[150px] block" title={p.name}>
                                  {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                                </span>
                              </span>
                              <span className="text-slate-800 font-mono pl-2">{p.value.toLocaleString()} {unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: '#F1F5F9' }}
              />
              <Legend formatter={(value) => <span className="truncate max-w-[120px] inline-block align-bottom" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} />
              {stackedKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % colors.length]}
                  name={key}
                  radius={idx === stackedKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer height={height} width="100%">
            <AreaChart data={normalizedData} {...commonProps}>
              <defs>
                {stackedKeys.length > 0 ? stackedKeys.map((key, idx) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                  </linearGradient>
                )) : (
                  <linearGradient id="gradient-value" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                axisLine={{ stroke: '#E2E8F0' }}
                dataKey={xAxisKey}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                formatter={(value, name) => [`${value?.toLocaleString()} ${unit}`, <span className="capitalize truncate max-w-[200px] block" title={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>]}
              />
              <Legend formatter={(value) => <span className="truncate max-w-[120px] inline-block align-bottom" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} />
              {stackedKeys.length > 0 ? stackedKeys.map((key, idx) => (
                <Area
                  key={key}
                  dataKey={key}
                  fill={`url(#gradient-${key})`}
                  name={key}
                  stackId="1"
                  stroke={colors[idx % colors.length]}
                  type="monotone"
                />
              )) : (
                <Area
                  dataKey="value"
                  fill="url(#gradient-value)"
                  name={description || 'Giá trị'}
                  stroke={colors[0]}
                  strokeWidth={2}
                  type="monotone"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer height={height} width="100%">
            <LineChart data={normalizedData} {...commonProps}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                axisLine={{ stroke: '#E2E8F0' }}
                dataKey={xAxisKey}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                formatter={(value, name) => [`${value?.toLocaleString()} ${unit}`, <span className="capitalize truncate max-w-[200px] block" title={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>]}
              />
              <Legend formatter={(value) => <span className="truncate max-w-[120px] inline-block align-bottom" title={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>} />
              {stackedKeys.length > 0 ? stackedKeys.map((key, idx) => (
                <Line
                  key={key}
                  dataKey={key}
                  dot={{ fill: colors[idx % colors.length], strokeWidth: 2 }}
                  name={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  type="monotone"
                />
              )) : (
                <Line
                  dataKey="value"
                  dot={{ fill: colors[0], strokeWidth: 2 }}
                  name={description || 'Giá trị'}
                  stroke={colors[0]}
                  strokeWidth={2}
                  type="monotone"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Loại biểu đồ không hợp lệ</div>;
    }
  };

  return (
    <Modal
      centered
      className="chart-detail-modal"
      closable={false}
      footer={null}
      open={open}
      styles={{
        body: { padding: 0 },
        content: { borderRadius: 16, overflow: 'hidden' },
      }}
      width={width}
      onCancel={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Maximize2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showExport && (
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-sm"
              disabled={data.length === 0}
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          )}
          {onPin && (
            <button
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isPinned
                ? 'text-emerald-600 bg-emerald-50 cursor-default'
                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                }`}
              disabled={isPinned}
              title={isPinned ? 'Đã ghim' : 'Ghim để so sánh'}
              onClick={() => {
                if (!isPinned) {
                  onPin({ chartId, title, chartType, data, colors, unit, description, stackedKeys, xAxisKey });
                }
              }}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              {isPinned ? 'Đã ghim ✓' : 'Ghim so sánh'}
            </button>
          )}
          <button
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6 bg-white" style={{ height: height + 80 }}>
        {normalizedData.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-lg font-medium">Chưa có dữ liệu</p>
              <p className="text-sm mt-1">Vui lòng chọn khoảng thời gian khác</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {normalizedData.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              Tổng số: <span className="font-semibold text-slate-700">{normalizedData.length}</span> {description || 'mục'}
            </span>
            <span className="text-sm text-slate-500">
              Tổng giá trị: <span className="font-semibold text-slate-700">
                {(() => {
                  // For stacked bar charts, sum all stacked keys across all data points
                  if (chartType === 'stacked-bar' && stackedKeys.length > 0) {
                    return normalizedData.reduce((acc, curr) => {
                      const rowTotal = stackedKeys.reduce((sum, key) => sum + (curr[key] || 0), 0);
                      return acc + rowTotal;
                    }, 0).toLocaleString();
                  }
                  // For regular charts (pie, bar, line, area), use value property
                  return normalizedData.reduce((acc, curr) => acc + (curr.value || 0), 0).toLocaleString();
                })()} {unit}
              </span>
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Dữ liệu cập nhật: {new Date().toLocaleDateString('vi-VN')}
          </span>
        </div>
      )}
    </Modal>
  );
};

export default ChartDetailModal;
