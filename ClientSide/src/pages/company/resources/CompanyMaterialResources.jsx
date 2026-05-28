import ResourceAnalytics from '@components/ui/ResourceAnalytics';
import { useState, useEffect, useMemo, useCallback } from 'react';
import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton, RefreshButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, BarChart3, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
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

const ResourcePageCTPS = () => {
  const getSubGroupStyles = (subGroup) => {
    const lower = (subGroup || '').toLowerCase();
    if (lower.includes('kim loại')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('nhựa')) return 'bg-green-50 text-green-700 border-green-200';
    if (lower.includes('gỗ') || lower.includes('giấy')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const columns = [
    {
      Header: 'Tên',
      accessor: 'name',
      render: (val) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors truncate block max-w-[200px] mx-auto capitalize shadow-sm" title={val}>
          {val}
        </span>
      ),
    },
    {
      Header: 'Số lượng',
      accessor: 'quantity',
      render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium" title={val}>{val}</span>,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium" title={val}>{val}</span>,
    },
    {
      Header: 'Loại',
      accessor: 'sub_group',
      render: (val, row) => {
        const pk = val || row.createdAt;

        const styles = getSubGroupStyles(val);
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

  const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
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
    include: [1], // InputResource
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [], isFetching, refetch } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams });

  // Auto-refresh logic when navigated from dashboard
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      // Clear state to prevent loop
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);
  const rawData = summaryRecords.InputResource || [];

  // Generate filter options dynamically
  const filterOptions = useMemo(() => {
    const dataSafe = Array.isArray(rawData) ? rawData : [];
    const subGroups = [...new Set(dataSafe.map(item => item.sub_group).filter(Boolean))];
    return {
      sub_group: subGroups,
      date_range: [], // Special type handled by ButtonFilter
    };
  }, [rawData]);

  const fieldLabels = {
    sub_group: 'Loại nguyên liệu',
    date_range: 'Ngày tạo',
  };

  // Filter & Sort logic
  const filteredData = useMemo(() => {
    const result = rawData.filter(item => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(search);
        const matchesGroup = (item.sub_group || '').toLowerCase().includes(search);
        if (!matchesName && !matchesGroup) return false;
      }

      // Filter by Sub Group
      if (selectedFilters.sub_group?.length > 0) {
        if (!selectedFilters.sub_group.includes(item.sub_group)) return false;
      }

      // Filter by Date Range
      if (selectedFilters.date_range?.from && selectedFilters.date_range?.to) {
        const itemDate = dayjs(item.createdAt);
        const from = dayjs(selectedFilters.date_range.from).startOf('day');
        const to = dayjs(selectedFilters.date_range.to).endOf('day');
        if (itemDate.isBefore(from) || itemDate.isAfter(to)) return false;
      }

      return true;
    });

    // Apply Sorting
    const sortField = Object.keys(sortConfig)[0];
    const sortOrder = sortConfig[sortField];

    if (sortField && sortOrder !== 0) {
      result.sort((a, b) => {
        let valA = sortField === 'periodKey' ? (a.periodKey || a.createdAt) : a[sortField];
        let valB = sortField === 'periodKey' ? (b.periodKey || b.createdAt) : b[sortField];

        // Special handling for numbers
        if (sortField === 'quantity') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          // Strings
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
    // 1. Distribution by Type (Sub Group)
    const typeMap = new Map();
    // 2. Types with their materials for detail view
    const typeMaterialsMap = new Map(); // type -> { materials: [{name, qty}, ...], total }
    // 3. Trend by Month - grouped by sub_group for stacked bar
    const timeMap = new Map();
    const allTypes = new Set();

    rawData.forEach(item => {
      const qty = Number(item.quantity) || 0;
      // Fix: Use periodKey for monthly trend instead of createdAt to prevent timezone/month overlap
      let key = 'N/A';
      let timestamp = 0;
      if (item.periodKey) {
        const pkString = String(item.periodKey);
        if (pkString.length === 6) {
          const year = pkString.substring(0, 4);
          const month = pkString.substring(4, 6);
          key = `${month}/${year}`;
          timestamp = dayjs(`${year}-${month}-01`).valueOf();
        }
      } else {
        const date = dayjs(item.createdAt);
        key = date.isValid() ? date.format('MM/YYYY') : 'N/A';
        timestamp = date.isValid() ? date.valueOf() : 0;
      }

      const type = item.sub_group || 'Khác';
      const materialName = item.name || 'Không tên';

      // SubGroup for pie chart
      typeMap.set(type, (typeMap.get(type) || 0) + qty);

      // Build type -> materials mapping for Chart 2 detail
      if (!typeMaterialsMap.has(type)) {
        typeMaterialsMap.set(type, new Map());
      }
      const typeMaterialMap = typeMaterialsMap.get(type);
      typeMaterialMap.set(materialName, (typeMaterialMap.get(materialName) || 0) + qty);

      // Time trend - grouped by type for stacked bar
      allTypes.add(type);
      if (key !== 'N/A') {
        if (!timeMap.has(key)) {
          timeMap.set(key, { name: key, timestamp });
        }
        const record = timeMap.get(key);
        record[type] = (record[type] || 0) + qty;
      }
    });

    // Full data for modal
    const byTypeFull = Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Grouped data for small chart (Top 4 + Others)
    const byType = groupTopItems(byTypeFull, 4);

    // Convert typeMaterialsMap to grouped format for modal
    const byTypeGrouped = {};
    typeMaterialsMap.forEach((materialMap, typeKey) => {
      byTypeGrouped[typeKey] = Array.from(materialMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    });

    // Chart 3: Trend by Month - Stacked by Type
    const byTime = Array.from(timeMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    return { byType, byTypeFull, byTypeGrouped, byTime, allTypes: Array.from(allTypes) };
  }, [rawData]);

  // --- Effects ---
  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Quản lý Nguyên vật liệu tất cả khu công nghiệp' : (isManager ? 'Quản lý Nguyên vật liệu của khu công nghiệp' : 'Quản lý Nguyên vật liệu'),
      description: isAdmin ? 'Thống kê và quản lý nguồn nguyên vật liệu đầu vào toàn thành phố' : (isManager ? 'Thống kê và quản lý nguồn nguyên vật liệu đầu vào khu công nghiệp' : 'Thống kê và quản lý nguồn nguyên vật liệu đầu vào'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/resources', title: 'Quản lý tài nguyên & chất thải' },
      { key: '/resources/materialResources', title: 'Quản lý Nguyên vật liệu' },
    ]);
  }, [setHeaderConfig, setBreadcrumbItems, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Nguyên vật liệu', managerZoneLabel),
      description: `Thống kê và quản lý nguồn nguyên vật liệu đầu vào của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/resources', title: `Tài nguyên` },
      { key: '/manager/resources/materialResources', title: `Nguyên vật liệu` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const handleAdd = () => navigate('/resources/resource-form');

  const resourceAnalyticsConfig = {
    unit: 'kg',
    measure: 'Khối lượng',
    chart1: {
      title: 'Phân bố',
      icon: PieChartIcon,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600',
    },
    chart2: {
      title: 'Loại nguyên liệu',
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
          exportFileName="ThongKeMaterialResources"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Container className="size-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Nguyên vật liệu</h3>
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
                placeholder="Tìm kiếm nguyên vật liệu..."
                onSearch={handleSearch}
              />
            </div>
            {userRole !== 'admin' && userRole !== 'manager' && (
              <AddButton text={'Khai báo mới'} onClick={handleAdd} />
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <ReuseableTable
              columns={tableColumns}
              data={filteredData}
              rowsPerPage={10}
              showActions={false}
              showPagination={true}
              sortConfig={sortConfig}
              onDelete={(row) => console.log('Delete', row)}
              onEdit={(row) => console.log('Edit', row)}
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

// Helper for empty charts
export default ResourcePageCTPS;
