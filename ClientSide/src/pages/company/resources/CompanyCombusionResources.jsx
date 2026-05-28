import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import clsx from 'clsx';
import ResourceAnalytics from '@components/ui/ResourceAnalytics';

import {
  SearchCheck, Trash, Flame,
  BarChart3, TrendingUp, Filter,
  ChevronDown, Droplet, Atom,
  Search, FlaskConical, Maximize2,
} from 'lucide-react';

import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton, DeleteSelectedButton, RefreshButton } from '@components/ui/Button';
import ButtonFilter from '@components/ui/ButtonFilter';
import SearchBox from '@components/ui/SearchBox';
import ChartDetailModal from '@components/ui/ChartDetailModal';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useChartModal } from '@/hooks/useChartModal';
import { useIsAuthenticated } from '@/features/auth/hooks/useAuthQueries';
import { useCompany } from '@/features/company/hooks/useCompanyQueries';
import { useSummaryDetail } from '@/features/resources/hooks/useSummaryRecords';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';

const COLORS = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#8B5CF6', '#F43F5E'];

// Helper function: Group top N items, rest become "Others"
const groupTopItems = (data, topCount) => {
  if (data.length <= topCount) return data;

  const topItems = data.slice(0, topCount);
  const others = data.slice(topCount);

  if (others.length > 0) {
    const othersValue = others.reduce((acc, curr) => acc + curr.value, 0);
    topItems.push({ name: 'Khác', value: othersValue, isOthers: true });
  }

  return topItems;
};

const EmptyState = ({ message }) => (
  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
    <SearchCheck className="size-8 opacity-50" />
    <span className="text-sm font-medium">{message}</span>
  </div>
);

