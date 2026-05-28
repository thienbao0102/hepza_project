import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { exportToStyledExcel } from '@utils/excelExport';
import TimeFilter from '@features/dashboard/components/TimeFilter';
import StatusCard from '@features/dashboard/components/StatusCard';
import Widget from '@components/ui/Widget';
import Barchart from '@components/ui/BarChart';
import { DataActions } from '@components/ui/Button';
import {
  Recycle,
  Waves,
  Flame,
  Trash,
  Volleyball,
  FlaskConical,
} from 'lucide-react';
import AutoLineChart from '@components/ui/AutoLineChart';
import DonutChart from '@components/ui/DonutChart';
import toast from '@/utils/toast';

// === 1. Hàm generate dummy data theo ngày ===
const generateDailyData = () => {
  const data = [];
  const today = dayjs();
  for (let i = 0; i < 365; i++) {
    const date = today.subtract(i, 'day');
    data.push({
      date: date.format('YYYY-MM-DD'),
      'Zone 1': 10000 + Math.random() * 5000,
      'Zone 2': 12000 + Math.random() * 5000,
      'Zone 3': 8000 + Math.random() * 5000,
      'Zone 4': 9000 + Math.random() * 5000,
      'Chất đốt': 1000 + Math.random() * 500,
      'Chất thải': 25000 + Math.random() * 5000,
      'Nước': 10000 + Math.random() * 3000,
      'Vải': 800 + Math.random() * 300,
      'Hóa chất': 20000 + Math.random() * 5000,
      'Tái chế': 9000 + Math.random() * 2000,
    });
  }
  return data.reverse();
};

const fullDailyData = generateDailyData();

