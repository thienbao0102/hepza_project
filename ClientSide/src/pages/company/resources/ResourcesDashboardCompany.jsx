import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryRecordByPeriodkey } from '@/features/resources/hooks/useSummaryRecords';
import { useIsAuthenticated } from '@/features/auth/hooks/useAuthQueries';
import { useCompany } from '@/features/company/hooks/useCompanyQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
  Pickaxe, FlaskConical, Zap, Droplets, Flame,
  Box, Layers, Archive, TreePine, Recycle,
  Activity, Atom, Cloud, Fuel, Wheat, CircleDot,
  Hammer, Cylinder, Leaf, Wind, ArrowUpRight,
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

// --- MAIN PAGE ---
const ResourcesDashboardCompany = () => {
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
      title: isAdmin ? 'Tài nguyên sử dụng tất cả khu công nghiệp' : (isManager ? 'Tài nguyên sử dụng của khu công nghiệp' : 'Tài nguyên sử dụng'),
      description: `Theo dõi xu hướng và chỉ số tài nguyên - ${getDateDisplayText()}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/resources', title: 'Quản lý Tài nguyên' },
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
    include: [2, 3, 4],
    companyId,
    zoneId,
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [] } = useSummaryRecordByPeriodkey(summaryParams, { enabled: !!hasRequiredParams });

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Tài nguyên sử dụng', managerZoneLabel),
      description: `Theo dõi xu hướng và chỉ số tài nguyên của ${managerZoneLabel} - ${getDateDisplayText()}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/resources', title: `Tài nguyên` },
    ]);
  }, [date, isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  // --- DATA PROCESSING ---
  const { cardData, chartData } = useMemo(() => {
    const recordsArr = Array.isArray(summaryRecords) ? summaryRecords : [];

    // Helper to aggregate records
    const aggregateRecords = (records) => {
      const aggregated = { input_materials: {}, input_chemicals: {}, fuels: {} };
      records.forEach(record => {
        ['input_materials', 'input_chemicals', 'fuels'].forEach(section => {
          const data = record[section] ?? {};
          Object.keys(data).forEach(key => {
            if (key.startsWith('total_') && typeof data[key] === 'number') {
              aggregated[section][key] = (aggregated[section][key] || 0) + data[key];
            }
          });
        });
      });
      return aggregated;
    };

    let currentMonthData = {};
    const previousMonthData = {}; // Placeholder if needed for trends

    if (recordsArr.length > 0) {
      if (isAllYear) {
        currentMonthData = aggregateRecords(recordsArr);
      } else {
        currentMonthData = recordsArr[0] || {};
      }
    }

    const getNum = (val) => Number(val) || 0;
    const curMat = currentMonthData.input_materials ?? {};
    const curChem = currentMonthData.input_chemicals ?? {};
    const curFuel = currentMonthData.fuels ?? {};

    // Trends could be fetched by separate query if single month, or just left at 0 for now
    const prevMat = {};
    const prevChem = {};
    const prevFuel = {};

    const basePath = userRole === 'admin' ? '/admin/resources' : (userRole === 'manager' ? '/manager/resources' : '/resources');

    const cards = [
      {
        id: 'materials',
        title: 'Nguyên Vật liệu',
        icon: Pickaxe,
        baseColor: '#4E5BA6',
        to: `${basePath}/materialResources`,
        mainMetrics: [
          {
            label: 'Tổng',
            value: formatCompactDashboard(getNum(curMat.total_materials)),
            fullValue: formatFullNumber(getNum(curMat.total_materials)),
            unit: curMat.unit_material ?? 'Tấn',
            trend: calculateTrend(curMat.total_materials, prevMat.total_materials),
          },
        ],
      },
      {
        id: 'energy',
        title: 'Điện năng tiêu thụ',
        icon: Zap,
        baseColor: '#FF9D00',
        to: `${basePath}/electricalResources`,
        mainMetrics: [
          {
            label: 'Tổng công suất',
            value: formatCompactDashboard(getNum(curFuel.total_electricity)),
            fullValue: formatFullNumber(getNum(curFuel.total_electricity)),
            unit: curFuel.unit_fuel_el ?? 'kWh',
            trend: calculateTrend(curFuel.total_electricity, prevFuel.total_electricity),
          },
          {
            label: 'Điện lưới',
            value: formatCompactDashboard(getNum(curFuel.total_electricity_grid)),
            fullValue: formatFullNumber(getNum(curFuel.total_electricity_grid)),
            unit: curFuel.unit_fuel_el ?? 'kWh',
            trend: calculateTrend(curFuel.total_electricity_grid, prevFuel.total_electricity_grid),
          },
          {
            label: 'Tái tạo',
            value: formatCompactDashboard(getNum(curFuel.total_electricity_renewable)),
            fullValue: formatFullNumber(getNum(curFuel.total_electricity_renewable)),
            unit: curFuel.unit_fuel_el ?? 'kWh',
            trend: calculateTrend(curFuel.total_electricity_renewable, prevFuel.total_electricity_renewable),
          },
        ],
      },
      {
        id: 'water',
        title: 'Nước sử dụng',
        icon: Droplets,
        baseColor: '#00A6FF',
        to: `${basePath}/waterResources`,
        mainMetrics: [
          {
            label: 'Tổng',
            value: formatCompactDashboard(getNum(curFuel.total_water)),
            fullValue: formatFullNumber(getNum(curFuel.total_water)),
            unit: curFuel.unit_fuel_wa ?? 'm³',
            trend: calculateTrend(curFuel.total_water, prevFuel.total_water),
          },
        ],
      },
      {
        id: 'chemicals',
        title: 'Hóa chất sử dụng',
        icon: FlaskConical,
        baseColor: '#9CB000',
        to: `${basePath}/chemicalResources`,
        mainMetrics: [
          {
            label: 'Dạng Rắn',
            value: formatCompactDashboard(getNum(curChem.total_chemicals_kg)),
            fullValue: formatFullNumber(getNum(curChem.total_chemicals_kg)),
            unit: curChem.unit_chemical_kg ?? 'kg',
            trend: calculateTrend(curChem.total_chemicals_kg, prevChem.total_chemicals_kg),
          },
          {
            label: 'Dạng Lỏng',
            value: formatCompactDashboard(getNum(curChem.total_chemicals_l)),
            fullValue: formatFullNumber(getNum(curChem.total_chemicals_l)),
            unit: curChem.unit_chemical_l ?? 'L',
            trend: calculateTrend(curChem.total_chemicals_l, prevChem.total_chemicals_l),
          },
          {
            label: 'Dạng Khí',
            value: formatCompactDashboard(getNum(curChem.total_chemicals_m3)),
            fullValue: formatFullNumber(getNum(curChem.total_chemicals_m3)),
            unit: curChem.unit_chemical_m3 ?? 'm³',
            trend: calculateTrend(curChem.total_chemicals_m3, prevChem.total_chemicals_m3),
          },
        ],
      },
      {
        id: 'combustion',
        title: 'Chất đốt',
        icon: Flame,
        baseColor: '#FF4000',
        to: `${basePath}/combustionResources`,
        mainMetrics: [
          {
            label: 'Tổng',
            value: formatCompactDashboard(getNum(curFuel.total_combustion)),
            fullValue: formatFullNumber(getNum(curFuel.total_combustion)),
            unit: curFuel.unit_fuel_co ?? 'Tấn',
            trend: calculateTrend(curFuel.total_combustion, prevFuel.total_combustion),
          },
        ],
      },
    ];

    // Process Chart Data
    const byMonth = {};
    recordsArr.forEach(record => {
      const m = Number(String(record.periodKey).slice(4));
      const rMat = record.input_materials ?? {};
      const rChem = record.input_chemicals ?? {};
      const rFuel = record.fuels ?? {};

      byMonth[m] = [
        { Name: 'Gỗ', Value: getNum(rMat.total_materials_WOOD), Color: '#6366f1', Type: 'materials' },
        { Name: 'Kim loại', Value: getNum(rMat.total_materials_MET), Color: '#64748b', Type: 'materials' },
        { Name: 'Phi kim', Value: getNum(rMat.total_materials_NMET), Color: '#a855f7', Type: 'materials' },
        { Name: 'Nhựa', Value: getNum(rMat.total_materials_POL), Color: '#ec4899', Type: 'materials' },
        { Name: 'Giấy', Value: getNum(rMat.total_materials_PAC), Color: '#f97316', Type: 'materials' },
        { Name: 'Nước cấp', Value: getNum(rFuel.total_water_tap), Color: '#0ea5e9', Type: 'water' },
        { Name: 'Nước tái tạo', Value: getNum(rFuel.total_water_recycle), Color: '#14b8a6', Type: 'water' },
        { Name: 'Điện lưới', Value: getNum(rFuel.total_electricity_grid), Color: '#f59e0b', Type: 'energy' },
        { Name: 'Điện tái tạo', Value: getNum(rFuel.total_electricity_renewable), Color: '#22c55e', Type: 'energy' },
        { Name: 'Than', Value: getNum(rFuel.total_combustion_COL), Color: '#78716c', Type: 'combustion' },
        { Name: 'Dầu', Value: getNum(rFuel.total_combustion_PET), Color: '#f97316', Type: 'combustion' },
        { Name: 'Khí', Value: getNum(rFuel.total_combustion_GASF), Color: '#06b6d4', Type: 'combustion' },
        { Name: 'Rắn', Value: getNum(rChem.total_chemicals_kg), Color: '#8b5cf6', Type: 'chemicals' },
        { Name: 'Lỏng', Value: getNum(rChem.total_chemicals_l), Color: '#06b6d4', Type: 'chemicals' },
        { Name: 'Khí', Value: getNum(rChem.total_chemicals_m3), Color: '#22c55e', Type: 'chemicals' },
      ];
    });

    return { cardData: cards, chartData: byMonth };
  }, [summaryRecords, isAllYear]);

  const [activeTab, setActiveTab] = useState('materials');

  const getChartDataForTab = (tab) => {
    const filteredByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const items = chartData[m] || [];
      filteredByMonth[m] = items.filter(i => i.Type === tab);
    }
    return filteredByMonth;
  };

  const tabConfig = {
    materials: { color: 'indigo', unit: 'Tấn' },
    chemicals: { color: 'teal', unit: 'kg/L' },
    energy: { color: 'amber', unit: 'kWh' },
    water: { color: 'sky', unit: 'm³' },
    combustion: { color: 'orange', unit: 'Tấn' },
  };

  const currentMonthData = useMemo(() => {
    const arr = Array.isArray(summaryRecords) ? summaryRecords : [];
    if (isAllYear) {
      // Aggregate all if yearly
      const aggregated = { input_materials: {}, input_chemicals: {}, fuels: {} };
      arr.forEach(record => {
        ['input_materials', 'input_chemicals', 'fuels'].forEach(section => {
          const data = record[section] ?? {};
          Object.keys(data).forEach(key => {
            if (key.startsWith('total_') && typeof data[key] === 'number') {
              aggregated[section][key] = (aggregated[section][key] || 0) + data[key];
            }
          });
        });
      });
      return aggregated;
    }
    return arr[0] || {};
  }, [summaryRecords, isAllYear]);

  const pieChartData = useMemo(() => {
    const getNum = (val) => Number(val) || 0;
    const mat = currentMonthData?.input_materials ?? {};
    const chem = currentMonthData?.input_chemicals ?? {};
    const fuel = currentMonthData?.fuels ?? {};

    switch (activeTab) {
      case 'materials':
        return {
          data: [
            { Name: 'Gỗ', Value: getNum(mat.total_materials_WOOD), Color: '#f59e0b' },
            { Name: 'Kim loại', Value: getNum(mat.total_materials_MET), Color: '#64748b' },
            { Name: 'Phi kim', Value: getNum(mat.total_materials_NMET), Color: '#a855f7' },
            { Name: 'Nhựa', Value: getNum(mat.total_materials_POL), Color: '#ec4899' },
            { Name: 'Giấy & Carton', Value: getNum(mat.total_materials_PAC), Color: '#f97316' },
            { Name: 'Vải & Sợi', Value: getNum(mat.total_materials_TEX), Color: '#f43f5e' },
            { Name: 'Thực phẩm', Value: getNum(mat.total_materials_AGRI), Color: '#10b981' },
          ].filter(d => d.Value > 0),
          total: getNum(mat.total_materials),
          unit: 'Tấn',
        };
      case 'chemicals':
        return {
          data: [
            { Name: 'Rắn (kg)', Value: getNum(chem.total_chemicals_kg), Color: '#8b5cf6' },
            { Name: 'Lỏng (L)', Value: getNum(chem.total_chemicals_l), Color: '#06b6d4' },
            { Name: 'Khí (m³)', Value: getNum(chem.total_chemicals_m3), Color: '#22c55e' },
          ].filter(d => d.Value > 0),
          total: getNum(chem.total_chemicals_kg) + getNum(chem.total_chemicals_l) + getNum(chem.total_chemicals_m3),
          unit: 'Tổng',
        };
      case 'energy':
        return {
          data: [
            { Name: 'Điện lưới', Value: getNum(fuel.total_electricity_grid), Color: '#f59e0b' },
            { Name: 'Điện tái tạo', Value: getNum(fuel.total_electricity_renewable), Color: '#22c55e' },
          ].filter(d => d.Value > 0),
          total: getNum(fuel.total_electricity),
          unit: 'kWh',
        };
      case 'water':
        return {
          data: [
            { Name: 'Nước cấp', Value: getNum(fuel.total_water_tap), Color: '#0ea5e9' },
            { Name: 'Nước tái tạo', Value: getNum(fuel.total_water_recycle), Color: '#14b8a6' },
            { Name: 'Nước mưa', Value: getNum(fuel.total_water_rain), Color: '#6366f1' },
            { Name: 'Nước giếng', Value: getNum(fuel.total_water_well), Color: '#3b82f6' },
          ].filter(d => d.Value > 0),
          total: getNum(fuel.total_water),
          unit: 'm³',
        };
      case 'combustion':
        return {
          data: [
            { Name: 'Than', Value: getNum(fuel.total_combustion_COL), Color: '#78716c' },
            { Name: 'Dầu', Value: getNum(fuel.total_combustion_PET), Color: '#f97316' },
            { Name: 'Khí đốt', Value: getNum(fuel.total_combustion_GASF), Color: '#3b82f6' },
            { Name: 'Biomass', Value: getNum(fuel.total_combustion_BIO), Color: '#84cc16' },
          ].filter(d => d.Value > 0),
          total: getNum(fuel.total_combustion),
          unit: 'Tấn',
        };
      default: return { data: [], total: 0, unit: '' };
    }
  }, [activeTab, currentMonthData]);

  const renderSideDetails = () => {
    const getNum = (val) => Number(val) || 0;
    const mat = currentMonthData.input_materials ?? {};
    const chem = currentMonthData.input_chemicals ?? {};
    const fuel = currentMonthData.fuels ?? {};

    switch (activeTab) {
      case 'materials':
        return (
          <>
            <DetailItem color="amber" icon={TreePine} label="Gỗ" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_WOOD))} />
            <DetailItem color="slate" icon={Hammer} label="Kim loại" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_MET))} />
            <DetailItem color="purple" icon={CircleDot} label="Phi kim" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_NMET))} />
            <DetailItem color="pink" icon={Cylinder} label="Nhựa" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_POL))} />
            <DetailItem color="orange" icon={Archive} label="Giấy & Carton" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_PAC))} />
            <DetailItem color="rose" icon={Layers} label="Vải & Sợi" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_TEX))} />
            <DetailItem color="emerald" icon={Wheat} label="Thực phẩm" unit="Tấn" value={formatSmallNumbers(getNum(mat.total_materials_AGRI))} />
          </>
        );
      case 'chemicals':
        return (
          <>
            <DetailItem color="red" icon={FlaskConical} label="Rắn" unit="kg" value={formatSmallNumbers(getNum(chem.total_chemicals_kg))} />
            <DetailItem color="blue" icon={FlaskConical} label="Lỏng" unit="L" value={formatSmallNumbers(getNum(chem.total_chemicals_l))} />
            <DetailItem color="sky" icon={Wind} label="Khí" unit="m³" value={formatSmallNumbers(getNum(chem.total_chemicals_m3))} />
            <DetailItem color="rose" icon={FlaskConical} label="Axit" unit="L" value={formatSmallNumbers(getNum(chem.total_chemicals_ACD_l))} />
            <DetailItem color="indigo" icon={FlaskConical} label="Bazo" unit="L" value={formatSmallNumbers(getNum(chem.total_chemicals_BAS_l))} />
          </>
        );
      case 'energy':
        return (
          <>
            <DetailItem color="blue" icon={Zap} label="Tổng cộng" unit="kWh" value={formatSmallNumbers(getNum(fuel.total_electricity))} />
            <DetailItem color="amber" icon={Zap} label="Điện lưới" unit="kWh" value={formatSmallNumbers(getNum(fuel.total_electricity_grid))} />
            <DetailItem color="green" icon={Leaf} label="Tái tạo" unit="kWh" value={formatSmallNumbers(getNum(fuel.total_electricity_renewable))} />
          </>
        );
      case 'water':
        return (
          <>
            <DetailItem color="sky" icon={Droplets} label="Nước cấp" unit="m³" value={formatSmallNumbers(getNum(fuel.total_water_tap))} />
            <DetailItem color="teal" icon={Recycle} label="Nước tái tạo" unit="m³" value={formatSmallNumbers(getNum(fuel.total_water_recycle))} />
            <DetailItem color="indigo" icon={Cloud} label="Nước mưa" unit="m³" value={formatSmallNumbers(getNum(fuel.total_water_rain))} />
          </>
        );
      case 'combustion':
        return (
          <>
            <DetailItem color="gray" icon={Box} label="Than" unit="Tấn" value={formatSmallNumbers(getNum(fuel.total_combustion_COL))} />
            <DetailItem color="orange" icon={Fuel} label="Dầu" unit="Tấn" value={formatSmallNumbers(getNum(fuel.total_combustion_PET))} />
            <DetailItem color="blue" icon={Flame} label="Khí đốt" unit="Tấn" value={formatSmallNumbers(getNum(fuel.total_combustion_GASF))} />
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 lg:gap-3 pt-1 px-2 pb-1 overflow-y-auto">
      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 lg:gap-3 shrink-0">
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
                className="w-full py-2.5 rounded-xl bg-[#4E5BA6] text-white font-semibold text-sm hover:bg-[#3d4885] transition-all shadow-md"
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

export default ResourcesDashboardCompany;
