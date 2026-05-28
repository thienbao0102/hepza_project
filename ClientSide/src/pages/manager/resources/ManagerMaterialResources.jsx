import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Container, ClipboardPlus, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import dayjs from "dayjs";
import { useSummaryDetail } from "@features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@features/auth/hooks/useAuthQueries";
import { useHeader } from '@/components/common/Header/HeaderContext';
import ButtonFilter from "@components/ui/ButtonFilter";
import clsx from "clsx";
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';

function formatToVietnamTime(isoTimestamp) {
    if (!isoTimestamp) return "";
    return dayjs(new Date(isoTimestamp)).format("DD/MM/YYYY HH:mm");
}

const ManagerMaterialResources = () => {
    const getSubGroupStyles = (subGroup) => {
        const lower = (subGroup || "").toLowerCase();
        if (lower.includes("kim loại")) return "bg-blue-50 text-blue-700 border-blue-200";
        if (lower.includes("nhựa")) return "bg-green-50 text-green-700 border-green-200";
        if (lower.includes("gỗ") || lower.includes("giấy")) return "bg-yellow-50 text-yellow-700 border-yellow-200";
        return "bg-gray-50 text-gray-700 border-gray-200";
    };

    const columns = [
        {
            Header: "Tên", accessor: "name",
            render: (val) => <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 truncate block w-fit mx-auto capitalize shadow-sm" title={val}>{val}</span>,
        },
        {
            Header: "Số lượng", accessor: "quantity",
            render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>,
        },
        {
            Header: "Đơn vị", accessor: "unit",
            render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span>,
        },
        {
            Header: "Loại", accessor: "sub_group",
            render: (val) => {
                const styles = getSubGroupStyles(val);
                return <span className={clsx("truncate block mx-auto px-3 py-1 rounded-full text-xs font-medium w-fit capitalize border shadow-sm", styles)} title={val}>{val || "Khác"}</span>;
            },
        },
        { Header: "KCX/KCN", accessor: "zone_id", render: (val) => <ZoneCell zoneId={val} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (val) => <CompanyCell companyId={val} /> },
        {
            Header: "Ngày tạo", accessor: "createdAt",
            render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium">{formatToVietnamTime(val)}</span>,
        }
    ];

    const [selectedRows, setSelectedRows] = useState([]);
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

    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    const handleSort = (field, order) => setSortConfig({ [field]: order });
    const handleSearch = useCallback((keyword) => setSearchTerm(keyword), []);

    const { periodKeyStart, periodKeyEnd } = useMemo(() => {
        const isAllYear = date?.startsWith("00/");
        if (isAllYear) {
            const year = Number(date.split("/")[1]);
            return { periodKeyStart: year * 100 + 1, periodKeyEnd: year * 100 + 12 };
        }
        const parsed = dayjs(date, "MM/YYYY", true);
        const pk = parsed.isValid() ? Number(parsed.format("YYYYMM")) : Number(dayjs().format("YYYYMM"));
        return { periodKeyStart: 200001, periodKeyEnd: pk };
    }, [date]);

    const summaryParams = {
        role: userRole, periodKeyStart, periodKeyEnd,
        ...(userRole !== 'admin' && { companyId }),
        ...(userRole !== 'admin' && zoneId && { zoneId }),
        include: [1]
    };
    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams, keepPreviousData: false });
    const rawData = useMemo(() => { const d = summaryRecords.InputResource || []; return Array.isArray(d) ? d : []; }, [summaryRecords]);

    const filterOptions = useMemo(() => ({ sub_group: [...new Set(rawData.map(i => i.sub_group).filter(Boolean))], date_range: [] }), [rawData]);
    const fieldLabels = { sub_group: "Loại nguyên liệu", date_range: "Ngày tạo" };

    const filteredData = useMemo(() => {
        let result = rawData.filter(item => {
            if (searchTerm) { const s = searchTerm.toLowerCase(); if (!(item.name || "").toLowerCase().includes(s) && !(item.sub_group || "").toLowerCase().includes(s)) return false; }
            if (selectedFilters.sub_group?.length > 0 && !selectedFilters.sub_group.includes(item.sub_group)) return false;
            if (selectedFilters.date_range?.from && selectedFilters.date_range?.to) { const d = dayjs(item.createdAt); if (d.isBefore(dayjs(selectedFilters.date_range.from).startOf('day')) || d.isAfter(dayjs(selectedFilters.date_range.to).endOf('day'))) return false; }
            return true;
        });
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so !== 0) result.sort((a, b) => { let vA = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || "").toString().toLowerCase(); let vB = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || "").toString().toLowerCase(); return vA < vB ? -1 * so : vA > vB ? 1 * so : 0; });
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    const chartData = useMemo(() => {
        const typeMap = new Map(); const purposeMap = new Map(); const timeMap = new Map();
        rawData.forEach(item => { const qty = Number(item.quantity) || 0; typeMap.set(item.sub_group || "Khác", (typeMap.get(item.sub_group || "Khác") || 0) + qty); purposeMap.set(item.purpose || item.note || item.name || "Chưa xác định", (purposeMap.get(item.purpose || item.note || item.name || "Chưa xác định") || 0) + qty); const d = dayjs(item.createdAt); const k = d.format("MM/YYYY"); if (!timeMap.has(k)) timeMap.set(k, { name: k, value: 0, timestamp: d.valueOf() }); timeMap.get(k).value += qty; });
        const byType = Array.from(typeMap.entries()).map(([n, v]) => ({ name: n, value: v }));
        let byPurposeRaw = Array.from(purposeMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value); const top5 = byPurposeRaw.slice(0, 5); const others = byPurposeRaw.slice(5); if (others.length > 0) top5.push({ name: "Khác", value: others.reduce((a, c) => a + c.value, 0) });
        const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp).map(({ name, value }) => ({ name, value }));
        return { byType, byPurpose: top5, byTime };
    }, [rawData]);

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Nguyên vật liệu", description: "Thống kê và quản lý nguồn nguyên vật liệu đầu vào", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: '/manager/resources', title: "Quản lý tài nguyên & chất thải" }, { key: '/manager/resources/materialResources', title: "Quản lý Nguyên vật liệu" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle("Nguyên vật liệu", managerZoneLabel),
            description: `Theo dõi nguyên vật liệu đầu vào của doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/manager/resources', title: "Tài nguyên" },
            { key: '/manager/resources/materialResources', title: `Nguyên vật liệu | ${managerZoneLabel}` }
        ]);
    }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    const handleAdd = () => navigate("/manager/resources/resource-form");
    const COLORS = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#8B5CF6', '#F43F5E'];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><PieChartIcon className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Phân bố</h3></div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.byType.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byType} cx="40%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">{chartData.byType.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v, n) => [`${v.toLocaleString()} kg`, <span className="capitalize">{n}</span>]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize" title={v}>{v}</span>} wrapperStyle={{ paddingLeft: '10px' }} /></PieChart></ResponsiveContainer>) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-violet-50 rounded-lg"><ClipboardPlus className="size-4 text-violet-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Mục đích sử dụng</h3></div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.byPurpose.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.byPurpose} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 15 ? `${v.substring(0, 15)}...` : v} /><RechartsTooltip cursor={{ fill: 'transparent' }} content={({ active, payload, label }) => active && payload?.length ? <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg text-xs"><p className="font-semibold text-slate-700 mb-1 capitalize">{label}</p><p className="text-emerald-600 font-mono">{payload[0].value.toLocaleString()} kg</p></div> : null} /><Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer>) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-orange-50 rounded-lg"><TrendingUp className="size-4 text-orange-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng Nhập liệu</h3></div>
                        <div className="flex-1 min-h-0 w-full">
                            {chartData.byTime.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} kg`, "Khối lượng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" /></AreaChart></ResponsiveContainer>) : <EmptyState message="Chưa có dữ liệu xu hướng" />}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
                    <div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><Container className="size-5 text-slate-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Nguyên vật liệu</h3></div>
                    <div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">
                        {selectedRows.length > 0 && <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash className="size-4" />Xóa {selectedRows.length} mục</button>}
                        <ButtonFilter onFilter={setSelectedFilters} filterOptions={filterOptions} fieldLabels={fieldLabels} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} />
                        <div className="w-full max-w-xs"><SearchBox placeholder="Tìm kiếm..." onSearch={handleSearch} /></div>
                        {userRole === 'admin' && <AddButton onClick={handleAdd} text={"Khai báo mới"} />}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} rowsPerPage={20} showActions={false} sortConfig={sortConfig} onSort={handleSort} onSelectionChange={setSelectedRows} loading={isFetching} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);

const ZoneCell = ({ zoneId }) => {
    let id = zoneId;
    if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; }
    const { data: zone, isLoading, isError } = useZone(id);
    if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>;
    if (isError || !id) return <span className="text-slate-400 text-xs">—</span>;
    const n = zone?.zone?.zone_name || '—';
    return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={n}>{n}</span>;
};

const CompanyCell = ({ companyId }) => {
    const { data: company, isLoading, isError } = useCompany(companyId);
    if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>;
    if (isError) return <span className="text-slate-400 text-xs">—</span>;
    const n = company?.company?.company_name || '—';
    return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={n}>{n}</span>;
};

export default ManagerMaterialResources;
