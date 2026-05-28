import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryDetail } from '@/features/resources/hooks/useSummaryRecords';
import { useIsAuthenticated } from '@/features/auth/hooks/useAuthQueries';
import { useCompany } from '@/features/company/hooks/useCompanyQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
  Trash2, Droplets, Wind, AlertTriangle, Activity,
  Recycle, Factory, Home, TestTube, Truck, Biohazard,
  ArrowUpRight,
} from 'lucide-react';
import AutoLineChart from '@/components/ui/AutoLineChart';
import DonutChart from '@/components/ui/DonutChart';
import { EnterpriseMetricCard } from '@/components/dashboard/DashboardComponents';
import { calculateTrend, formatSmallNumbers, formatCompactDashboard, formatFullNumber } from '@/components/dashboard/DashboardLogical';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';

dayjs.extend(customParseFormat);

// --- COMPONENTS ---
const DetailItem = ({ label, value, unit, icon: Icon, color }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 transition-all duration-200 group">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform`}>
        <Icon className="size-6" strokeWidth={2} />
      </div>
      <span className="text-gray-700 font-semibold text-base">{label}</span>
    </div>
    <div className="text-right">
      <span className="block text-gray-900 font-bold text-xl">{value}</span>
      {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
    </div>
  </div>
);

const WastesDashboardCompany = () => {
  const navigate = useNavigate();
  const { user } = useIsAuthenticated();
  const userRole = user?.user?.role;
  const companyId = user?.user?.company_id;
  const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();

  // Check if "All Year" is selected (format: 00/YYYY)
  const isAllYear = date?.startsWith('00/');
  const yearFromDate = isAllYear ? Number(date.split('/')[1]) : null;

  // Convert date from header (MM/YYYY format) to periodKey
  const selectedDate = isAllYear ? null : dayjs(date, 'MM/YYYY', true);
  const selectedYear = isAllYear ? yearFromDate : (selectedDate?.isValid() ? selectedDate.year() : dayjs().year());
  const selectedPeriodKey = selectedDate?.isValid() ? Number(selectedDate.format('YYYYMM')) : Number(dayjs().format('YYYYMM'));

  // Get display text for header
  const getDateDisplayText = () => {
    if (isAllYear) return `Cả năm ${selectedYear}`;
    if (selectedDate?.isValid()) return `Tháng ${selectedDate.format('MM/YYYY')}`;
    return `Tháng ${dayjs().format('MM/YYYY')}`;
  };

  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Quản lý Chất thải tất cả khu công nghiệp' : (isManager ? 'Quản lý Chất thải của khu công nghiệp' : 'Quản lý Chất thải'),
      description: isAdmin ? 'Thống kê và quản lý chất thải toàn thành phố' : (isManager ? 'Thống kê và quản lý chất thải khu công nghiệp' : 'Thống kê và quản lý chất thải'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      {
        key: '/waste',
        title: 'Quản lý Chất thải',
      },
    ]);
  }, [date, userRole]);

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';

  const { data: company = [] } = useCompany(companyId);
  const zoneId = isManager ? user?.user?.zone_id : company?.company?.zone_id;
  const { data: zoneData } = useZone(zoneId, { enabled: !!zoneId });
  const managerZoneLabel = resolveManagerZoneLabel({
    zoneName: zoneData?.zone?.zone_name || user?.user?.zone_name,
    zoneId,
  });

  // Calculate periodKey range
  let periodKeyStart, periodKeyEnd;
  if (isAllYear) {
    periodKeyStart = selectedYear * 100 + 1;
    periodKeyEnd = selectedYear * 100 + 12;
  } else if (selectedDate?.isValid()) {
    periodKeyStart = selectedPeriodKey;
    periodKeyEnd = selectedPeriodKey;
  } else {
    periodKeyStart = Number(dayjs().format('YYYYMM'));
    periodKeyEnd = periodKeyStart;
  }

  const summaryParams = {
    role: userRole,
    periodKeyStart,
    periodKeyEnd,
    include: [6], // Only Waste (Group 6)
    companyId,
    zoneId,
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = {}, isLoading, isFetching } = useSummaryDetail(summaryParams, {
    enabled: !!hasRequiredParams,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Chất thải', managerZoneLabel),
      description: `Theo dõi chất thải của ${managerZoneLabel} - ${getDateDisplayText()}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      {
        key: '/manager/waste',
        title: `Chất thải | ${managerZoneLabel}`,
      },
    ]);
  }, [date, isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  // Get raw waste data from WasteResource
  const wasteRawData = summaryRecords.WasteResource || summaryRecords.waste || [];

  // --- DATA PROCESSING ---
  // Helper to normalize main_group to waste type
  const normalizeWasteType = (mainGroup) => {
    const g = (mainGroup || '').toLowerCase();
    if (g.includes('sinh hoạt') || g === 'do') return 'DO';
    if (g.includes('công nghiệp') || g === 'ind') return 'IND';
    if (g.includes('nguy hại') || g === 'ha') return 'HA';
    if (g.includes('nước thải') || g === 'wwa') return 'WWA';
    if (g.includes('khí thải') || g === 'gasw') return 'GASW';
    return null;
  };

  const { cardData, chartData, wasteTotals } = useMemo(() => {
    const rawData = Array.isArray(wasteRawData) ? wasteRawData : [];

    // Aggregate totals from raw data
    const totals = {
      DO: 0,    // Sinh hoạt
      IND: 0,   // Công nghiệp
      HA: 0,    // Nguy hại
      WWA: 0,   // Nước thải
      GASW: 0,   // Khí thải
    };

    // Also group by month for chart data
    const byMonth = {};
    for (let m = 1; m <= 12; m++) {
      byMonth[m] = { DO: 0, IND: 0, HA: 0, WWA: 0, GASW: 0 };
    }

    rawData.forEach(item => {
      const wasteType = normalizeWasteType(item.main_group);
      const qty = Number(item.quantity) || 0;
      if (!wasteType || qty <= 0) return;

      totals[wasteType] += qty;

      // Extract month from periodKey or createdAt
      let month = null;
      if (item.periodKey) {
        month = Number(String(item.periodKey).slice(4));
      }
      if (month && month >= 1 && month <= 12) {
        byMonth[month][wasteType] += qty;
      }
    });

    const getNum = (val) => Number(val) || 0;

    const basePath = userRole === 'admin' ? '/admin/waste' : (userRole === 'manager' ? '/manager/waste' : '/waste');

    const cards = [
      {
        id: 'solid',
        title: 'Chất thải Rắn',
        icon: Trash2,
        baseColor: '#10B981',
        to: `${basePath}/solid-waste`,
        mainMetrics: [
          {
            label: 'Tổng sinh hoạt',
            value: formatCompactDashboard(getNum(totals.DO)),
            fullValue: formatFullNumber(getNum(totals.DO)),
            unit: 'Tấn',
            trend: null,
          },
          {
            label: 'Tổng công nghiệp',
            value: formatCompactDashboard(getNum(totals.IND)),
            fullValue: formatFullNumber(getNum(totals.IND)),
            unit: 'Tấn',
            trend: null,
          },
          {
            label: 'Tổng nguy hại',
            value: formatCompactDashboard(getNum(totals.HA)),
            fullValue: formatFullNumber(getNum(totals.HA)),
            unit: 'Tấn',
            trend: null,
          },
        ],
      },
      {
        id: 'water',
        title: 'Nước thải',
        icon: Droplets,
        baseColor: '#06B6D4',
        to: `${basePath}/wastewater`,
        mainMetrics: [
          {
            label: 'Tổng lượng',
            value: formatCompactDashboard(getNum(totals.WWA)),
            fullValue: formatFullNumber(getNum(totals.WWA)),
            unit: 'm³',
            trend: null,
          },
        ],
      },
      {
        id: 'gas',
        title: 'Khí thải',
        icon: Wind,
        baseColor: '#64748B',
        to: `${basePath}/gas-waste`,
        mainMetrics: [
          {
            label: 'Tổng lượng',
            value: formatCompactDashboard(getNum(totals.GASW)),
            fullValue: formatFullNumber(getNum(totals.GASW)),
            unit: 'mg/l',
            trend: null,
          },
        ],
      },
    ];

    // Process Chart Data for each month
    const chartByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const mData = byMonth[m];
      chartByMonth[m] = [
        { Name: 'Sinh hoạt', Value: getNum(mData.DO), Color: '#10B981', Type: 'solid' },
        { Name: 'Công nghiệp', Value: getNum(mData.IND), Color: '#34D399', Type: 'solid' },
        { Name: 'Nguy hại', Value: getNum(mData.HA), Color: '#F87171', Type: 'solid' },
        { Name: 'Nước thải', Value: getNum(mData.WWA), Color: '#06B6D4', Type: 'water' },
        { Name: 'Khí thải', Value: getNum(mData.GASW), Color: '#94A3B8', Type: 'gas' },
      ];
    }

    return { cardData: cards, chartData: chartByMonth, wasteTotals: totals };
  }, [wasteRawData]);

  const [activeTab, setActiveTab] = useState('solid');

  const getChartDataForTab = (tab) => {
    const filteredByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const items = chartData[m] || [];
      // Special case: 'hazardous' is a subset of 'solid' data structurally in some contexts,
      // but we mapped it with Type='hazardous' above for easy filtering.
      filteredByMonth[m] = items.filter(i => i.Type === tab);
    }
    return filteredByMonth;
  };

  const tabConfig = {
    solid: { color: 'emerald', unit: 'Tấn' },
    water: { color: 'cyan', unit: 'm³' },
    gas: { color: 'slate', unit: 'mg/l' },
  };

  const pieChartData = useMemo(() => {
    const getNum = (val) => Number(val) || 0;

    switch (activeTab) {
    case 'solid':
      return {
        data: [
          { Name: 'Sinh hoạt', Value: getNum(wasteTotals.DO), Color: '#10B981' },
          { Name: 'Công nghiệp', Value: getNum(wasteTotals.IND), Color: '#34D399' },
          { Name: 'Nguy hại', Value: getNum(wasteTotals.HA), Color: '#F87171' },
        ].filter(d => d.Value > 0),
        total: getNum(wasteTotals.DO) + getNum(wasteTotals.IND) + getNum(wasteTotals.HA),
        unit: 'Tấn',
      };
    case 'water':
      return {
        data: [
          { Name: 'Nước thải', Value: getNum(wasteTotals.WWA), Color: '#06B6D4' },
        ].filter(d => d.Value > 0),
        total: getNum(wasteTotals.WWA),
        unit: 'm³',
      };
    case 'gas':
      return {
        data: [
          { Name: 'Khí thải', Value: getNum(wasteTotals.GASW), Color: '#94A3B8' },
        ].filter(d => d.Value > 0),
        total: getNum(wasteTotals.GASW),
        unit: wasteTotals.unit_gas_waste ?? 'mg/l',
      };
    default: return { data: [], total: 0, unit: '' };
    }
  }, [activeTab, wasteTotals]);

  const renderSideDetails = () => {
    const getNum = (val) => Number(val) || 0;

    switch (activeTab) {
    case 'solid':
      return (
        <>
          <DetailItem color="emerald" icon={Home} label="Sinh hoạt" unit="Tấn" value={formatSmallNumbers(getNum(wasteTotals.DO))} />
          <DetailItem color="teal" icon={Factory} label="Công nghiệp" unit="Tấn" value={formatSmallNumbers(getNum(wasteTotals.IND))} />
          <DetailItem color="red" icon={Biohazard} label="Nguy hại" unit="Tấn" value={formatSmallNumbers(getNum(wasteTotals.HA))} />
        </>
      );
    case 'water':
      return (
        <>
          <DetailItem color="cyan" icon={Droplets} label="Tổng Nước thải" unit="m³" value={formatSmallNumbers(getNum(wasteTotals.WWA))} />
        </>
      );
    case 'gas':
      return (
        <>
          <DetailItem color="slate" icon={Wind} label="Tổng Khí thải" unit={wasteTotals.unit_gas_waste ?? 'mg/l'} value={formatSmallNumbers(getNum(wasteTotals.GASW))} />
        </>
      );
    default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 lg:gap-3 pt-1 px-2 pb-1 overflow-y-auto">
      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3 shrink-0">
        {cardData.map((card) => (
          <div
            key={card.id}
            className={`group/card cursor-pointer h-full transition-all duration-300 transform rounded-3xl overflow-hidden relative ${activeTab === card.id ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02] z-10' : 'hover:scale-[1.02] hover:shadow-lg opacity-80 hover:opacity-100'}`}
            onClick={(e) => {
              e.preventDefault(); setActiveTab(card.id);
            }}
          >
            <div className="pointer-events-none h-full">
              <EnterpriseMetricCard {...card} to={undefined} />
            </div>

            {/* Action Button: View Detail */}
            <div className="absolute top-4 right-4 z-30">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 shadow-sm transition-all duration-300 group/btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(card.to, { state: { shouldRefresh: true } });
                }}
              >
                <ArrowUpRight className="size-3.5 group-hover/btn:rotate-12 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 2. MAIN CONTENT SPLIT */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 overflow-hidden">
        {/* LEFT: CHART AREA */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="size-5 text-gray-400" />
              {isAllYear ? `Biểu đồ theo dõi năm ${selectedYear}` : `Tổng quan tháng ${selectedDate?.format('MM/YYYY')}`}
            </h3>
            <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                            Chế độ xem: {cardData.find(c => c.id === activeTab)?.title}
            </span>
          </div>

          <div className="flex-1 w-full relative">
            {isAllYear ? (
              <AutoLineChart
                currentMonth={dayjs().month() + 1}
                dataByMonth={getChartDataForTab(activeTab)}
                unit={tabConfig[activeTab]?.unit}
              />
            ) : (
              <div className="h-full w-full">
                <DonutChart
                  data={pieChartData.data}
                  showLegend={true}
                  totalValue={pieChartData.total}
                  unit={pieChartData.unit}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: DETAILS PANEL */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-800">Chi tiết {cardData.find(c => c.id === activeTab)?.title}</h3>
            <p className="text-sm text-gray-500">{getDateDisplayText()}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {renderSideDetails()}
          </div>

          {userRole !== 'admin' && userRole !== 'manager' && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
              <button
                className="w-full py-2.5 rounded-xl bg-[#4E5BA6] text-white font-semibold text-sm hover:bg-[#00c53e] transition-all shadow-md"
                onClick={() => navigate('/resources/resources-list')}
              >
                                Đi đến trang khai báo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WastesDashboardCompany;
