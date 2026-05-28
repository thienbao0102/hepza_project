import ResourceAnalytics from '@components/ui/ResourceAnalytics';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton, RefreshButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3, Maximize2 } from 'lucide-react';
import BillImageViewer from '@components/common/BillImageViewer';
import { useCompany } from '@features/company/hooks/useCompanyQueries';
import dayjs from 'dayjs';
import { useSummaryDetail } from '@features/resources/hooks/useSummaryRecords';
import { useIsAuthenticated } from '@features/auth/hooks/useAuthQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ButtonFilter from '@components/ui/ButtonFilter';
import ChartDetailModal from '@components/ui/ChartDetailModal';
import { useChartModal } from '@/hooks/useChartModal';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';
import clsx from 'clsx';

function formatToVietnamTime(isoTimestamp) {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

const CompanyElectricalResources = () => {
  const getSourceStyles = (source) => {
    const lower = (source || '').toLowerCase();
    if (lower.includes('lưới')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (lower.includes('tái tạo')) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getPurposeStyles = (purpose) => {
    const lower = (purpose || '').toLowerCase();
    if (lower.includes('sản xuất') || lower.includes('production')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('sinh hoạt') || lower.includes('domestic')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (lower.includes('khác') || lower.includes('other')) return 'bg-slate-50 text-slate-600 border-slate-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const columns = [
    {
      Header: 'Tên',
      accessor: 'purpose',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getPurposeStyles(val);
        return (
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm',
            styles,
          )} title={val}>
            {val}
          </span>
        );
      },
    },
    {
      Header: 'Số lượng',
      accessor: 'quantity',
      render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium" title={val?.toLocaleString()}>{val?.toLocaleString()}</span>,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium" title={val}>{val}</span>,
    },
    {
      Header: 'Nguồn điện',
      accessor: 'source',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getSourceStyles(val);
        return (
          <span className={clsx(
            'truncate block mx-auto px-3 py-1 rounded-full text-xs font-medium w-fit capitalize border shadow-sm',
            styles,
          )} title={val}>
            {val || 'Khác'}
          </span>
        );
      },
    },
    {
      Header: 'Ngày tạo',
      accessor: 'createdAt',
      render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium" title={formatToVietnamTime(val)}>{formatToVietnamTime(val)}</span>,
    },

  ];

  const { setHeaderConfig, setBreadcrumbItems, date, setDate } = useHeader();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useIsAuthenticated();
  const userRole = user?.user?.role;
  const companyId = user?.user?.company_id;
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';

  const { data: company = [] } = useCompany(companyId);
  const zoneId = isManager ? user?.user?.zone_id : company?.company?.zone_id;
  const { data: zoneData } = useZone(zoneId, { enabled: !!zoneId });
  const managerZoneLabel = resolveManagerZoneLabel({
    zoneName: zoneData?.zone?.zone_name || user?.user?.zone_name,
    zoneId,
  });

  // Time, Filter & Search State
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({});

  useEffect(() => {
    if (date?.startsWith('00/')) {
      setSortConfig({ periodKey: 1 });
    } else {
      setSortConfig({});
    }
  }, [date]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSourceForPurpose, setSelectedSourceForPurpose] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chart Colors
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

  const { handleChartViewClick, chartModalProps } = useChartModal(COLORS);

  const handleSort = (field, order) => {
    setSortConfig({ [field]: order });
  };

  const handleSearch = useCallback((keyword) => {
    setSearchTerm(keyword);
  }, []);

  // Calculate periodKey range based on Header date selection
  const { periodKeyStart, periodKeyEnd } = useMemo(() => {
    const isAllYear = date?.startsWith('00/');
    if (isAllYear) {
      const year = Number(date.split('/')[1]);
      return { periodKeyStart: year * 100 + 1, periodKeyEnd: year * 100 + 12 };
    }
    const parsed = dayjs(date, 'MM/YYYY', true);
    const pk = Number(parsed.format('YYYYMM'));
    return { periodKeyStart: pk, periodKeyEnd: pk };
  }, [date]);

  const summaryParams = {
    role: userRole,
    periodKeyStart,
    periodKeyEnd,
    ...(userRole !== 'admin' && !isManager && { companyId }),
    ...(userRole !== 'admin' && zoneId && { zoneId }),
    include: [3], // FuelResource for Electricity
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [], isFetching, refetch } = useSummaryDetail(summaryParams, {
    enabled: !!hasRequiredParams,
    keepPreviousData: false, // Prevent stale data when switching periods
  });

  // Auto-refresh logic
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);
  const apiData = summaryRecords.FuelResource || [];

  // Flatten data: each API record becomes multiple rows (production, domestic, other)
  const rawData = useMemo(() => {
    const flattened = [];
    apiData.forEach(item => {
      const base = {
        _id: item._id,
        source: item.fuelName,
        unit: item.unit,
        createdAt: item.createdAt,
        periodKey: item.periodKey,
        billImage: item.billImage,
      };
      if (item.detail?.production > 0) {
        flattened.push({ ...base, _id: `${base._id}-prod`, purpose: 'Sản xuất', quantity: item.detail.production });
      }
      if (item.detail?.domestic > 0) {
        flattened.push({ ...base, _id: `${base._id}-dom`, purpose: 'Sinh hoạt', quantity: item.detail.domestic });
      }
      if (item.detail?.other > 0) {
        flattened.push({ ...base, _id: `${base._id}-other`, purpose: 'Khác', quantity: item.detail.other });
      }
      // If no detail breakdown, show total with source as purpose fallback
      if (!item.detail || (item.detail.production === 0 && item.detail.domestic === 0 && item.detail.other === 0)) {
        if (item.quantity > 0) {
          flattened.push({ ...base, _id: `${base._id}-total`, purpose: 'Tổng', quantity: item.quantity });
        }
      }
    });
    return flattened;
  }, [apiData]);

  // Generate filter options dynamically
  const filterOptions = useMemo(() => {
    const dataSafe = Array.isArray(rawData) ? rawData : [];
    const sources = [...new Set(dataSafe.map(item => item.source).filter(Boolean))];
    const purposes = [...new Set(dataSafe.map(item => item.purpose).filter(Boolean))];
    return {
      source: sources,
      purpose: purposes,
      date_range: [],
    };
  }, [rawData]);

  const fieldLabels = {
    source: 'Nguồn điện',
    purpose: 'Mục đích',
    date_range: 'Ngày tạo',
  };

  // Filter & Sort logic
  const filteredData = useMemo(() => {
    const result = rawData.filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesPurpose = (item.purpose || '').toLowerCase().includes(search);
        const matchesSource = (item.source || '').toLowerCase().includes(search);
        if (!matchesPurpose && !matchesSource) return false;
      }
      if (selectedFilters.source?.length > 0) {
        if (!selectedFilters.source.includes(item.source)) return false;
      }
      if (selectedFilters.purpose?.length > 0) {
        if (!selectedFilters.purpose.includes(item.purpose)) return false;
      }
      if (selectedFilters.date_range?.from && selectedFilters.date_range?.to) {
        const itemDate = dayjs(item.createdAt);
        const from = dayjs(selectedFilters.date_range.from).startOf('day');
        const to = dayjs(selectedFilters.date_range.to).endOf('day');
        if (itemDate.isBefore(from) || itemDate.isAfter(to)) return false;
      }
      return true;
    });

    const sortField = Object.keys(sortConfig)[0];
    const sortOrder = sortConfig[sortField];
    if (sortField && sortOrder !== 0) {
      result.sort((a, b) => {
        let valA = sortField === 'periodKey' ? (a.periodKey || a.createdAt) : a[sortField];
        let valB = sortField === 'periodKey' ? (b.periodKey || b.createdAt) : b[sortField];
        if (sortField === 'quantity') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }
        if (valA < valB) return -1 * sortOrder;
        if (valA > valB) return 1 * sortOrder;
        return 0;
      });
    }
    return result;
  }, [rawData, selectedFilters, sortConfig, searchTerm]);

  // --- Data Processing for Charts ---
  const chartData = useMemo(() => {
    const sourceMap = new Map();
    const timeMap = new Map();
    const purposeMap = new Map();
    // Grouped by source for the toggle feature
    const purposeBySource = new Map();
    const allSources = new Set();

    // Use flattened data for purpose/source aggregation
    rawData.forEach(item => {
      const source = item.source || 'Khác';
      const qty = Number(item.quantity) || 0;
      const purpose = item.purpose || 'Khác';

      sourceMap.set(source, (sourceMap.get(source) || 0) + qty);
      purposeMap.set(purpose, (purposeMap.get(purpose) || 0) + qty);

      // Build purpose by source map
      if (!purposeBySource.has(source)) {
        purposeBySource.set(source, new Map());
      }
      const srcPurposeMap = purposeBySource.get(source);
      srcPurposeMap.set(purpose, (srcPurposeMap.get(purpose) || 0) + qty);
    });

    // Use ORIGINAL apiData for time trend - group by source for stacked bar
    apiData.forEach(item => {
      const source = item.fuelName || 'Khác';
      const qty = Number(item.quantity) || 0;
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
        const date = dayjs(item.createdAt);
        monthKey = date.isValid() ? date.format('MM/YYYY') : 'N/A';
        timestamp = date.isValid() ? date.valueOf() : 0;
      }

      allSources.add(source);

      if (monthKey !== 'N/A') {
        if (!timeMap.has(monthKey)) {
          timeMap.set(monthKey, { name: monthKey, timestamp });
        }
        const record = timeMap.get(monthKey);
        record[source] = (record[source] || 0) + qty;
      }
    });

    const byTypeFull = Array.from(sourceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Grouped data for small chart (Top 4 + Others)
    const byType = groupTopItems(byTypeFull, 4);

    const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const byPurpose = Array.from(purposeMap.entries()).map(([name, value]) => ({ name, value }));

    // Convert purposeBySource to a usable format
    const byPurposeGrouped = {};
    purposeBySource.forEach((pMap, srcKey) => {
      byPurposeGrouped[srcKey] = Array.from(pMap.entries()).map(([name, value]) => ({ name, value }));
    });

    return { byType, byTypeFull, byTime, byPurpose, byPurposeGrouped, sources: Array.from(sourceMap.keys()), allSources: Array.from(allSources) };
  }, [rawData, apiData]);

  // Get purpose data based on selected source
  const purposeChartData = useMemo(() => {
    if (selectedSourceForPurpose === 'all') {
      return chartData.byPurpose;
    }
    return chartData.byPurposeGrouped[selectedSourceForPurpose] || [];
  }, [chartData, selectedSourceForPurpose]);

  // --- Effects ---
  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Quản lý Điện năng tất cả khu công nghiệp' : (isManager ? 'Quản lý Điện năng của khu công nghiệp' : 'Quản lý Điện năng'),
      description: isAdmin ? 'Thống kê và quản lý điện năng tiêu thụ toàn thành phố' : (isManager ? 'Thống kê và quản lý điện năng tiêu thụ khu công nghiệp' : 'Thống kê và quản lý điện năng tiêu thụ'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/resources', title: 'Quản lý tài nguyên' },
      { key: '/resources/electricalResources', title: 'Quản lý Điện' },
    ]);
  }, [setHeaderConfig, setBreadcrumbItems, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Điện năng', managerZoneLabel),
      description: `Thống kê và quản lý điện năng tiêu thụ của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/resources', title: `Tài nguyên` },
      { key: '/manager/resources/electricalResources', title: `Điện năng` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const handleAdd = () => navigate('/resources/resource-form');

  const resourceAnalyticsConfig = {
    unit: 'kWh',
    measure: 'Lượng dùng',
    chart1: {
      title: 'Phân bố',
      icon: PieChartIcon,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600',
    },
    chart2: {
      title: 'Nguồn điện',
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
      {/* Top Section: Analytics */}
      <div className="min-h-[200px] h-[28%] shrink-0">
        <ResourceAnalytics
          chartData={chartData}
          config={resourceAnalyticsConfig}
          exportFileName="ThongKeCompanyElectricalResources"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Zap className="size-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Điện</h3>
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
                placeholder="Tìm kiếm nguồn điện..."
                onSearch={handleSearch}
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

export default CompanyElectricalResources;
