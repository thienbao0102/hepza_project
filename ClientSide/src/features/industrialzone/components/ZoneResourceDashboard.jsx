import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import {
  Zap, Droplets, Cloud, Trash2,
  TrendingUp, TrendingDown, Minus, BarChart3,
  FileDown, AlertTriangle, Info, Flame, Pickaxe, FlaskConical, CloudFog,
  LineChart, Activity
} from 'lucide-react';
import { useSummaryRecords, useSummaryRecordByPeriodkey } from '@features/resources/hooks/useSummaryRecords';
import Widget from '@components/ui/Widget';
import AutoLineChart from '@components/ui/AutoLineChart';
import DonutChart from '@components/ui/DonutChart';
import Barchart from '@components/ui/BarChart';
import { useAuthenticatedUser } from '@/features/auth/hooks/useAuthQueries';
import { EnterpriseMetricCard } from '@components/dashboard/DashboardComponents';
import {
  formatCompactDashboard,
  formatFullNumber,
} from '@components/dashboard/DashboardLogical';

// --- CONSTANTS ---
const CURRENT_YEAR = dayjs().year();
const BRAND = '#4E5BA6';

const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(y => ({
  label: `Năm ${y}`,
  value: y,
}));


// --- SUB-COMPONENTS ---

const KpiCard = ({ icon: Icon, label, value, unit, color, trend, trendValue }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-gray-400';
  const trendBg = trend === 'up' ? 'bg-red-50' : trend === 'down' ? 'bg-emerald-50' : 'bg-gray-50';

  // CO2 card: "up" is bad (red). For other resources, context-dependent.
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200"
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div
          className="p-2.5 rounded-xl"
          style={{ background: `${color}18` }}
        >
          <Icon className="size-5" strokeWidth={2.2} style={{ color }} />
        </div>
        {trend && trendValue != null && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendColor} ${trendBg}`}>
            <TrendIcon className="size-3" />
            {Math.abs(trendValue).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight font-mono">
          {value ?? '--'}
          <span className="text-sm font-medium text-gray-400 ml-1.5">{unit}</span>
        </p>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title, description, activeTab, onTabChange }) => (
  <div className="flex items-center justify-between w-full mb-4">
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-xl" style={{ background: `${BRAND}12` }}>
        <Icon className="size-4" strokeWidth={2.2} style={{ color: BRAND }} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  </div>
);

const EmptyState = ({ message = 'Không có dữ liệu trong khoảng thời gian này' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
    <Info className="size-10" />
    <p className="text-sm text-gray-400 font-medium">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="relative size-10">
      <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
      <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
    </div>
    <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu tài nguyên...</p>
  </div>
);

const safeNum = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

const getMonthLabel = (periodKey) => {
  const m = String(periodKey).slice(-2);
  return `T${parseInt(m, 10)}`;
};

// ==============================
// MAIN COMPONENT
// ==============================
const ZoneResourceDashboard = ({ zoneId, userRole }) => {
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [consumpTab, setConsumpTab] = useState('cards');
  const [emissionTab, setEmissionTab] = useState('cards');

  // Lấy companyId từ auth (dùng cho trường hợp fallback nếu backend đòi)
  const { data: authData } = useAuthenticatedUser();
  const user = authData?.user || authData;
  const companyId = user?.company_id;

  const periodKeyStart = selectedYear * 100 + 1;
  const periodKeyEnd = selectedYear * 100 + 12;
  const prevPeriodKeyStart = (selectedYear - 1) * 100 + 1;
  const prevPeriodKeyEnd = (selectedYear - 1) * 100 + 12;

  // Params chung cho query
  const queryParams = {
    role: userRole || user?.role || 'manager',
    zoneId: zoneId,
  };

  // 1. Data tổng hợp (aggregated) cho toàn năm
  const { data: rawYearlyData = [], isLoading: load1 } = useSummaryRecords(
    {
      ...queryParams,
      include: [1, 2, 3, 4, 5, 6],
      periodKeyStart: periodKeyStart,
      periodKeyEnd: periodKeyEnd,
    },
    { enabled: userRole === 'admin' || !!zoneId }
  );

  // Data tổng hợp năm trước
  const { data: prevRawYearlyData = [] } = useSummaryRecords(
    {
      ...queryParams,
      include: [1, 2, 3, 4, 5, 6],
      periodKeyStart: prevPeriodKeyStart,
      periodKeyEnd: prevPeriodKeyEnd,
    },
    { enabled: userRole === 'admin' || !!zoneId }
  );

  // 2. Data phân bổ theo tháng (monthly) -> Riêng cho Line Chart điện/nước (include: [4])
  // Tránh gọi [1,2,3,4,5,6] vào API này vì nó sẽ báo lỗi 400 Bad Request
  const { data: rawMonthlyFuel = [], isLoading: load2 } = useSummaryRecordByPeriodkey({
    ...queryParams,
    include: [4], // Điện, Nước
    periodKeyStart: periodKeyStart,
    periodKeyEnd: periodKeyEnd,
  });

  const isLoading = load1 || load2;

  // Lấy ra phần tử đầu tiên (vì useSummaryRecords trả ra mảng 1 item tổng)
  const records = useMemo(() => {
    const arr = Array.isArray(rawYearlyData) ? rawYearlyData : (rawYearlyData?.summaryRecord ?? []);
    return arr;
  }, [rawYearlyData]);

  const prevRecords = useMemo(() => {
    const arr = Array.isArray(prevRawYearlyData) ? prevRawYearlyData : (prevRawYearlyData?.summaryRecord ?? []);
    return arr;
  }, [prevRawYearlyData]);

  const monthlyFuelRecords = useMemo(() => {
    return Array.isArray(rawMonthlyFuel) ? rawMonthlyFuel : (rawMonthlyFuel?.summaryRecord ?? []);
  }, [rawMonthlyFuel]);

  // Aggregate totals
  const processAggregation = (data) => data.reduce((acc, r) => {
    const f = r.fuels ?? {};
    const e = r.emissions ?? {};
    const w = r.waste ?? {};
    const m = r.input_materials ?? {};
    const c = r.input_chemicals ?? {};

    acc.electricity += safeNum(f.total_electricity);
    acc.electricity_grid += safeNum(f.total_electricity_grid);
    acc.electricity_renewable += safeNum(f.total_electricity_renewable);
    acc.water += safeNum(f.total_water);
    acc.fuel += safeNum(f.total_combustion);

    acc.materials += safeNum(m.total_materials);

    acc.chemicals_kg += safeNum(c.total_chemicals_kg);
    acc.chemicals_l += safeNum(c.total_chemicals_l);

    acc.co2 += safeNum(e.total_co2);

    acc.waste_total += safeNum(w.total_waste);
    acc.waste_solid += safeNum(w.total_waste_DO) + safeNum(w.total_waste_IND) + safeNum(w.total_waste_HA);
    acc.waste_water += safeNum(w.total_waste_WWA);
    acc.waste_gas += safeNum(w.total_waste_GASW);

    acc.count_electricity = Math.max(acc.count_electricity, safeNum(f.count_electricity));
    acc.count_water = Math.max(acc.count_water, safeNum(f.count_water));
    acc.count_fuel = Math.max(acc.count_fuel, safeNum(f.count_fuels));
    acc.count_materials = Math.max(acc.count_materials, safeNum(m.count_materials));
    acc.count_chemicals = Math.max(acc.count_chemicals, safeNum(c.count_chemicals));
    acc.count_co2 = Math.max(acc.count_co2, safeNum(e.count_emissions));
    acc.count_waste = Math.max(acc.count_waste, safeNum(w.count_waste));

    return acc;
  }, {
    electricity: 0, electricity_grid: 0, electricity_renewable: 0,
    water: 0, fuel: 0, materials: 0, chemicals_kg: 0, chemicals_l: 0,
    co2: 0, waste_total: 0, waste_solid: 0, waste_water: 0, waste_gas: 0,
    count_electricity: 0, count_water: 0, count_fuel: 0, count_materials: 0, count_chemicals: 0, count_co2: 0, count_waste: 0
  });

  const totals = useMemo(() => {
    return processAggregation(records);
  }, [records]);

  const prevTotals = useMemo(() => {
    return processAggregation(prevRecords);
  }, [prevRecords]);

  // Build monthly trend line data from monthlyFuelRecords
  const lineData = useMemo(() => {
    return [...monthlyFuelRecords]
      .sort((a, b) => a.periodKey - b.periodKey)
      .map(r => ({
        name: getMonthLabel(r.periodKey),
        'Điện (kWh)': safeNum(r.fuels?.total_electricity),
        'Nước (m³)': safeNum(r.fuels?.total_water),
      }));
  }, [monthlyFuelRecords]);

  // CO₂ breakdown donut
  const co2DonutData = useMemo(() => {
    const agg = records.reduce((acc, r) => {
      const e = r.emissions ?? {};
      acc.energy += safeNum(e.total_co2_from_energy);
      acc.electricity += safeNum(e.total_co2_from_electricity);
      acc.combustion += safeNum(e.total_co2_from_combustion);
      acc.combustionLiquid += safeNum(e.total_co2_from_combustion_liquid);
      acc.combustionGas += safeNum(e.total_co2_from_combustion_gas);
      acc.water += safeNum(e.total_co2_from_water);
      return acc;
    }, { energy: 0, electricity: 0, combustion: 0, combustionLiquid: 0, combustionGas: 0, water: 0 });

    return [
      { name: 'Từ năng lượng', value: Math.round(agg.energy) },
      { name: 'Từ điện', value: Math.round(agg.electricity) },
      { name: 'Từ đốt cháy', value: Math.round(agg.combustion) },
      { name: 'Từ đốt lỏng', value: Math.round(agg.combustionLiquid) },
      { name: 'Từ đốt khí', value: Math.round(agg.combustionGas) },
      { name: 'Từ nước', value: Math.round(agg.water) },
    ].filter(d => d.value > 0);
  }, [records]);

  // Waste breakdown bar
  const wasteBarData = useMemo(() => {
    const agg = records.reduce((acc, r) => {
      const w = r.waste ?? {};
      acc.reused += safeNum(w.total_waste_reused);
      acc.recycled += safeNum(w.total_waste_recycled);
      acc.contracted += safeNum(w.total_waste_contracted);
      acc.hazardous += safeNum(w.total_hazardous_waste);
      acc.domestic += safeNum(w.total_domestic_waste);
      return acc;
    }, { reused: 0, recycled: 0, contracted: 0, hazardous: 0, domestic: 0 });

    return [
      { name: 'Tái sử dụng', 'Sản lượng': Math.round(agg.reused) },
      { name: 'Tái chế', 'Sản lượng': Math.round(agg.recycled) },
      { name: 'Hợp đồng', 'Sản lượng': Math.round(agg.contracted) },
      { name: 'Nguy hại', 'Sản lượng': Math.round(agg.hazardous) },
      { name: 'Sinh hoạt', 'Sản lượng': Math.round(agg.domestic) },
    ];
  }, [records]);

  const hasData = records.length > 0;

  const CONSUMPTION_CARDS = [
    {
      title: "Nước",
      icon: Droplets,
      baseColor: "#00A6FF",
      companyCount: totals.count_water,
      resourceCategory: 3,
      mainMetrics: [
        {
          label: "Tổng",
          value: formatCompactDashboard(totals.water),
          fullValue: formatFullNumber(totals.water),
          unit: "m³",
        }
      ]
    },
    {
      title: "Chất đốt",
      icon: Flame,
      baseColor: "#FF4000",
      companyCount: totals.count_fuel,
      resourceCategory: 1,
      mainMetrics: [
        {
          label: "Tổng",
          value: formatCompactDashboard(totals.fuel),
          fullValue: formatFullNumber(totals.fuel),
          unit: "Tấn",
        }
      ]
    },
    {
      title: "Nguyên Vật liệu",
      icon: Pickaxe,
      baseColor: "#4E5BA6",
      companyCount: totals.count_materials,
      resourceCategory: 4,
      mainMetrics: [
        {
          label: "Tổng",
          value: formatCompactDashboard(totals.materials),
          fullValue: formatFullNumber(totals.materials),
          unit: "Tấn",
        }
      ]
    },
    {
      title: "Điện",
      icon: Zap,
      baseColor: "#FF9D00",
      companyCount: totals.count_electricity,
      resourceCategory: 2,
      mainMetrics: [
        {
          label: "Điện lưới",
          value: formatCompactDashboard(totals.electricity_grid),
          fullValue: formatFullNumber(totals.electricity_grid),
          unit: "kWh",
        },
        {
          label: "Điện tái tạo",
          value: formatCompactDashboard(totals.electricity_renewable),
          fullValue: formatFullNumber(totals.electricity_renewable),
          unit: "kWh",
        },
        {
          label: "Tổng",
          value: formatCompactDashboard(totals.electricity),
          fullValue: formatFullNumber(totals.electricity),
          unit: "kWh",
        }
      ]
    },
    {
      title: "Hóa chất sử dụng",
      icon: FlaskConical,
      baseColor: "#9CB000",
      companyCount: totals.count_chemicals,
      resourceCategory: 5,
      mainMetrics: [
        {
          label: "Dạng Rắn",
          value: formatCompactDashboard(totals.chemicals_kg),
          fullValue: formatFullNumber(totals.chemicals_kg),
          unit: "Kg",
        },
        {
          label: "Dạng Lỏng",
          value: formatCompactDashboard(totals.chemicals_l),
          fullValue: formatFullNumber(totals.chemicals_l),
          unit: "Lít",
        }
      ]
    }
  ];

  const EMISSION_CARDS = [
    {
      title: "Phát thải CO₂",
      icon: CloudFog,
      baseColor: "#01874F",
      companyCount: totals.count_co2,
      resourceCategory: 'emissions',
      mainMetrics: [
        {
          label: "Tổng",
          value: formatCompactDashboard(totals.co2),
          fullValue: formatFullNumber(totals.co2),
          unit: "Tấn",
        }
      ]
    },
    {
      title: "Chất thải",
      icon: Trash2,
      baseColor: "#866701",
      companyCount: totals.count_waste,
      resourceCategory: 6,
      mainMetrics: [
        {
          label: "Dạng rắn",
          value: formatCompactDashboard(totals.waste_solid),
          fullValue: formatFullNumber(totals.waste_solid),
          unit: "Tấn",
        },
        {
          label: "Nước thải",
          value: formatCompactDashboard(totals.waste_water),
          fullValue: formatFullNumber(totals.waste_water),
          unit: "m³",
        },
        {
          label: "Khí thải",
          value: formatCompactDashboard(totals.waste_gas),
          fullValue: formatFullNumber(totals.waste_gas),
          unit: "mg/l",
        },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-5 mt-2">
      {/* ── SECTION HEADER ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SectionHeader
            description={`Dữ liệu tổng hợp toàn khu công nghiệp — Năm ${selectedYear}`}
            icon={BarChart3}
            title="Tổng quan Tài nguyên & Phát thải CO₂"
          />
          <div className="flex items-center gap-2 shrink-0">
            {/* Year selector */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-semibold">
              {YEAR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`px-3.5 py-2 cursor-pointer transition-colors duration-150
                                        ${selectedYear === opt.value
                      ? 'bg-[#4E5BA6] text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  id={`zone-resource-year-${opt.value}`}
                  onClick={() => setSelectedYear(opt.value)}
                >
                  {opt.value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <LoadingState />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* SECTION 1: CONSUMPTION */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
              <SectionHeader
                activeTab={consumpTab}
                description="Tổng hợp năng lượng và tài nguyên tiêu thụ"
                icon={Activity}
                onTabChange={setConsumpTab}
                title="Tài nguyên tiêu thụ"
              />
              <div className="flex-grow">
                <AnimatePresence mode="wait">
                  {consumpTab === 'cards' ? (
                    <motion.div
                      key="consump-cards"
                      animate={{ opacity: 1, scale: 1 }}
                      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-4 h-full"
                      exit={{ opacity: 0, scale: 0.98 }}
                      initial={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      {CONSUMPTION_CARDS.slice(0, 3).map((card, i) => (
                        <EnterpriseMetricCard key={i} {...card} zoneId={zoneId} />
                      ))}
                      <div className="md:col-span-1 xl:col-span-1 h-full">
                        <EnterpriseMetricCard {...CONSUMPTION_CARDS[3]} zoneId={zoneId} />
                      </div>
                      <div className="md:col-span-1 xl:col-span-2 h-full">
                        <EnterpriseMetricCard {...CONSUMPTION_CARDS[4]} zoneId={zoneId} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="consump-charts"
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full"
                      exit={{ opacity: 0, y: 10 }}
                      initial={{ opacity: 0, y: 10 }}
                    >
                      <div className="h-[400px] mt-4">
                        <AutoLineChart
                          data={lineData}
                          lines={[
                            { dataKey: 'Điện (kWh)', stroke: '#FF9D00', name: 'Điện (kWh)' },
                            { dataKey: 'Nước (m³)', stroke: '#00A6FF', name: 'Nước (m³)' },
                          ]}
                          xAxisDataKey="name"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* SECTION 2: EMISSIONS & WASTE */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
              <SectionHeader
                activeTab={emissionTab}
                description="Dữ liệu phát thải và quản lý chất thải"
                icon={CloudFog}
                onTabChange={setEmissionTab}
                title="Phát thải và Chất thải"
              />
              <div className="flex-grow">
                <AnimatePresence mode="wait">
                  {emissionTab === 'cards' ? (
                    <motion.div
                      key="emission-cards"
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-1 auto-rows-fr gap-4 h-full"
                      exit={{ opacity: 0, x: 20 }}
                      initial={{ opacity: 0, x: 20 }}
                    >
                      {EMISSION_CARDS.map((card, i) => (
                        <EnterpriseMetricCard key={i} {...card} zoneId={zoneId} />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="emission-charts"
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full"
                      exit={{ opacity: 0, scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="flex flex-col gap-4 mt-4 h-full">
                        <Widget className="flex-1" title="Phân loại Chất thải">
                          <Barchart data={wasteBarData} />
                        </Widget>
                        <Widget className="flex-1" title="CO₂ theo Nguồn">
                          <DonutChart
                            colors={['#01874F', '#14B8A6', '#F97316', '#8B5CF6', '#D946EF']}
                            data={co2DonutData}
                            totalValue={totals.co2}
                          />
                        </Widget>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneResourceDashboard;