const Dashboard = () => {
  const [selectedTime, setSelectedTime] = useState('12T');
  const [chartAnimationDebounce, setChartAnimationDebounce] = useState(false);

  const [statusData, setStatusData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [lineData, setLineData] = useState([]);

  const handleImport = () => toast.info('Nhập dữ liệu', 'Tính năng đang phát triển.');
  const handleExport = async () => {
    try {
      let exportData = fullDailyData;
      if (selectedTime === '7N') {
        exportData = fullDailyData.slice(-7);
      } else if (selectedTime === '30N') {
        exportData = fullDailyData.slice(-30);
      }

      const formattedData = exportData.map(d => ({
        'Ngày': dayjs(d.date).format('DD/MM/YYYY'),
        'Khu vực 1': Math.round(d['Zone 1']),
        'Khu vực 2': Math.round(d['Zone 2']),
        'Khu vực 3': Math.round(d['Zone 3']),
        'Khu vực 4': Math.round(d['Zone 4']),
        'Chất thải': Math.round(d['Chất thải']),
      }));

      await exportToStyledExcel({
        sheets: [{ sheetName: 'Chat_Thai', data: formattedData }],
        fileName: `Tong_hop_chat_thai_${dayjs().format('DDMMYYYY')}.xlsx`,
      });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi xuất file', 'Đã xảy ra lỗi khi xuất file Excel.');
    }
  };

  // === 2. useEffect filter dữ liệu động ===
  useEffect(() => {
    let filteredData = fullDailyData;

    if (selectedTime === '7N') {
      filteredData = fullDailyData.slice(-7);
    } else if (selectedTime === '30N') {
      filteredData = fullDailyData.slice(-30);
    } else if (selectedTime === '12T') {
      filteredData = fullDailyData;
    }

    // ---- StatusCard ----
    const latest = filteredData[filteredData.length - 1];
    const sparklineLength = Math.min(filteredData.length, 30);
    const sparklineStep = Math.ceil(filteredData.length / sparklineLength);
    const statusArr = [
      {
        name: 'Chất đốt',
        quantity: Math.round(latest['Chất đốt']).toString(),
        percent: '+5%',
        trend: 'up',
        Icon: Flame,
        color: '#f97316',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Chất đốt'] })),
      },
      {
        name: 'Chất thải',
        quantity: Math.round(latest['Chất thải']).toString(),
        percent: '+3%',
        trend: 'up',
        Icon: Trash,
        color: '#ef4444',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Chất thải'] })),
      },
      {
        name: 'Nước',
        quantity: Math.round(latest['Nước']).toString(),
        percent: '-2%',
        trend: 'down',
        Icon: Waves,
        color: '#14b8a6',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Nước'] })),
      },
      {
        name: 'Vải',
        quantity: Math.round(latest['Vải']).toString(),
        percent: '+1%',
        trend: 'up',
        Icon: Volleyball,
        color: '#3b82f6',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Vải'] })),
      },
      {
        name: 'Hóa chất',
        quantity: Math.round(latest['Hóa chất']).toString(),
        percent: '+4%',
        trend: 'up',
        Icon: FlaskConical,
        color: '#f59e0b',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Hóa chất'] })),
      },
      {
        name: 'Tái chế',
        quantity: Math.round(latest['Tái chế']).toString(),
        percent: '+2%',
        trend: 'up',
        Icon: Recycle,
        color: '#10b981',
        sparklineData: filteredData
          .filter((_, i) => i % sparklineStep === 0)
          .map((d, i) => ({ name: i.toString(), value: d['Tái chế'] })),
      },
    ];

    setStatusData(statusArr);

    const quarterlyData = {};
    filteredData.forEach(d => {
      const quarter = Math.floor((dayjs(d.date).month()) / 3) + 1 + '/' + dayjs(d.date).year();
      if (!quarterlyData[quarter]) quarterlyData[quarter] = { name: quarter, 'Zone 1': 0, 'Zone 2': 0, 'Zone 3': 0, 'Zone 4': 0, count: 0 };
      ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].forEach(z => {
        quarterlyData[quarter][z] += d[z];
      });
      quarterlyData[quarter].count += 1;
    });

    const aggregatedQuarterly = Object.values(quarterlyData).map(q => ({
      name: q.name,
      'Zone 1': Math.round(q['Zone 1'] / q.count),
      'Zone 2': Math.round(q['Zone 2'] / q.count),
      'Zone 3': Math.round(q['Zone 3'] / q.count),
      'Zone 4': Math.round(q['Zone 4'] / q.count),
    }));
    setBarData(aggregatedQuarterly);
    // ---- Pie chart ----
    const latestPie = [
      { name: 'Nước', value: latest['Nước'] },
      { name: 'Chất thải', value: latest['Chất thải'] },
      { name: 'Tái chế', value: latest['Tái chế'] },
    ];
    setPieData(latestPie);

    // ---- Line chart ---- (gom theo tháng)
    const monthlyData = {};
    filteredData.forEach((d) => {
      const month = dayjs(d.date).format('MM/YYYY');
      if (!monthlyData[month]) {
        monthlyData[month] = {
          name: month,
          'Zone 1': 0,
          'Zone 2': 0,
          'Zone 3': 0,
          'Zone 4': 0,
          count: 0,
        };
      }
      monthlyData[month]['Zone 1'] += d['Zone 1'];
      monthlyData[month]['Zone 2'] += d['Zone 2'];
      monthlyData[month]['Zone 3'] += d['Zone 3'];
      monthlyData[month]['Zone 4'] += d['Zone 4'];
      monthlyData[month].count += 1;
    });

    const aggregatedLineData = Object.values(monthlyData).map((m) => ({
      name: m.name,
      'Zone 1': Math.round(m['Zone 1'] / m.count),
      'Zone 2': Math.round(m['Zone 2'] / m.count),
      'Zone 3': Math.round(m['Zone 3'] / m.count),
      'Zone 4': Math.round(m['Zone 4'] / m.count),
    }));

    setLineData(aggregatedLineData);

    setTimeout(() => setChartAnimationDebounce(500), 1000);
  }, [selectedTime]);

  return (
    <div className="grid gap-3 p-3 pl-3 h-screen">
      {/* Header */}
      <div className="col-span-full rounded flex justify-between items-center">
        <div className="Title flex flex-col justify-center">
          <h1 className="PageName text-2xl font-semibold">Chất thải</h1>
        </div>
        <DataActions onExport={handleExport} onImport={handleImport} />
      </div>

      {/* Time filter */}
      <div className="col-span-full rounded">
        <TimeFilter selectedFilter={selectedTime} onFilterChange={setSelectedTime} />
      </div>

      {/* Status Cards */}
      <div className="flex flex-wrap gap-3">
        {statusData.map((item) => (
          <div key={item.name} className="basis-[200px] grow max-w-[400px] rounded">
            <StatusCard
              color={item.color}
              icon={item.Icon}
              name={item.name}
              percent={item.percent}
              quantity={item.quantity}
              sparklineData={item.sparklineData} // truyền dữ liệu sparkline
              trend={item.trend}
            />
          </div>
        ))}
      </div>

      {/* Bar chart + Pie chart */}
      <div className="flex flex-wrap gap-3">
        <div className="basis-1/2 grow rounded flex flex-wrap gap-3 !h-500px">
          {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map((zone, i) => {
            const zoneData = barData.map(d => ({
              name: d.name,
              'Sản lượng': Math.max(
                0,
                d[zone] + Math.round(Math.random() * 10000 - 5000), // dao động ±1000
              ),
              percent: Math.round(Math.random() * 10),
            }));

            return (
              <Widget
                key={zone}
                className="!w-[40%] basis-[100%] md:basis-[40%] grow max-h-[200px]"
                description="Đơn vị: kWh"
                title={`Bảng tiêu thụ điện ${zone}`}
              >
                <Barchart
                  barColors={
                    zone === 'Zone 1' ? ['#82ca9d'] :
                      zone === 'Zone 2' ? ['#8884d8'] :
                        zone === 'Zone 3' ? ['#f59e0b'] :
                          ['#ef4444']
                  }
                  data={zoneData}
                  debounce={chartAnimationDebounce}
                />
              </Widget>
            );
          })}
        </div>
        <div className="basis-[500px] grow rounded">
          <Widget description="Đơn vị: kWh" title="Biểu đồ tiêu thụ nước & chất thải">
            <DonutChart
              colors={['#82ca9d', '#8884d8', '#ffc658']}
              data={pieData}
              totalValue={pieData.reduce((sum, item) => sum + item.value, 0)} // tính tổng
            />
          </Widget>
        </div>
      </div>

      {/* Line chart */}
      <div className="col-span-full text-center rounded">
        <Widget
          className="min-h-[200px]"
          description="Thống kê số lượng thành phẩm theo ngày"
          title="Biểu đồ sản xuất"
        >
          <AutoLineChart
            showGrid
            showLegend
            showTooltip
            data={lineData}
            debounce={chartAnimationDebounce}
            lines={[
              { dataKey: 'Zone 1', stroke: '#3b82f6', name: 'Zone 1' },
              { dataKey: 'Zone 2', stroke: '#10b981', name: 'Zone 2' },
              { dataKey: 'Zone 3', stroke: '#f59e0b', name: 'Zone 3' },
              { dataKey: 'Zone 4', stroke: '#ef4444', name: 'Zone 4' },
            ]}
            xAxisDataKey="name"
          />
        </Widget>
      </div>
    </div>
  );
};

export default Dashboard;
