import React, { useState, useEffect } from 'react';
import { useAuth } from '@app/providers/auth/AuthProvider';
import TimeFilter from '@features/dashboard/components/TimeFilter';
import StatusCard from '@features/dashboard/components/StatusCard';
import Widget from '@components/ui/Widget';
import Barchart from '@components/ui/BarChart';
import { DataActions } from '@components/ui/Button';
import AutoLineChart from '@components/ui/AutoLineChart';
import DonutChart from '@components/ui/DonutChart';
import { Cloud, Recycle, Leaf, Bolt, Droplets, Package, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Users, Building, Factory, Wind, Zap, Settings, Trash2, CloudCog } from 'lucide-react';
import dayjs from 'dayjs';
import { useSummaryRecords } from '@features/resources/hooks/useSummaryRecords';
import { exportToStyledExcel } from '@utils/excelExport';
import toast from '@/utils/toast';

const cardColors = {
  'Điện (MWh)': '#3b82f6',
  'Nước (m³)': '#14b8a6',
  'Chất thải': '#ef4444',
  'CO₂ phát thải': '#f97316',
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: dayjs('2024-01-01'),
    endDate: dayjs('2024-02-01').endOf('month'),
    filterType: 'custom',
  });

  const { data: apiData = [], isLoading, error } = useSummaryRecords({
    role: user?.role,
    companyId: user?.company_id,
    periodKeyStart: dateRange.startDate?.format('YYYYMM'),
    periodKeyEnd: dateRange.endDate?.format('YYYYMM'),
  });

  // Kiểm tra có dữ liệu hay không
  const hasNoData = !isLoading && (!apiData || apiData.length === 0);

  const [displayData, setDisplayData] = useState({
    status: [],
    waste: [],
    co2: { data: [], total: 0 },
    solutions: { savingAndManagement: [], emissionReduction: [] },
    daily: [],
  });
  const [chartViewMode, setChartViewMode] = useState('monthly'); // 'monthly' or 'daily'

  useEffect(() => {
    if (!apiData) return;

    const totals = apiData.reduce((acc, record) => {
      // Fuels
      acc.total_electricity += record.fuels?.total_electricity || 0;
      acc.total_water += record.fuels?.total_water || 0;
      acc.total_combustion += record.fuels?.total_combustion || 0;
      acc.total_combustion_gas += record.fuels?.total_combustion_gas || 0;
      acc.total_other_fuels += record.fuels?.total_other_fuels || 0;
      acc.total_other_fuels_liquid += record.fuels?.total_other_fuels_liquid || 0;

      // Waste
      acc.total_waste += record.waste?.total_waste || 0;
      acc.total_waste_reused += record.waste?.total_waste_reused || 0;
      acc.total_waste_recycled += record.waste?.total_waste_recycled || 0;
      acc.total_waste_contracted += record.waste?.total_waste_contracted || 0;
      acc.total_hazardous_waste += record.waste?.total_hazardous_waste || 0;
      acc.total_domestic_waste += record.waste?.total_domestic_waste || 0;

      // Emissions
      acc.total_co2 += record.emissions?.total_co2 || 0;
      acc.total_co2_from_energy += record.emissions?.total_co2_from_energy || 0;
      acc.total_co2_from_electricity += record.emissions?.total_co2_from_electricity || 0;
      acc.total_co2_from_combustion += record.emissions?.total_co2_from_combustion || 0;
      acc.total_co2_from_combustion_liquid += record.emissions?.total_co2_from_combustion_liquid || 0;
      acc.total_co2_from_combustion_gas += record.emissions?.total_co2_from_combustion_gas || 0;
      acc.total_co2_from_water += record.emissions?.total_co2_from_water || 0;

      return acc;
    }, {
      total_electricity: 0, total_water: 0, total_combustion: 0,
      total_combustion_gas: 0, total_other_fuels: 0, total_other_fuels_liquid: 0,
      total_waste: 0, total_waste_reused: 0, total_waste_recycled: 0,
      total_waste_contracted: 0, total_hazardous_waste: 0, total_domestic_waste: 0,
      total_co2: 0, total_co2_from_energy: 0, total_co2_from_electricity: 0,
      total_co2_from_combustion: 0, total_co2_from_combustion_liquid: 0,
      total_co2_from_combustion_gas: 0, total_co2_from_water: 0,
    });

    const newStatusData = [
      {
        name: 'Điện',
        quantity: Math.round(totals.total_electricity).toLocaleString('de-DE'),
        unit: '(kWh)', Icon: Bolt, color: '#3b82f6',
      },
      {
        name: 'Nước',
        quantity: Math.round(totals.total_water).toLocaleString('de-DE'),
        unit: '(m³)', Icon: Droplets, color: '#14b8a6',
      },
      {
        name: 'Nhiên liệu đốt',
        quantity: Math.round(totals.total_combustion).toLocaleString('de-DE'),
        unit: '(tấn)', Icon: Factory, color: '#f59e0b',
      },
      {
        name: 'Khí đốt',
        quantity: Math.round(totals.total_combustion_gas).toLocaleString('de-DE'),
        unit: '(m³)', Icon: Wind, color: '#84cc16',
      },
      {
        name: 'Nhiên liệu khác (rắn)',
        quantity: Math.round(totals.total_other_fuels).toLocaleString('de-DE'),
        unit: '(tấn)', Icon: Package, color: '#a16207',
      },
      {
        name: 'Nhiên liệu khác (lỏng)',
        quantity: Math.round(totals.total_other_fuels_liquid).toLocaleString('de-DE'),
        unit: '(lít)', Icon: Recycle, color: '#78716c',
      },
      {
        name: 'Tổng chất thải',
        quantity: Math.round(totals.total_waste).toLocaleString('de-DE'),
        unit: '(tấn)', Icon: Trash2, color: '#ef4444',
      },
      {
        name: 'Tổng CO₂ phát thải',
        quantity: Math.round(totals.total_co2).toLocaleString('de-DE'),
        unit: '(tấn)', Icon: Cloud, color: '#f97316',
      },
    ];

    const newWasteData = [
      { name: 'Tái sử dụng', 'Sản lượng': Math.round(totals.total_waste_reused || 0) },
      { name: 'Tái chế', 'Sản lượng': Math.round(totals.total_waste_recycled || 0) },
      { name: 'Hợp đồng', 'Sản lượng': Math.round(totals.total_waste_contracted || 0) },
      { name: 'Nguy hại', 'Sản lượng': Math.round(totals.total_hazardous_waste || 0) },
      { name: 'Sinh hoạt', 'Sản lượng': Math.round(totals.total_domestic_waste || 0) },
    ];

    const newCo2Data = [
      { name: 'Từ năng lượng', value: Math.round(totals.total_co2_from_energy || 0) },
      { name: 'Từ điện', value: Math.round(totals.total_co2_from_electricity || 0) },
      { name: 'Từ đốt cháy', value: Math.round(totals.total_co2_from_combustion || 0) },
      { name: 'Từ đốt lỏng', value: Math.round(totals.total_co2_from_combustion_liquid || 0) },
      { name: 'Từ đốt khí', value: Math.round(totals.total_co2_from_combustion_gas || 0) },
      { name: 'Từ nước', value: Math.round(totals.total_co2_from_water || 0) },
    ];

    const totalCo2 = newCo2Data.reduce((sum, item) => sum + item.value, 0);

    // Dummy solutions data (can be made dynamic later)
    const appliedSolutionsData = {
      savingAndManagement: [
        'Tối ưu hóa quy trình sản xuất để giảm tiêu thụ nguyên vật liệu.',
        'Sử dụng hệ thống chiếu sáng LED tiết kiệm năng lượng.',
        'Lắp đặt hệ thống thu hồi và tái sử dụng nước mưa.',
      ],
      emissionReduction: [
        'Phân loại chất thải tại nguồn để tăng tỷ lệ tái chế.',
        'Lắp đặt hệ thống xử lý khí thải.',
        'Tái sử dụng bao bì và vật liệu đóng gói.',
      ],
    };

    // Convert periodKey to month name only (e.g., 'Tháng 6')
    const getMonthName = (periodKey) => {
      const month = String(periodKey).slice(-2); // Get last 2 digits for month
      const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
      ];
      return monthNames[parseInt(month, 10) - 1];
    };

    const lineData = apiData
      .sort((a, b) => a.periodKey - b.periodKey)
      .map(record => ({
        name: getMonthName(record.periodKey),
        'Điện (kWh)': record.fuels?.total_electricity || 0,
        'Nước (m³)': record.fuels?.total_water || 0,
      }));

    setDisplayData({
      status: newStatusData,
      waste: newWasteData,
      co2: { data: newCo2Data, total: totalCo2 },
      solutions: appliedSolutionsData,
      line: lineData, // Use the new pre-processed data
    });

    // Chỉ chạy lại khi apiData thay đổi
    // Sử dụng JSON.stringify để so sánh sâu
  }, [JSON.stringify(apiData), dateRange.filterType]);

  // Handler cho nhập/xuất dữ liệu
  const handleImport = () => toast.info('Nhập dữ liệu', 'Tính năng đang phát triển.');
  const handleExport = async () => {
    if (!apiData || apiData.length === 0) {
      toast.warning('Không có dữ liệu', 'Không có dữ liệu để xuất.');
      return;
    }
    try {
      const formattedData = apiData.map(record => ({
        'Kỳ tính toán': String(record.periodKey),
        'Điện (kWh)': record.fuels?.total_electricity || 0,
        'Nước (m3)': record.fuels?.total_water || 0,
        'Chất đốt (tấn)': record.fuels?.total_combustion || 0,
        'Khí đốt (m3)': record.fuels?.total_combustion_gas || 0,
        'Nhiên liệu rắn (tấn)': record.fuels?.total_other_fuels || 0,
        'Nhiên liệu lỏng (lít)': record.fuels?.total_other_fuels_liquid || 0,
        'Chất thải (tấn)': record.waste?.total_waste || 0,
        'Carbon (tấn)': record.emissions?.total_co2 || 0,
      }));

      await exportToStyledExcel({
        sheets: [{ sheetName: 'Dashboard', data: formattedData }],
        fileName: `Tong_hop_Dashboard_${dayjs().format('DDMMYYYY')}.xlsx`,
      });
    } catch (error) {
      console.error(error);
      toast.error('Lỗi xuất file', 'Đã xảy ra lỗi khi xuất file Excel.');
    }
  };

  // Chỉ hiển thị dashboard này cho role 'company'
  if (user?.role !== 'company') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Chào mừng đến với Dashboard</h1>
        <p>Nội dung cho vai trò của bạn sẽ được cập nhật sớm.</p>
      </div>
    );
  }

  // Hiển thị loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error && !error.message.includes('Summary record not found')) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-red-700">
                                    Chưa có dữ liệu. Vui lòng thử lại sau.
                </p>
                <button
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => window.location.reload()}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                                    Tải lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị thông báo không có dữ liệu
  if (hasNoData) {
    return (
      <div className="p-4">
        <TimeFilter initialDateRange={dateRange} onFilterChange={setDateRange} />
        <div className="mt-4 p-8 bg-white rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold">Không có dữ liệu</h2>
          <p className="text-gray-500 mt-2">Không tìm thấy bản ghi tổng hợp nào trong khoảng thời gian đã chọn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen pb-24 overflow-y-auto">
      <div className="grid grid-cols-12 gap-4">
        {/* Header */}
        <div className="col-span-12 flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-semibold">Tổng quan</h1>
          </div>
          <DataActions onExport={handleExport} onImport={handleImport} />
        </div>

        {/* Time Filter */}
        <div className="col-span-12">
          <TimeFilter initialDateRange={dateRange} onFilterChange={setDateRange} />
        </div>

        {/* Status Cards */}
        <div className="col-span-12 grid grid-cols-12 gap-4">
          {displayData.status.map((item, index) => (
            <div key={index} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
              <StatusCard
                color={item.color}
                icon={item.Icon}
                name={item.name}
                quantity={item.quantity}
                unit={item.unit}
              />
            </div>
          ))}
        </div>

        {/* Conditional Chart for Electricity and Water */}
        <div className="col-span-12">
          <Widget className="h-80" title={chartViewMode === 'daily' ? 'Tiêu thụ Điện & Nước (Theo ngày)' : 'Tiêu thụ Điện & Nước (Theo tháng)'}>
            <AutoLineChart
              data={displayData.line}
              lines={[
                { dataKey: 'Điện (kWh)', stroke: cardColors['Điện (MWh)'], name: 'Điện (kWh)' },
                { dataKey: 'Nước (m³)', stroke: cardColors['Nước (m³)'], name: 'Nước (m³)' },
              ]}
              xAxisDataKey="name"
            />
          </Widget>
        </div>

        {/* Bottom Charts */}
        <div className="col-span-12 md:col-span-7">
          <Widget className="h-80" title="Phân loại Chất thải (tấn)">
            <Barchart data={displayData.waste} />
          </Widget>
        </div>

        <div className="col-span-12 md:col-span-5">
          <Widget className="h-80" title="Phát thải CO₂ theo Nguồn (tấn)">
            <DonutChart
              colors={['#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#d946ef']}
              data={displayData.co2.data}
              totalValue={displayData.co2.total}
            />
          </Widget>
        </div>

        {/* Applied Solutions Section */}
        <div className="col-span-12">
          <Widget title="Các giải pháp đã áp dụng">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 px-4">
              {/* Saving and Management Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                                    Tiết kiệm và quản lý hiệu quả
                </h3>
                <div className="space-y-2">
                  {displayData.solutions.savingAndManagement.map((solution, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 w-5 h-5 text-blue-500">
                        {index === 0 && <Settings size={20} />}
                        {index === 1 && <Bolt size={20} />}
                        {index === 2 && <Droplets size={20} />}
                      </div>
                      <p className="text-sm text-gray-700">{solution}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Emission Reduction Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wind className="w-5 h-5 text-green-500" />
                                    Giảm phát thải
                </h3>
                <div className="space-y-2">
                  {displayData.solutions.emissionReduction.map((solution, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 w-5 h-5 text-green-600">
                        {index === 0 && <Recycle size={20} />}
                        {index === 1 && <CloudCog size={20} />}
                        {index === 2 && <Trash2 size={20} />}
                      </div>
                      <p className="text-sm text-gray-700">{solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
