import ResourceAnalytics from '@components/ui/ResourceAnalytics';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import clsx from 'clsx';

import {
  SearchCheck, Trash, FlaskConical,
  BarChart3, TrendingUp, Filter,
  ChevronDown, Droplet, Atom, Maximize2,
} from 'lucide-react';

import ReuseableTable from '@components/common/ReuseableTable';

import { AddButton, DeleteSelectedButton, RefreshButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import ChartDetailModal from '@components/ui/ChartDetailModal';
import { useChartModal } from '@/hooks/useChartModal';

import { useHeader } from '@/components/common/Header/HeaderContext';
import { useSummaryDetail } from '@/features/resources/hooks/useSummaryRecords';
import { useIsAuthenticated } from '@/features/auth/hooks/useAuthQueries';
import { useCompany } from '@/features/company/hooks/useCompanyQueries';
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

const CompanyChemicalResources = () => {
  const { handleChartViewClick, chartModalProps } = useChartModal(COLORS);
  const getCategoryStyles = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('nguy hiểm')) return 'bg-red-50 text-red-700 border-red-200';
    if (lower.includes('axit')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (lower.includes('bazơ') || lower.includes('kiềm')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('muối')) return 'bg-slate-50 text-slate-700 border-slate-200';
    if (lower.includes('dung môi')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (lower.includes('khí') || lower.includes('bay hơi')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (lower.includes('phụ gia')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (lower.includes('khử')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getNameStyles = (name) => {
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useIsAuthenticated();
  const userRole = user?.user?.role;
  const companyId = user?.user?.company_id;
  const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();

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

  // Period identification logic
  const isAllYear = date?.startsWith('00/');
  const selectedYear = isAllYear ? Number(date.split('/')[1]) : (dayjs(date, 'MM/YYYY', true).isValid() ? dayjs(date, 'MM/YYYY').year() : dayjs().year());

  let periodKeyStart, periodKeyEnd;
  if (isAllYear) {
    periodKeyStart = selectedYear * 100 + 1;
    periodKeyEnd = selectedYear * 100 + 12;
  } else {
    const d = dayjs(date, 'MM/YYYY', true).isValid() ? dayjs(date, 'MM/YYYY') : dayjs();
    const p = Number(d.format('YYYYMM'));
    periodKeyStart = p;
    periodKeyEnd = p;
  }

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';

  const { data: company = [] } = useCompany(companyId);
  const zoneId = isManager ? user?.user?.zone_id : company?.company?.zone_id;
  const { data: zoneData } = useZone(zoneId, { enabled: !!zoneId });
  const managerZoneLabel = resolveManagerZoneLabel({
    zoneName: zoneData?.zone?.zone_name || user?.user?.zone_name,
    zoneId,
  });

  const summaryParams = {
    role: userRole,
    periodKeyStart,
    periodKeyEnd,
    ...(userRole !== 'admin' && !isManager && { companyId }),
    ...(userRole !== 'admin' && zoneId && { zoneId }),
    include: [2], // InputResource for Chemicals
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [], isFetching, refetch } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams });

  // Auto-refresh logic
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);
  const apiData = summaryRecords.InputResource || [];

  // Table data (direct from API for Chemicals)
  const rawData = useMemo(() => {
    const dataSafe = Array.isArray(apiData) ? apiData : [];
    return dataSafe.map(item => ({
      ...item,
      // Friendly categories for chemicals
      sub_group: item.sub_group || (item.unit?.toLowerCase().includes('kg') ? 'Rắn' : item.unit?.toLowerCase().includes('l') ? 'Lỏng' : 'Khí'),
    }));
  }, [apiData]);

  // Filter & Sort logic
  const filteredData = useMemo(() => {
    const result = rawData.filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(search);
        const matchesCategory = (item.sub_group || '').toLowerCase().includes(search);
        if (!matchesName && !matchesCategory) return false;
      }
      if (selectedFilters.sub_group?.length > 0) {
        if (!selectedFilters.sub_group.includes(item.sub_group)) return false;
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

  // Generate filter options
  const filterOptions = useMemo(() => {
    const dataSafe = Array.isArray(rawData) ? rawData : [];
    const categories = [...new Set(dataSafe.map(item => item.sub_group).filter(Boolean))];
    return {
      sub_group: categories,
      date_range: [],
    };
  }, [rawData]);

  const fieldLabels = {
    sub_group: 'Phân loại',
    date_range: 'Ngày tạo',
  };

  // Chart Data Processing
  const chartData = useMemo(() => {
    const typeMap = new Map();
    const timeMap = new Map();
    const chemicalUsageMap = new Map();
    const allTypes = new Set();
    // Grouped by type for the detail modal
    const chemicalsByType = new Map();

    rawData.forEach(item => {
      const type = item.sub_group || 'Khác';
      const qty = Number(item.quantity) || 0;
      const name = item.name || 'N/A';

      typeMap.set(type, (typeMap.get(type) || 0) + qty);
      chemicalUsageMap.set(name, (chemicalUsageMap.get(name) || 0) + qty);

      // Build chemicals by type map
      if (!chemicalsByType.has(type)) {
        chemicalsByType.set(type, new Map());
      }
      const typeChemicalMap = chemicalsByType.get(type);
      typeChemicalMap.set(name, (typeChemicalMap.get(name) || 0) + qty);

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

      if (monthKey !== 'N/A') {
        if (!timeMap.has(monthKey)) {
          timeMap.set(monthKey, { name: monthKey, total: 0, timestamp });
        }
        const record = timeMap.get(monthKey);
        record.total += qty;
        record[type] = (record[type] || 0) + qty;
      }
      allTypes.add(type);
    });

    const byTypeFull = Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Grouped data for small chart (Top 4 + Others)
    const byType = groupTopItems(byTypeFull, 4);

    const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const top5Chemicals = Array.from(chemicalUsageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Convert chemicalsByType to a usable format
    const byTypeGrouped = {};
    chemicalsByType.forEach((cMap, typeKey) => {
      byTypeGrouped[typeKey] = Array.from(cMap.entries()).map(([name, value]) => ({ name, value }));
    });

    return {
      byType,
      byTypeFull,
      byTime,
      top5: top5Chemicals,
      allTypes: Array.from(allTypes),
      byTypeGrouped,
    };
  }, [rawData]);

  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Quản lý Hóa chất tất cả khu công nghiệp' : (isManager ? 'Quản lý Hóa chất của khu công nghiệp' : 'Quản lý Hóa chất'),
      description: isAdmin ? 'Thống kê và quản lý hóa chất sử dụng toàn thành phố' : (isManager ? 'Thống kê và quản lý hóa chất sử dụng khu công nghiệp' : 'Thống kê và quản lý hóa chất sử dụng'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/resources', title: 'Quản lý tài nguyên' },
      { key: '/resources/chemicalResources', title: 'Quản lý Hóa chất' },
    ]);
  }, [setHeaderConfig, setBreadcrumbItems, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Hóa chất', managerZoneLabel),
      description: `Thống kê và quản lý hóa chất sử dụng của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/resources', title: `Tài nguyên` },
      { key: '/manager/resources/chemicalResources', title: `Hóa chất` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const handleAdd = () => navigate('/resources/resource-form');

  const columns = [
    {
      Header: 'Tên Hóa chất',
      accessor: 'name',
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getNameStyles(val);
        return (
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium border truncate block mx-auto capitalize shadow-sm max-w-[200px]',
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
      accessor: 'quantity',
      render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>,
      sortable: true,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span>,
    },
    {
      Header: 'Phân loại',
      accessor: 'sub_group',
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

  const handleSort = (field, order) => {
    setSortConfig({ [field]: order });
  };

  const resourceAnalyticsConfig = {
    unit: 'kg',
    measure: 'Lượng dùng',
    chart1: {
      title: 'Phân bố',
      icon: SearchCheck,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600',
    },
    chart2: {
      title: 'Phân loại',
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
      {/* Charts Section */}
      <div className="min-h-[200px] h-[28%] shrink-0">
        <ResourceAnalytics
          chartData={chartData}
          config={resourceAnalyticsConfig}
          exportFileName="ThongKeCompanyChemicalResources"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <FlaskConical className="size-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Hóa chất</h3>
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
                placeholder="Tìm tên hóa chất..."
                onSearch={setSearchTerm}
              />
            </div>
            {userRole !== 'admin' && userRole !== 'manager' && (
              <AddButton text={'Khai báo Hóa chất'} onClick={handleAdd} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative ">
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

export default CompanyChemicalResources;
