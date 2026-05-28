/* eslint-disable react/prop-types, react/jsx-sort-props */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, SearchCheck, Trash, TrendingUp, Wind } from 'lucide-react';

import ReuseableTable from '@components/common/ReuseableTable';
import { AddButton } from '@components/ui/Button';
import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import { useCompany } from '@features/company/hooks/useCompanyQueries';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { useSummaryDetail } from '@features/resources/hooks/useSummaryRecords';
import { useIsAuthenticated } from '@features/auth/hooks/useAuthQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';

const COLORS = ['#94A3B8', '#64748B', '#0EA5E9', '#38BDF8', '#A78BFA'];

const ManagerGasWaste = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
  const navigate = useNavigate();
  const { user } = useIsAuthenticated();
  const userRole = user?.user?.role;
  const companyId = user?.user?.company_id;
  const { data: company = [] } = useCompany(companyId);
  const zoneId = company?.company?.zone_id;
  const managerZoneLabel = resolveManagerZoneLabel({
    zoneName: company?.company?.zone_name || user?.user?.zone_name,
    zoneId: zoneId || user?.user?.zone_id,
  });

  const isAllPeriod = typeof date === 'string' && date.startsWith('00/');
  const period = dayjs(date, 'MM/YYYY', true);
  const currentPeriodKey = period.isValid() ? Number(period.format('YYYYMM')) : Number(dayjs().format('YYYYMM'));
  const periodKeyStart = isAllPeriod ? Number(date.split('/')[1]) * 100 + 1 : currentPeriodKey;
  const periodKeyEnd = isAllPeriod ? Number(date.split('/')[1]) * 100 + 12 : currentPeriodKey;

  const params = {
    role: userRole,
    periodKeyStart,
    periodKeyEnd,
    ...(userRole !== 'admin' && { companyId }),
    ...(userRole !== 'admin' && zoneId && { zoneId }),
    include: [6],
  };

  const enabled = Boolean(userRole && (userRole === 'admin' || companyId || zoneId));
  const { data: summaryData = [], isFetching } = useSummaryDetail(params, { enabled });
  const api = useMemo(() => summaryData?.WasteResource || summaryData?.waste || [], [summaryData]);

  const columns = [
    {
      Header: 'Loại khí thải',
      accessor: 'name',
      render: (value) => <span className='block truncate font-medium capitalize text-slate-700'>{value}</span>,
    },
    {
      Header: 'Lưu lượng',
      accessor: 'quantity',
      render: (value) => <span className='block text-center font-mono font-bold text-sky-600'>{value?.toLocaleString()}</span>,
    },
    {
      Header: 'Đơn vị',
      accessor: 'unit',
      render: (value) => <span className='block text-center text-sm capitalize text-slate-500'>{value}</span>,
    },
    { Header: 'KCX/KCN', accessor: 'zone_id', render: (value) => <ZoneCell zoneId={value} /> },
    { Header: 'Doanh nghiệp', accessor: 'company_id', render: (value) => <CompanyCell companyId={value} /> },
    {
      Header: 'Ngày tạo',
      accessor: 'createdAt',
      render: (value) => <span className='block text-center text-sm text-slate-400'>{dayjs(value).format('DD/MM/YYYY HH:mm')}</span>,
    },
  ];

  const items = useMemo(() => {
    const keywords = ['khí thải', 'gas', 'emission', 'khói', 'bụi', 'hơi'];
    return api.filter((item) => {
      const subgroup = (item.main_group || item.sub_group || '').toLowerCase();
      const name = (item.wasteName || item.name || '').toLowerCase();
      return keywords.some((keyword) => subgroup.includes(keyword) || name.includes(keyword));
    });
  }, [api]);

  const rawData = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        name: item.wasteName || item.name || 'N/A',
        unit: 'mg/l',
        _id: item._id || `${item.name || item.wasteName || 'gas'}-${item.createdAt || Math.random()}`,
      })),
    [items],
  );

  const filteredData = useMemo(() => {
    let result = rawData;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((item) => (item.name || '').toLowerCase().includes(search));
    }

    const sortField = Object.keys(sortConfig)[0];
    const sortOrder = sortConfig[sortField];
    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const valueA = sortField === 'quantity' ? Number(a[sortField]) || 0 : (a[sortField] || '').toString().toLowerCase();
        const valueB = sortField === 'quantity' ? Number(b[sortField]) || 0 : (b[sortField] || '').toString().toLowerCase();
        if (valueA < valueB) return -1 * sortOrder;
        if (valueA > valueB) return 1 * sortOrder;
        return 0;
      });
    }

    return result;
  }, [rawData, searchTerm, sortConfig]);

  const chartData = useMemo(() => {
    const timeMap = new Map();
    const nameMap = new Map();

    rawData.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const name = item.name || 'Khác';
      nameMap.set(name, (nameMap.get(name) || 0) + quantity);

      const dateValue = dayjs(item.createdAt);
      const monthKey = dateValue.format('MM/YYYY');
      const timestamp = dateValue.valueOf();

      if (!timeMap.has(monthKey)) {
        timeMap.set(monthKey, { name: monthKey, total: 0, timestamp });
      }

      const current = timeMap.get(monthKey);
      current.total += quantity;
      current[name] = (current[name] || 0) + quantity;
    });

    const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const byName = Array.from(nameMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { byTime, byName, names: byName.map((item) => item.name) };
  }, [rawData]);

  useEffect(() => {
    setHeaderConfig({
      title: buildManagerScopedTitle('Khí thải', managerZoneLabel),
      description: `Theo dõi khí thải của doanh nghiệp thuộc ${managerZoneLabel}.`,
      showWeather: true,
      showDatePicker: true,
    });
    setBreadcrumbItems([
      { key: '/manager/waste', title: 'Chất thải' },
      { key: '/manager/waste/gas-waste', title: `Khí thải | ${managerZoneLabel}` },
    ]);
  }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const sorted = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div className='rounded-xl border border-slate-100 bg-white p-3 shadow-xl ring-1 ring-black/5'>
        <p className='mb-2 border-b border-slate-100 pb-1 text-sm font-semibold text-slate-700'>{label}</p>
        <div className='flex flex-col gap-1.5'>
          {sorted.map((entry, index) => (
            <div key={index} className='flex items-center justify-between gap-4 text-xs'>
              <div className='flex min-w-[80px] items-center gap-1.5'>
                <div className='h-2 w-2 rounded-full' style={{ backgroundColor: entry.color }} />
                <span className='max-w-[120px] truncate text-slate-600'>{entry.name}</span>
              </div>
              <span className='font-mono font-medium text-slate-800'>
                {entry.value.toLocaleString()} <span className='text-[10px] text-slate-400'>mg/l</span>
              </span>
            </div>
          ))}
          <div className='mt-1 flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-semibold text-slate-800'>
            <span>Tổng cộng</span>
            <span>{sorted.reduce((sum, entry) => sum + entry.value, 0).toLocaleString()} mg/l</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='flex h-full flex-col overflow-hidden bg-slate-50/50'>
      <div className='h-[28%] shrink-0'>
        <div className='grid h-full grid-cols-1 gap-4 lg:grid-cols-4'>
          <div className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1'>
            <div className='mb-2 flex items-center gap-2'>
              <div className='rounded-lg bg-sky-50 p-1.5'>
                <PieChartIcon className='size-4 text-sky-600' />
              </div>
              <h3 className='text-sm font-semibold text-slate-800'>Cơ cấu theo loại</h3>
            </div>
            <div className='min-h-0 flex-1'>
              {chartData.byName.length > 0 ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie data={chartData.byName} cx='40%' cy='50%' innerRadius={35} outerRadius={55} paddingAngle={5} dataKey='value'>
                      {chartData.byName.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${Number(value).toLocaleString()} mg/l`]} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Legend
                      layout='vertical'
                      verticalAlign='middle'
                      align='right'
                      iconType='circle'
                      iconSize={6}
                      formatter={(value) => <span className='ml-1 text-[10px] capitalize text-slate-600'>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message='Chưa có dữ liệu' />
              )}
            </div>
          </div>

          <div className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1'>
            <div className='mb-2 flex items-center gap-2'>
              <div className='rounded-lg bg-indigo-50 p-1.5'>
                <BarChart3 className='size-4 text-indigo-600' />
              </div>
              <h3 className='text-sm font-semibold text-slate-800'>Lưu lượng lớn nhất</h3>
            </div>
            <div className='min-h-0 flex-1'>
              {chartData.byName.length > 0 ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartData.byName.slice(0, 10)} layout='vertical' margin={{ left: -10, right: 10 }}>
                    <XAxis type='number' hide />
                    <YAxis dataKey='name' type='category' tick={{ fontSize: 10, fill: '#64748B' }} width={80} axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(value) => [`${Number(value).toLocaleString()} mg/l`]} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey='value' radius={[0, 4, 4, 0]} barSize={12}>
                      {chartData.byName.slice(0, 10).map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message='Chưa có dữ liệu' />
              )}
            </div>
          </div>

          <div className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2'>
            <div className='mb-2 flex items-center gap-2'>
              <div className='rounded-lg bg-blue-50 p-1.5'>
                <TrendingUp className='size-4 text-blue-600' />
              </div>
              <h3 className='text-sm font-semibold text-slate-800'>Xu hướng (mg/l)</h3>
            </div>
            <div className='min-h-0 w-full flex-1'>
              {chartData.byTime.length > 0 ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      {chartData.names.map((name, index) => (
                        <linearGradient key={name} id={`mgw-${index}`} x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                          <stop offset='95%' stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#F1F5F9' />
                    <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <RechartsTooltip content={<CustomAreaTooltip />} />
                    <Legend iconType='circle' iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    {chartData.names.map((name, index) => (
                      <Area
                        key={name}
                        type='monotone'
                        dataKey={name}
                        stackId='1'
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#mgw-${index})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message='Chưa có dữ liệu xu hướng' />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='flex h-full min-h-0 flex-col overflow-hidden'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 pt-5'>
          <div className='flex items-center gap-2'>
            <div className='rounded-lg bg-slate-100 p-2'>
              <Wind className='size-5 text-sky-600' />
            </div>
            <h3 className='font-semibold text-slate-800'>Danh sách khí thải</h3>
          </div>
          <div className='flex max-w-2xl flex-1 items-center justify-end gap-2'>
            {selectedRows.length > 0 && (
              <button className='flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100'>
                <Trash className='size-4' />
                Xóa {selectedRows.length} mục
              </button>
            )}
            <ButtonFilter
              onFilter={setSelectedFilters}
              filterOptions={{ date_range: [] }}
              fieldLabels={{ date_range: 'Ngày tạo' }}
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
            />
            <div className='w-full max-w-xs'>
              <SearchBox placeholder='Tìm kiếm...' onSearch={setSearchTerm} />
            </div>
            {userRole === 'admin' && <AddButton onClick={() => navigate('/manager/resources/resource-form')} text='Khai báo mới' />}
          </div>
        </div>
        <div className='relative flex-1 overflow-hidden'>
          <div className='absolute inset-0 overflow-auto'>
            <ReuseableTable
              columns={columns}
              data={filteredData}
              rowsPerPage={20}
              showActions={false}
              sortConfig={sortConfig}
              onSort={(field, order) => setSortConfig({ [field]: order })}
              onSelectionChange={setSelectedRows}
              loading={isFetching}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => (
  <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400'>
    <SearchCheck className='size-8 opacity-50' />
    <span className='text-sm font-medium'>{message}</span>
  </div>
);

const ZoneCell = ({ zoneId }) => {
  let id = zoneId;
  if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) {
    const match = zoneId.match(/'([^']*)'/);
    id = match?.[1] || null;
  }

  const { data: zone, isLoading, isError } = useZone(id);
  if (isLoading) return <span className='text-xs italic text-slate-400'>...</span>;
  if (isError || !id) return <span className='text-xs text-slate-400'>—</span>;
  return <span className='block max-w-full truncate text-center text-xs font-medium text-slate-600'>{zone?.zone?.zone_name || '—'}</span>;
};

const CompanyCell = ({ companyId }) => {
  const { data: company, isLoading, isError } = useCompany(companyId);
  if (isLoading) return <span className='text-xs italic text-slate-400'>...</span>;
  if (isError) return <span className='text-xs text-slate-400'>—</span>;
  return <span className='block max-w-full truncate text-center text-xs font-medium text-slate-600'>{company?.company?.company_name || '—'}</span>;
};

export default ManagerGasWaste;
