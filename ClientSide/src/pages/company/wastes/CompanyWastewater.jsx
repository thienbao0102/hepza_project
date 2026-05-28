import ResourceAnalytics from '@components/ui/ResourceAnalytics';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton, RefreshButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import { useNavigate, useLocation } from 'react-router-dom';
import { Droplet, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
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

const CompanyWastewater = () => {
  // Styles for Waste Groups
  const getGroupStyles = (group) => {
    const lower = (group || '').toLowerCase();
    if (lower.includes('sinh hoạt')) return 'bg-green-50 text-green-700 border-green-200';
    if (lower.includes('công nghiệp')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('nguy hại')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };


  const getNameStyles = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('sinh hoạt')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (lower.includes('sản xuất') || lower.includes('công nghiệp')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('hóa chất') || lower.includes('nguy hại')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  };

  const columns = [
    {
      Header: 'Loại nước thải',
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
      Header: 'Lưu lượng',
      accessor: 'quantity',
      render: (val) => <span className="font-mono text-blue-600 font-bold block text-center" title={val?.toLocaleString()}>{val?.toLocaleString()}</span>,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (val) => <span className="text-slate-500 text-sm font-medium block text-center capitalize" title={val}>{val}</span>,
    },
    {
      Header: 'Ngày tạo',
      accessor: 'createdAt',
      render: (val) => <span className="text-slate-400 text-sm font-medium block text-center" title={formatToVietnamTime(val)}>{formatToVietnamTime(val)}</span>,
    },
  ];

  const [selectedRows, setSelectedRows] = useState([]);
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

  // Wastewater Theme Colors: Liquid/Teal
  const COLORS = ['#0891B2', '#22D3EE', '#0E7490', '#67E8F9', '#164E63', '#99F6E4'];

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

  // Chart compare
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
    include: [6], // Use include: [6] for Waste data (Group 6 includes Wastewater WWA)
  };

  const hasRequiredParams = userRole && (isAdmin || isManager || companyId);
  const { data: summaryRecords = [], isFetching, refetch } = useSummaryDetail(summaryParams, {
    enabled: !!hasRequiredParams,
    keepPreviousData: false,
  });

  // Health Check/Auto-refresh logic
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      refetch?.();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  // API likely returns waste in `WasteResource` key based on other patterns. Adding fallback to `waste` just in case.
  const apiData = summaryRecords.WasteResource || summaryRecords.waste || [];

  // Filter relevant wastewater subgroups
  const wastewaterItems = useMemo(() => {
    const wastewaterSubGroups = ['wwa', 'wa', 'nước thải', 'wastewater', 'nước thải công nghiệp', 'nước thải sinh hoạt'];
    return apiData.filter(item => {
      // Note: Data might use `main_group`, `subGroup`, or `sub_group`
      const sg = (item.main_group || item.subGroup || item.sub_group || '').toLowerCase();
      const name = (item.wasteName || item.name || '').toLowerCase();
      return wastewaterSubGroups.includes(sg) || name.includes('nước thải');
    });
  }, [apiData]);

  const normalizeGroupName = (group) => {
    // Only one main group usually: Nước thải công nghiệp
    return group || 'Nước thải công nghiệp';
  };

  // Process data for table
  const rawData = useMemo(() => {
    return wastewaterItems.map(item => ({
      ...item,
      name: item.wasteName || item.name || 'Chưa đặt tên', // Map wasteName to name
      groupName: normalizeGroupName(item.main_group || item.subGroup || item.sub_group),
      treatmentMethods: item.treatmentMethods || item.purpose || '',
      // Ensure ID exists
      _id: item._id || item.id || `temp-${Math.random()}`,
    }));
  }, [wastewaterItems]);

  // Generate filter options dynamically
  const filterOptions = useMemo(() => {
    // Ensure quantities are valid numbers
    const quantities = rawData.map(item => Number(item.quantity) || 0);
    const minQty = quantities.length > 0 ? Math.min(...quantities) : 0;
    const maxQty = quantities.length > 0 ? Math.max(...quantities) : 100;
    // Adjust for visibility if min == max
    const safeMax = maxQty === minQty ? maxQty + 100 : maxQty;

    return {
      quantity_range: [minQty, safeMax],
    };
  }, [rawData]);

  const fieldLabels = {
    quantity_range: 'Lưu lượng',
  };

  // Filter & Sort logic
  const filteredData = useMemo(() => {
    const result = rawData.filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(search);
        const matchesMethod = (item.treatmentMethods || '').toLowerCase().includes(search);
        const matchesNote = (item.note || '').toLowerCase().includes(search);
        if (!matchesName && !matchesMethod && !matchesNote) return false;
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
    const timeMap = new Map();
    const typeMap = new Map();

    rawData.forEach(item => {
      const qty = Number(item.quantity) || item.value || 0;
      const typeValue = item.wasteType || item.name || 'Nước thải';

      typeMap.set(typeValue, (typeMap.get(typeValue) || 0) + qty);

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
        record[typeValue] = (record[typeValue] || 0) + qty;
      }
    });

    const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const byTypeFull = Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const byType = groupTopItems(byTypeFull, 4);

    return {
      byTime,
      byType,
      byTypeFull,
      types: Array.from(typeMap.keys()),
    };
  }, [rawData]);

  // Detailed chart data - Top 10 items by volume
  const detailedChartByVolume = useMemo(() => {
    return chartData.byTypeFull.slice(0, 10);
  }, [chartData]);

  // --- Effects ---
  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    setHeaderConfig({
      title: isAdmin ? 'Dữ liệu chi tiết Nước thải tất cả khu công nghiệp' : (isManager ? 'Dữ liệu chi tiết Nước thải của khu công nghiệp' : 'Dữ liệu chi tiết Nước thải'),
      description: isAdmin ? 'Thông tin chi tiết về các nguồn nước thải toàn thành phố' : (isManager ? 'Thông tin chi tiết về các nguồn nước thải khu công nghiệp' : 'Thông tin chi tiết về các nguồn nước thải phát sinh'),
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/waste', title: 'Quản lý Chất thải' },
      { key: '/waste/wastewater', title: 'Nước thải' },
    ]);
  }, [date, userRole]);

  useEffect(() => {
    if (!isManager) return;

    setHeaderConfig({
      title: buildManagerScopedTitle('Nước thải', managerZoneLabel),
      description: `Thông tin chi tiết về các nguồn nước thải của ${managerZoneLabel}`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/waste', title: `Chất thải | ${managerZoneLabel}` },
      { key: '/manager/waste/wastewater', title: `Nước thải | ${managerZoneLabel}` },
    ]);
  }, [isManager, managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const handleAdd = () => navigate('/resources/resource-form');

  // Custom Tooltip to sort values DESC for easier reading
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Sort payload by value desc
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
          <p className="mb-2 font-semibold text-sm text-slate-700 border-b pb-1 border-slate-100">{label}</p>
          <div className="flex flex-col gap-1.5">
            {sortedPayload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5 min-w-[80px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 truncate max-w-[120px]" title={entry.name}>
                    {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
                  </span>
                </div>
                <span className="font-mono font-medium text-slate-800">
                  {entry.value.toLocaleString()} <span className="text-slate-400 text-[10px] font-normal">m³</span>
                </span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-800">
              <span>Tổng cộng</span>
              <span>{sortedPayload.reduce((a, b) => a + b.value, 0).toLocaleString()} m³</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const resourceAnalyticsConfig = {
    unit: 'm3',
    measure: 'Khối lượng',
    chart1: {
      title: 'Cơ cấu nước thải',
      icon: PieChartIcon,
      bgClass: 'bg-cyan-50',
      textClass: 'text-cyan-600',
    },
    chart2: {
      title: 'Lưu lượng',
      icon: BarChart3,
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-600',
      fillColor: '#8B5CF6',
    },
    chart3: {
      title: 'Xu hướng phát sinh',
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
          exportFileName="ThongKeCompanyWastewater"
          onChartViewClick={handleChartViewClick}
        />
      </div>

      {/* Bottom Section: Table */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
        <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Droplet className="size-5 text-cyan-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Danh sách Nước thải</h3>
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
                placeholder="Tìm kiếm nước thải..."
                onSearch={handleSearch}
              />
            </div>
            {userRole !== 'admin' && userRole !== 'manager' && (
              <AddButton text={'Khai báo mới'} onClick={handleAdd} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="inline-block min-w-full align-middle h-full">
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

export default CompanyWastewater;
