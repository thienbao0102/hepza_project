import ResourceAnalytics from '@components/ui/ResourceAnalytics';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton, RefreshButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash, SearchCheck, TrendingUp, PieChart as PieChartIcon, BarChart3, Factory, Home, Biohazard } from 'lucide-react';
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

import { Maximize2 } from 'lucide-react';

function formatToVietnamTime(isoTimestamp) {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

const CompanySolidWastes = () => {
  const getGroupStyles = (group) => {
    const lower = (group || '').toLowerCase();
    if (lower.includes('sinh hoạt') || lower.includes('do')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('công nghiệp') || lower.includes('ind')) return 'bg-green-50 text-green-700 border-green-200';
    if (lower.includes('nguy hại') || lower.includes('ha')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };


  const getNameStyles = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('nhựa') || lower.includes('nilon')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('giấy') || lower.includes('carton')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (lower.includes('kim loại') || lower.includes('sắt')) return 'bg-slate-100 text-slate-700 border-slate-300';
    if (lower.includes('hữu cơ') || lower.includes('sinh hoạt')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (lower.includes('nguy hại') || lower.includes('hóa chất') || lower.includes('dầu')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const baseColumns = [
    {
      Header: 'Tên rác thải',
      accessor: 'name',
      render: (val) => {
        const styles = getNameStyles(val);
        return (
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium border truncate block mx-auto text-center capitalize shadow-sm max-w-[200px]',
            styles
          )} title={val}>
            {val}
          </span>
        );
      },
    },
    {
      Header: 'Khối lượng',
      accessor: 'quantity',
      render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium" title={val?.toLocaleString()}>{val?.toLocaleString()}</span>,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium" title={val}>{val || 'Tấn'}</span>,
    },
    {
      Header: 'Loại rác',
      accessor: 'groupName', // Computed field
      render: (val, row) => {
        const pk = val || row.createdAt;
        const strVal = String(pk);
        const styles = getGroupStyles(val);
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
      Header: 'Ngày tạo',
      accessor: 'createdAt',
      render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium" title={formatToVietnamTime(val)}>{formatToVietnamTime(val)}</span>,
    },
  ];

  const [selectedRows, setSelectedRows] = useState([]);
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

  // Charts Colors
  const COLORS = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#8B5CF6', '#F43F5E'];
  const GROUP_COLORS = {
    'Sinh hoạt': '#3B82F6',    // Blue
    'Công nghiệp': '#10B981',  // Green
    'Nguy hại': '#EF4444',     // Red
    'Khác': '#94A3B8',          // Slate
  };

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

  // Modal state for chart detail
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

  // Solid Waste is usually ID similar to Fuel but let's stick to what worked or verify.
  // In previous task I used include: [6] for waste.
  const summaryParams = {
    role: userRole,
    periodKeyStart,
    periodKeyEnd,
    ...(userRole !== 'admin' && !isManager && { companyId }),
    ...(userRole !== 'admin' && zoneId && { zoneId }),
    include: [6], // Waste
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [], isFetching, refetch } = useSummaryDetail(summaryParams, {
    enabled: !!hasRequiredParams,
    keepPreviousData: false,
  });

  // Auto-refresh logic
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  // API likely returns waste in `WasteResource` key based on other patterns. Adding fallback to `waste` just in case.
  const apiData = summaryRecords.WasteResource || summaryRecords.waste || [];

  // Filter relevant solid waste subgroups
  const solidWasteItems = useMemo(() => {
    const solidSubGroups = ['do', 'ind', 'ha', 'chất thải sinh hoạt', 'chất thải công nghiệp', 'chất thải nguy hại'];
    return apiData.filter(item => {
      // Note: Data might use `main_group`, `subGroup`, or `sub_group`
      const sg = (item.main_group || item.subGroup || item.sub_group || '').toLowerCase();
      return solidSubGroups.includes(sg);
    });
  }, [apiData]);

  const normalizeGroupName = (group) => {
    const g = (group || '').toLowerCase();
    if (g.includes('do') || g.includes('sinh hoạt')) return 'Sinh hoạt';
    if (g.includes('ind') || g.includes('công nghiệp')) return 'Công nghiệp';
    if (g.includes('ha') || g.includes('nguy hại')) return 'Nguy hại';
    return group || 'Khác';
  };

  // Process data for table
  const rawData = useMemo(() => {
    return solidWasteItems.map(item => ({
      ...item,
      name: item.wasteName || item.name || 'Chưa đặt tên', // Map wasteName to name
      groupName: normalizeGroupName(item.main_group || item.subGroup || item.sub_group),
      // Ensure ID exists
      _id: item._id || item.id || `temp-${Math.random()}`,
    }));
  }, [solidWasteItems]);

  // Generate filter options dynamically
  const filterOptions = useMemo(() => {
    const groups = [...new Set(rawData.map(item => item.groupName).filter(Boolean))];
    // Ensure quantities are valid numbers
    const quantities = rawData.map(item => Number(item.quantity) || 0);
    const minQty = quantities.length > 0 ? Math.min(...quantities) : 0;
    const maxQty = quantities.length > 0 ? Math.max(...quantities) : 100;
    // Adjust for visibility if min == max
    const safeMax = maxQty === minQty ? maxQty + 100 : maxQty;

    return {
      groupName: groups,
      quantity_range: [minQty, safeMax],
    };
  }, [rawData]);

  const fieldLabels = {
    groupName: 'Loại rác',
    quantity_range: 'Số lượng',
  };

  // Filter & Sort logic
  const filteredData = useMemo(() => {
    const result = rawData.filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(search);
        const matchesGroup = (item.groupName || '').toLowerCase().includes(search);
        const matchesNote = (item.note || '').toLowerCase().includes(search);
        if (!matchesName && !matchesGroup && !matchesNote) return false;
      }
      if (selectedFilters.groupName?.length > 0) {
        if (!selectedFilters.groupName.includes(item.groupName)) return false;
      }
      if (selectedFilters.quantity_range) {
        const [min, max] = selectedFilters.quantity_range;
        const qty = Number(item.quantity) || 0;
        if (qty < min || qty > max) return false;
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
    const groupMap = new Map();
    const timeMap = new Map();
    const nameMap = new Map();

    // Grouped by GroupName for the toggle feature
    const nameByGroup = new Map();

    rawData.forEach(item => {
      const group = item.groupName || 'Khác';
      const qty = Number(item.quantity) || item.value || 0;
      const name = item.name || 'Khác';

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

      groupMap.set(group, (groupMap.get(group) || 0) + qty);

      // Name breakdown
      nameMap.set(name, (nameMap.get(name) || 0) + qty);

      // Time trend
      if (monthKey !== 'N/A') {
        if (!timeMap.has(monthKey)) {
          timeMap.set(monthKey, { name: monthKey, total: 0, timestamp });
        }
        const record = timeMap.get(monthKey);
        record.total += qty;
        record[name] = (record[name] || 0) + qty;
      }
    });

    const byTypeFull = Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }));
    const byType = groupTopItems(byTypeFull, 4);

    const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Top names for stack chart
    const allNames = new Set();
    rawData.forEach(item => allNames.add(item.name || 'Khác'));

    // Top 10 names by quantity (Full list for modal)
    const byNameFull = Array.from(nameMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const byName = groupTopItems(byNameFull, 4);

    const byNameGrouped = {};
    // Also provide full breakdown for the modal
    rawData.forEach(item => {
      const grp = item.groupName || 'Khác';
      if (!byNameGrouped[grp]) byNameGrouped[grp] = [];
      // This is just a helper if we ever need it, but let's stick to nameByGroup
    });

    return {
      byType,
      byTypeFull,
      byTime,
      byName,
      byNameFull,
      byNameGrouped,
      groups: Array.from(groupMap.keys()),
      names: Array.from(allNames),
    };
  }, [rawData]);

  const detailedChartByVolume = useMemo(() => {
    return chartData.byNameFull.slice(0, 10);
  }, [chartData]);

  const handleAdd = () => navigate('/resources/resources-list');

  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Dữ liệu chi tiết Rác thải tất cả khu công nghiệp' : (isManager ? 'Dữ liệu chi tiết Rác thải của khu công nghiệp' : 'Dữ liệu chi tiết Rác thải'),
      description: isAdmin ? 'Thông tin chi tiết về các loại rác thải toàn thành phố' : (isManager ? 'Thông tin chi tiết về các loại rác thải khu công nghiệp' : 'Thông tin chi tiết về các loại rác thải phát sinh'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/waste', title: 'Quản lý Chất thải' },
      { key: '/waste/solidWaste', title: 'Rác thải' },
    ]);
  }, [date, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Chất thải rắn', managerZoneLabel),
      description: `Thông tin chi tiết về các loại chất thải rắn của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/waste', title: `Chất thải | ${managerZoneLabel}` },
      { key: '/manager/waste/solid-waste', title: `Chất thải rắn | ${managerZoneLabel}` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const resourceAnalyticsConfig = {
    unit: 'kg',
    measure: 'Khối lượng',
    chart1: {
      title: 'Cơ cấu rác thải',
      icon: PieChartIcon,
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-600',
    },
    chart2: {
      title: 'Chi tiết phát thải',
      icon: BarChart3,
      bgClass: 'bg-green-50',
      textClass: 'text-green-600',
      fillColor: '#10B981',
    },
    chart3: {
      title: 'Xu hướng phát sinh',
      icon: TrendingUp,
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-600',
    },
  };

  // Chỉ hiện cột Mã CTNH khi có ít nhất 1 item có mã
  const hasWasteCode = filteredData.some(item => item.codeWaste);

  const tableColumns = useMemo(() => {
    const cols = [...baseColumns];

    // Chèn cột Mã CTNH sau cột Tên nếu có data
    if (hasWasteCode) {
      const nameIdx = cols.findIndex(c => c.accessor === 'name');
      cols.splice(nameIdx + 1, 0, {
        Header: 'Mã CTNH',
        accessor: 'codeWaste',
        render: (val) => <span className="truncate block w-full text-center font-mono text-slate-500 font-medium" title={val || '—'}>{val || '—'}</span>,
      });
    }

    // Chèn cột Kỳ báo cáo khi xem cả năm
    const isAllYear = date?.startsWith('00/');
    if (isAllYear) {
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
    }

    return cols;
  }, [baseColumns, hasWasteCode, date]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Top Section: Analytics */}
      <div className="min-h-[200px] h-[28%] shrink-0">
        <ResourceAnalytics
          chartData={chartData}
          config={resourceAnalyticsConfig}
          exportFileName="ThongKeCompanySolidWastes"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Trash className="size-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Rác thải rắn</h3>
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
                placeholder="Tìm kiếm rác thải..."
                onSearch={handleSearch}
              />
            </div>
            {userRole !== 'admin' && userRole !== 'manager' && (
              <AddButton text={'Khai báo mới'} onClick={handleAdd} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
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

      {/* Chart Detail Modal */}
      <ChartDetailModal {...chartModalProps} />
    </div>
  );
};

export default CompanySolidWastes;