const CompanyCombustionResources = () => {
  const { handleChartViewClick, chartModalProps } = useChartModal(COLORS);
  const getCategoryStyles = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('than')) return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    if (lower.includes('biomass')) return 'bg-lime-50 text-lime-700 border-lime-200';
    if (lower.includes('dầu mỏ') || lower.includes('petroleum')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('khí') || lower.includes('gas')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getNameStyles = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('than')) return 'bg-zinc-100 text-zinc-800 border-zinc-300';
    if (lower.includes('biomass')) return 'bg-lime-100 text-lime-800 border-lime-300';
    if (lower.includes('dầu') || lower.includes('petroleum') || lower.includes('oil')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (lower.includes('khí') || lower.includes('gas')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (lower.includes('củi') || lower.includes('gỗ') || lower.includes('wood')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (lower.includes('rác') || lower.includes('waste')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (lower.includes('điện') || lower.includes('electric')) return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();

  const { user } = useIsAuthenticated();

  const companyId = user?.user?.company_id;
  const userRole = user?.user?.role;
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';

  const { data: company = [] } = useCompany(companyId);
  const zoneId = isManager ? user?.user?.zone_id : company?.company?.zone_id;
  const { data: zoneData } = useZone(zoneId, { enabled: !!zoneId });
  const managerZoneLabel = resolveManagerZoneLabel({
    zoneName: zoneData?.zone?.zone_name || user?.user?.zone_name,
    zoneId,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({});

  useEffect(() => {
    if (date?.startsWith('00/')) {
      setSortConfig({ periodKey: 1 });
    } else {
      setSortConfig({});
    }
  }, [date]);

  const [selectedRows, setSelectedRows] = useState([]);

  // Data Fetching
  const isAllYear = date?.startsWith('00/');
  const selectedYear = isAllYear ? date.split('/')[1] : dayjs(date, 'MM/YYYY').year();

  const periodKeyStart = isAllYear ? `${selectedYear}01` : dayjs(date, 'MM/YYYY').format('YYYYMM');
  const periodKeyEnd = isAllYear ? `${selectedYear}12` : dayjs(date, 'MM/YYYY').format('YYYYMM');

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = {}, isFetching, refetch } = useSummaryDetail({
    role: userRole,
    ...(userRole !== 'admin' && !isManager && { companyId }),
    ...(userRole !== 'admin' && zoneId && { zoneId }),
    periodKeyStart: Number(periodKeyStart),
    periodKeyEnd: Number(periodKeyEnd),
    include: [5], // FuelResource for combustion
  }, { enabled: !!hasRequiredParams });

  // Auto-refresh logic
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  const rawDataRaw = summaryRecords.FuelResource || [];
  const rawData = useMemo(() => Array.isArray(rawDataRaw) ? rawDataRaw : [], [rawDataRaw]);

  // --- Data Processing for Table ---
  const filteredData = useMemo(() => {
    let result = rawData.map(item => ({
      ...item,
      id: item.id || `combustion-${Math.random()}`,
      fuelName: item.sub_group || 'Khác',
      category: item.main_group || 'Năng lượng',
      qty: Number(item.quantity) || 0,
      unit: item.unit || 'Tấn',
      formattedDate: dayjs(item.createdAt).format('DD/MM/YYYY'),
    }));

    // Search
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.fuelName.toLowerCase().includes(lowSearch) ||
        item.category.toLowerCase().includes(lowSearch),
      );
    }

    // Filters
    Object.keys(selectedFilters).forEach(key => {
      const values = selectedFilters[key];
      if (values && values.length > 0) {
        result = result.filter(item => values.includes(item[key]));
      }
    });

    // Sorting
    const sortField = Object.keys(sortConfig)[0];
    const sortOrder = sortConfig[sortField];
    if (sortField && sortOrder !== 0) {
      result.sort((a, b) => {
        let valA = sortField === 'periodKey' ? (a.periodKey || a.createdAt) : a[sortField];
        let valB = sortField === 'periodKey' ? (b.periodKey || b.createdAt) : b[sortField];
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        if (valA < valB) return -1 * sortOrder;
        if (valA > valB) return 1 * sortOrder;
        return 0;
      });
    }

    return result;
  }, [rawData, searchTerm, selectedFilters, sortConfig]);

  // --- Data Processing for Charts ---
  const chartData = useMemo(() => {
    const typeMap = new Map();
    const fuelUsageMap = new Map();
    const timeMap = new Map();
    const allTypes = new Set();
    // Grouped by fuel type for the detail modal
    const fuelsByType = new Map();

    rawData.forEach(item => {
      // Chart 2: Group by main_group (Phân loại)
      const type = item.main_group || 'Khác';
      // Chart 3: Stack by sub_group (Tên nhiên liệu)
      const name = item.sub_group || 'Khác';
      const qty = Number(item.quantity) || 0;

      typeMap.set(type, (typeMap.get(type) || 0) + qty);
      fuelUsageMap.set(name, (fuelUsageMap.get(name) || 0) + qty);

      // Build fuels by type map (type = main_group, fuels = sub_group)
      if (!fuelsByType.has(type)) {
        fuelsByType.set(type, new Map());
      }
      const typeFuelMap = fuelsByType.get(type);
      typeFuelMap.set(name, (typeFuelMap.get(name) || 0) + qty);

      // Fix: Use periodKey for monthly trend instead of createdAt to prevent timezone/month overlap
      let monthKey = 'N/A';
      let timestamp = 0;
      if (item.periodKey) {
        const pkString = String(item.periodKey);
        if (pkString.length === 6) {
          const year = pkString.substring(0, 4);
          const month = pkString.substring(4, 6);
          monthKey = `${month}/${year}`;
          timestamp = dayjs(`${year}-${month}-01`).valueOf();
        }
      } else {
        const dateObj = dayjs(item.createdAt);
        monthKey = dateObj.isValid() ? dateObj.format('MM/YYYY') : 'N/A';
        timestamp = dateObj.isValid() ? dateObj.valueOf() : 0;
      }

      if (monthKey !== 'N/A') {
        if (!timeMap.has(monthKey)) {
          timeMap.set(monthKey, { name: monthKey, timestamp });
        }
        const record = timeMap.get(monthKey);
        record[name] = (record[name] || 0) + qty;
      }
      allTypes.add(name);
    });

    // Chart 1: All fuel names (sub_group) - detailed
    const byFuelFull = Array.from(fuelUsageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Chart 2: Top 5 fuels for small display
    const top5Fuels = Array.from(fuelUsageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const top5FuelNames = new Set(top5Fuels.map(f => f.name));

    // Process time data for Chart 3 - group non-top-5 into "Khác"
    const byTimeRaw = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const byTime = byTimeRaw.map(record => {
      const newRecord = { name: record.name, timestamp: record.timestamp };
      let othersValue = 0;

      Object.keys(record).forEach(key => {
        if (key !== 'name' && key !== 'timestamp') {
          if (top5FuelNames.has(key)) {
            newRecord[key] = record[key];
          } else {
            othersValue += record[key] || 0;
          }
        }
      });

      if (othersValue > 0) {
        newRecord['Khác'] = othersValue;
      }
      return newRecord;
    });

    // Convert fuelsByType to a usable format
    const byTypeGrouped = {};
    fuelsByType.forEach((fMap, typeKey) => {
      byTypeGrouped[typeKey] = Array.from(fMap.entries()).map(([name, value]) => ({ name, value }));
    });

    // Types for Chart 3: top 5 + "Khác" if there are others
    const chart3Types = [...top5FuelNames];
    const hasOthers = byTime.some(r => r['Khác'] > 0);
    if (hasOthers) {
      chart3Types.push('Khác');
    }

    return {
      byType: top5Fuels,  // Chart 2 uses byType
      byTypeFull: byFuelFull,  // Chart 1 uses byTypeFull
      byTime,
      allTypes: Array.from(allTypes), // For the fallback mapping
      byTypeGrouped,
    };
  }, [rawData]);

  const resourceAnalyticsConfig = {
    unit: 'Tấn',
    measure: 'Lượng dùng',
    chart1: {
      title: 'Phân bố',
      icon: FlaskConical,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600',
    },
    chart2: {
      title: 'Loại nhiên liệu',
      icon: BarChart3,
      bgClass: 'bg-violet-50',
      textClass: 'text-violet-600',
      fillColor: '#8B5CF6',
    },
    chart3: {
      title: 'Xu hướng tiêu thụ',
      icon: TrendingUp,
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-600',
    },
  };

  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Quản lý Chất Đốt tất cả khu công nghiệp' : (isManager ? 'Quản lý Chất Đốt của khu công nghiệp' : 'Quản lý Chất Đốt'),
      description: isAdmin ? 'Thống kê và quản lý các loại nhiên liệu đốt toàn thành phố' : (isManager ? 'Thống kê và quản lý các loại nhiên liệu đốt khu công nghiệp' : 'Thống kê và quản lý các loại nhiên liệu đốt'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/resources', title: 'Quản lý tài nguyên' },
      { key: '/resources/combustionResources', title: 'Quản lý Chất Đốt' },
    ]);
  }, [setHeaderConfig, setBreadcrumbItems, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Chất đốt', managerZoneLabel),
      description: `Thống kê và quản lý các loại nhiên liệu đốt của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/resources', title: `Tài nguyên` },
      { key: '/manager/resources/combustionResources', title: `Chất đốt` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const handleAdd = () => navigate('/resources/resource-form');
  const handleSort = (field, order) => setSortConfig({ [field]: order });

  // Handler to open chart detail modal

  const columns = [
    {
      Header: 'Tên Nhiên liệu',
      accessor: 'fuelName',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getNameStyles(val);
        return (
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm',
            styles,
          )} title={val}>
            {val}
          </span>
        );
      },
      sortable: true,
    },
    {
      Header: 'Số lượng',
      accessor: 'qty',
      render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>,
      sortable: true,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span>,
      sortable: true,
    },
    {
      Header: 'Phân loại',
      accessor: 'category',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getCategoryStyles(val);
        return (
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm',
            styles,
          )} title={val}>
            {val || 'Khác'}
          </span>
        );
      },
      sortable: true,
    },
    {
      Header: 'Ngày tạo',
      accessor: 'createdAt',
      render: (val) => <span className="text-slate-400 text-sm tabular-nums">{dayjs(val).format('DD/MM/YYYY HH:mm')}</span>,
      sortable: true,
    },
  ];

  const filterOptions = useMemo(() => {
    return {
      category: Array.from(new Set(rawData.map(i => i.sub_group).filter(Boolean))),
      fuelName: Array.from(new Set(rawData.map(i => i.main_group).filter(Boolean))),
    };
  }, [rawData]);

  const fieldLabels = {
    category: 'Dạng nhiên liệu',
    fuelName: 'Tên cụ thể',
  };

  const tableColumns = useMemo(() => {
    const isAllYear = date?.startsWith('00/');
    if (!isAllYear) return columns;
    const cols = [...columns];
    const dateIdx = cols.findIndex(c => c.accessor === 'createdAt');
    const insertIdx = dateIdx > -1 ? dateIdx : cols.length;
    cols.splice(insertIdx, 0, {
      Header: 'Kỳ báo cáo',
      accessor: 'periodKey',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        /* strVal mapped above */
        if (strVal.length === 6 && !isNaN(strVal)) {
          return <span className="truncate block w-full text-center text-slate-500 font-medium whitespace-nowrap">Tháng {strVal.substring(4, 6)}/{strVal.substring(0, 4)}</span>;
        }
        return <span className="truncate block w-full text-center text-slate-500 font-medium whitespace-nowrap">Tháng {dayjs(pk).format('MM/YYYY')}</span>;
      },
      sortable: true,
    });
    return cols;
  }, [columns, date]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Charts Section */}
      <div className="min-h-[200px] h-[28%] shrink-0">
        <ResourceAnalytics
          chartData={chartData}
          config={resourceAnalyticsConfig}
          exportFileName="ThongKeCompanyCombusion"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Flame className="size-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Chất đốt</h3>
          </div>

          <div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">
            {selectedRows.length > 0 && (
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <Trash className="size-4" />
                Xóa {selectedRows.length} mục
              </button>
            )}
            <ButtonFilter
              fieldLabels={fieldLabels}
              filterOptions={filterOptions}
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              onFilter={setSelectedFilters}
            />
            <RefreshButton loading={isFetching} onClick={() => refetch()} />
            <div className="w-full max-w-xs">
              <SearchBox
                placeholder="Tìm kiếm nhiên liệu..."
                onSearch={setSearchTerm}
              />
            </div>
            {userRole !== 'admin' && userRole !== 'manager' && (
              <AddButton text={'Khai báo mới'} onClick={handleAdd} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <ReuseableTable
              columns={tableColumns}
              data={filteredData}
              loading={isFetching}
              rowsPerPage={10}
              showActions={false}
              showPagination={true}
              sortConfig={sortConfig}
              onSelectionChange={setSelectedRows}
              onSort={handleSort}
            />
          </div>
        </div>
      </div>

      {/* Chart Detail Modal */}
      <ChartDetailModal {...chartModalProps} />
    </div>
  );
};

export default CompanyCombustionResources;
